import type {
  ChatMessage,
  ExplanationPayload,
  MoleculeProperties,
  SavedRecord,
  SmilesGenerationPayload,
  SuggestionResult,
  StructurePayload
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(payload.detail ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  fetchLibrary: () =>
    request<{ results: SavedRecord[] }>("/api/library"),

  fetchStructure: (query: string) =>
    request<StructurePayload>("/api/structure", {
      method: "POST",
      body: JSON.stringify({ query })
    }),

  fetchSuggestions: async (query: string) => {
    const response = await fetch(`${API_BASE_URL}/api/search/suggestions?q=${encodeURIComponent(query)}`);
    const rawBody = await response.text();
    console.log("[suggestions] status:", response.status, "body:", rawBody);

    if (!response.ok) {
      let detail = "Request failed";
      try {
        detail = JSON.parse(rawBody).detail ?? detail;
      } catch {
        if (rawBody) detail = rawBody;
      }
      throw new Error(detail);
    }

    return JSON.parse(rawBody) as { results: SuggestionResult[] };
  },

  generateSequence: (sequence: string) =>
    request<StructurePayload>("/api/generate/sequence", {
      method: "POST",
      body: JSON.stringify({ sequence })
    }),

  generateSmiles: (smiles: string) =>
    request<SmilesGenerationPayload>("/api/generate/smiles", {
      method: "POST",
      body: JSON.stringify({ smiles })
    }),

  fetchExplanation: (proteinName: string, pdbId: string | null | undefined, metadata: Record<string, unknown>) =>
    request<ExplanationPayload>("/api/explain", {
      method: "POST",
      body: JSON.stringify({ protein_name: proteinName, pdb_id: pdbId, metadata })
    }).then((data) => {
      console.log("[explain] lengths", {
        overview: data.overview?.length ?? 0,
        summary: data.summary?.length ?? 0,
      });
      console.log("[explain] payload", data);
      return data;
    }),

  fetchProperties: (smiles: string) =>
    request<MoleculeProperties>("/api/properties", {
      method: "POST",
      body: JSON.stringify({ smiles })
    }),

  chat: (proteinContext: Record<string, unknown>, messages: ChatMessage[], message: string) =>
    request<{ answer: string; history: ChatMessage[] }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ protein_context: proteinContext, history: messages, message })
    }),

  save: (document: Omit<SavedRecord, "id" | "created_at" | "score">) =>
    request<{ message: string; document: SavedRecord }>("/api/save", {
      method: "POST",
      body: JSON.stringify(document)
    }),

  search: (query: string) =>
    request<{ results: SavedRecord[] }>(`/api/search?q=${encodeURIComponent(query)}`)
};
