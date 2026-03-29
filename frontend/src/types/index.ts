export type StructurePayload = {
  name: string;
  query: string;
  pdb_id?: string | null;
  source: "rcsb" | "esmfold";
  pdb_data: string;
  metadata: Record<string, unknown>;
};

export type ExplanationPayload = {
  summary: string;
  overview: string;
  sections: Record<string, string>;
};

export type MoleculeProperties = {
  molecular_weight: number;
  logp: number;
  tpsa?: number | null;
  h_bond_donors: number;
  h_bond_acceptors: number;
  rotatable_bonds?: number | null;
  lipinski_pass: boolean;
};

export type SuggestionResult = {
  gene_name?: string | null;
  protein_name: string;
  uniprot_id: string;
  pdb_id?: string | null;
  organism: string;
};

export type SmilesGenerationPayload = {
  name: string;
  smiles: string;
  svg: string;
  pdb_data?: string | null;
  properties: MoleculeProperties;
  summary: string;
  sections: Record<string, string>;
  metadata: Record<string, unknown>;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SavedRecord = {
  id?: string;
  name: string;
  type: "protein" | "molecule";
  pdb_id?: string | null;
  smiles?: string | null;
  properties: Record<string, unknown>;
  gemini_summary: string;
  metadata: Record<string, unknown>;
  created_at?: string;
  score?: number;
};
