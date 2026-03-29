import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { SuggestionResult } from "../types";

type SearchBarProps = {
  value: string;
  loading: boolean;
  detectedTypeLabel: string;
  suggestions: SuggestionResult[];
  suggestionsLoading: boolean;
  suggestionsOpen: boolean;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestionSelect: (suggestion: SuggestionResult) => void;
  onCloseSuggestions: () => void;
};

export function SearchBar({
  value,
  loading,
  detectedTypeLabel,
  suggestions,
  suggestionsLoading,
  suggestionsOpen,
  onValueChange,
  onSubmit,
  onSuggestionSelect,
  onCloseSuggestions,
}: SearchBarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        onCloseSuggestions();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseSuggestions();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCloseSuggestions]);

  return (
    <section className="rounded-panel border border-line bg-panel shadow-panel">
      <div className="flex flex-col gap-1 border-b border-line bg-panel-header px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-semibold text-heading">Structure Lookup</span>
        </div>
        <p className="max-w-3xl text-sm text-body">
          Resolve proteins from names, genes, PDB identifiers, raw amino acid sequences, or SMILES strings from one query bar.
        </p>
      </div>

      <div className="px-5 py-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div ref={containerRef} className="relative">
            <label className="mb-2 block text-sm font-medium text-heading">Protein name, gene, PDB ID, sequence, or SMILES</label>
            <input
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !loading) onSubmit(); }}
              placeholder="BRCA1, TP53, 1CRN, MEEPQSDPSVEP..., CC(=O)Oc1ccccc1C(=O)O"
              className="w-full rounded-control border border-line bg-panel-subtle px-3.5 py-3 font-data text-sm text-heading outline-none transition placeholder:font-sans placeholder:text-muted-text focus:border-primary focus:shadow-focus"
            />
            <p className="mt-2 text-sm text-body">{detectedTypeLabel}</p>

            {suggestionsOpen ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-control border border-line bg-panel font-sans shadow-panel">
                {suggestionsLoading ? (
                  <div className="flex items-center gap-2 px-3.5 py-3 text-sm text-body">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Searching...</span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="px-3.5 py-3 text-sm text-body">No matches found</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.uniprot_id}-${suggestion.pdb_id ?? "none"}`}
                        type="button"
                        onClick={() => onSuggestionSelect(suggestion)}
                        className="flex w-full flex-col gap-1 border-b border-line bg-panel px-3.5 py-3 text-left last:border-b-0 hover:bg-panel-subtle"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-heading">{suggestion.protein_name}</span>
                          {suggestion.pdb_id ? <span className="font-data text-xs text-caption">{suggestion.pdb_id}</span> : null}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-body">
                          {suggestion.gene_name ? <span>Gene: {suggestion.gene_name}</span> : null}
                          <span>{suggestion.organism}</span>
                          <span className="font-data">UniProt: {suggestion.uniprot_id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={onSubmit}
              disabled={loading}
              className="rounded-control border border-primary bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:border-line-strong disabled:bg-slate-300 disabled:text-slate-500"
            >
              {loading ? "Resolving..." : "Analyze"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
