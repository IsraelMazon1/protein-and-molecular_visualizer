import { useEffect, useRef, useState } from "react";
import { Dna } from "lucide-react";
import { ChatPanel } from "./components/ChatPanel";
import { ExplanationPanel } from "./components/ExplanationPanel";
import { MoleculeLibrary } from "./components/MoleculeLibrary";
import { PropertyCard } from "./components/PropertyCard";
import { SearchBar } from "./components/SearchBar";
import { StructureViewer } from "./components/StructureViewer";
import { api } from "./lib/api";
import { detectInputType, getInputTypeLabel, type InputType } from "./lib/input";
import type {
  ChatMessage,
  ExplanationPayload,
  MoleculeProperties,
  SavedRecord,
  SmilesGenerationPayload,
  StructurePayload,
  SuggestionResult,
} from "./types";

type AsyncState = {
  structure: boolean;
  explanation: boolean;
  properties: boolean;
  chat: boolean;
  library: boolean;
  saving: boolean;
  suggestions: boolean;
};

const initialAsyncState: AsyncState = {
  structure: false,
  explanation: false,
  properties: false,
  chat: false,
  library: false,
  saving: false,
  suggestions: false,
};

export default function App() {
  const [query, setQuery] = useState("");
  const [suppressedSuggestionQuery, setSuppressedSuggestionQuery] = useState("");
  const [viewerStyle, setViewerStyle] = useState<"cartoon" | "surface" | "stick">("cartoon");
  const [moleculeViewMode, setMoleculeViewMode] = useState<"2d" | "3d">("2d");
  const [structure, setStructure] = useState<StructurePayload | null>(null);
  const [molecule, setMolecule] = useState<SmilesGenerationPayload | null>(null);
  const [explanation, setExplanation] = useState<ExplanationPayload | null>(null);
  const [properties, setProperties] = useState<MoleculeProperties | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [asyncState, setAsyncState] = useState<AsyncState>(initialAsyncState);
  const [error, setError] = useState<string | null>(null);
  const chatMessagesRef = useRef<ChatMessage[]>([]);

  const detectedType: InputType = detectInputType(query);
  const detectedTypeLabel = getInputTypeLabel(detectedType);

  const analysisContext = molecule
    ? {
        name: molecule.name,
        smiles: molecule.smiles,
        metadata: molecule.metadata,
        explanation: explanation?.summary,
      }
    : {
        name: structure?.name,
        pdb_id: structure?.pdb_id,
        source: structure?.source,
        metadata: structure?.metadata,
        explanation: explanation?.summary,
      };

  function setLoading(key: keyof AsyncState, value: boolean) {
    setAsyncState((current) => ({ ...current, [key]: value }));
  }

  function resetAnalysisState() {
    setStructure(null);
    setMolecule(null);
    setExplanation(null);
    setProperties(null);
    setChatMessages([]);
  }

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().toLowerCase() !== suppressedSuggestionQuery) {
      setSuppressedSuggestionQuery("");
    }
  }

  async function fetchLibrary() {
    setLoading("library", true);
    try {
      const payload = await api.fetchLibrary();
      setRecords(payload.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the library.");
    } finally {
      setLoading("library", false);
    }
  }

  async function handleAnalyze(input = query) {
    const normalized = input.trim();
    if (!normalized) return;

    const inputType = detectInputType(normalized);
    const hadChatHistory = chatMessagesRef.current.length > 0;
    setError(null);
    setSuggestionsOpen(false);
    setSuppressedSuggestionQuery(normalized.toLowerCase());
    setLoading("structure", true);
    setLoading("properties", false);
    resetAnalysisState();

    try {
      if (inputType === "SMILES") {
        const payload = await api.generateSmiles(normalized);
        setMolecule(payload);
        setMoleculeViewMode("2d");
        setProperties(payload.properties);
        setExplanation({ summary: payload.summary, overview: payload.summary, sections: payload.sections });
        if (hadChatHistory) {
          setChatMessages([
            {
              role: "assistant",
              content: `Context switched to ${payload.name}. Previous chat history was cleared for this new analysis.`,
            },
          ]);
        }
        return;
      }

      const structurePayload =
        inputType === "PROTEIN_SEQUENCE"
          ? await api.generateSequence(normalized)
          : await api.fetchStructure(normalized);

      setStructure(structurePayload);
      setLoading("structure", false);
      setLoading("explanation", true);
      const explanationPayload = await api.fetchExplanation(
        structurePayload.name,
        structurePayload.pdb_id,
        structurePayload.metadata,
      );
      setExplanation(explanationPayload);
      if (hadChatHistory) {
        setChatMessages([
          {
            role: "assistant",
            content: `Context switched to ${structurePayload.name}. Previous chat history was cleared for this new analysis.`,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze structure.");
    } finally {
      setLoading("structure", false);
      setLoading("explanation", false);
    }
  }

  async function handleChat(message: string) {
    const userMessage = message.trim();
    if (!userMessage) return;

    const currentHistory = chatMessagesRef.current;
    setError(null);
    setLoading("chat", true);
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);
    try {
      const payload = await api.chat(analysisContext, currentHistory, userMessage);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: payload.answer },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to chat right now.");
      setChatMessages((current) => [
        ...current,
        { role: "user", content: userMessage },
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading("chat", false);
    }
  }

  async function handleSave() {
    const entityName = molecule?.name ?? structure?.name;
    if (!entityName || !explanation) return;

    setError(null);
    setLoading("saving", true);
    try {
      await api.save({
        name: entityName,
        type: molecule ? "molecule" : "protein",
        pdb_id: structure?.pdb_id ?? null,
        smiles: molecule?.smiles ?? null,
        properties: properties ?? {},
        gemini_summary: explanation.summary,
        metadata: molecule?.metadata ?? structure?.metadata ?? {},
      });
      if (libraryQuery.trim()) {
        await handleSearch();
      } else {
        await fetchLibrary();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the record.");
    } finally {
      setLoading("saving", false);
    }
  }

  async function handleSearch() {
    setError(null);
    setLoading("library", true);
    try {
      const payload = await api.search(libraryQuery);
      setRecords(payload.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Semantic search failed.");
    } finally {
      setLoading("library", false);
    }
  }

  function handleSuggestionSelect(suggestion: SuggestionResult) {
    const nextQuery = suggestion.gene_name || suggestion.protein_name;
    setQuery(nextQuery);
    void handleAnalyze(nextQuery);
  }

  function handleLibrarySelect(record: SavedRecord) {
    const nextQuery = record.pdb_id || record.smiles || record.name;
    setQuery(nextQuery);
    void handleAnalyze(nextQuery);
  }

  useEffect(() => {
    const normalized = query.trim();
    if (
      detectInputType(normalized) !== "NAME" ||
      normalized.length < 3 ||
      normalized.toLowerCase() === suppressedSuggestionQuery
    ) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setLoading("suggestions", false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading("suggestions", true);
      setSuggestionsOpen(true);
      try {
        const payload = await api.fetchSuggestions(normalized);
        if (active) {
          setSuggestions(payload.results);
        }
      } catch {
        if (active) {
          setSuggestions([]);
        }
      } finally {
        if (active) {
          setLoading("suggestions", false);
        }
      }
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, suppressedSuggestionQuery]);

  useEffect(() => {
    void fetchLibrary();
  }, []);

  return (
    <div className="min-h-screen bg-shell">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-panel border border-primary/20 bg-primary-light text-primary shadow-panel">
              <Dna size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-heading">MolecularAI</span>
                <span className="rounded-control border border-line bg-panel-subtle px-2 py-0.5 text-xs font-medium text-caption">
                  Structural Analysis Workbench
                </span>
              </div>
              <p className="mt-1 text-sm text-body">
                Protein structure interrogation, cheminformatics descriptors, and context-aware analysis in one workspace.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-6 py-6">
        <SearchBar
          value={query}
          loading={asyncState.structure || asyncState.explanation}
          detectedTypeLabel={detectedTypeLabel}
          suggestions={suggestions}
          suggestionsLoading={asyncState.suggestions}
          suggestionsOpen={suggestionsOpen}
          onValueChange={handleQueryChange}
          onSubmit={() => void handleAnalyze()}
          onSuggestionSelect={handleSuggestionSelect}
          onCloseSuggestions={() => setSuggestionsOpen(false)}
        />

        {error ? (
          <div className="rounded-panel border border-danger/35 bg-danger-light px-4 py-3 text-sm text-danger shadow-panel">{error}</div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1.7fr_0.95fr]">
          <StructureViewer
            structure={structure}
            molecule={molecule}
            style={viewerStyle}
            moleculeViewMode={moleculeViewMode}
            onStyleChange={setViewerStyle}
            onMoleculeViewModeChange={setMoleculeViewMode}
          />
          <div className="flex flex-col gap-4">
            <ExplanationPanel
              explanation={explanation}
              loading={asyncState.structure || asyncState.explanation}
              saving={asyncState.saving}
              onSave={handleSave}
            />
            <PropertyCard properties={properties} loading={asyncState.properties || (asyncState.structure && detectedType === "SMILES")} />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
          <ChatPanel messages={chatMessages} loading={asyncState.chat} onSend={handleChat} />
          <MoleculeLibrary
            records={records}
            query={libraryQuery}
            loading={asyncState.library}
            onQueryChange={setLibraryQuery}
            onSearch={handleSearch}
            onSelectRecord={handleLibrarySelect}
          />
        </div>
      </div>
    </div>
  );
}
