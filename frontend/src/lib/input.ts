export type InputType = "PDB_ID" | "PROTEIN_SEQUENCE" | "SMILES" | "NAME";

const aminoAcidPattern = /^[ACDEFGHIKLMNPQRSTVWY\s]+$/i;
const pdbIdPattern = /^\d[A-Za-z0-9]{3}$/;

export function detectInputType(input: string): InputType {
  const value = input.trim();
  if (!value) {
    return "NAME";
  }

  if (pdbIdPattern.test(value)) {
    return "PDB_ID";
  }

  if (value.length > 10 && aminoAcidPattern.test(value)) {
    return "PROTEIN_SEQUENCE";
  }

  if (looksLikeSmiles(value)) {
    return "SMILES";
  }

  return "NAME";
}

export function getInputTypeLabel(type: InputType) {
  if (type === "PDB_ID") return "Detected: PDB ID";
  if (type === "PROTEIN_SEQUENCE") return "Detected: Amino acid sequence";
  if (type === "SMILES") return "Detected: SMILES string";
  return "Detected: Protein name";
}

function looksLikeSmiles(value: string) {
  const compact = value.replace(/\s+/g, "");
  const hasSmilesCharacters = /[=#()[\]@+\\\/]/.test(compact);
  const hasRingNotation = /[A-Za-z]\d/.test(compact);
  const organicTokens = /^(?:[BCNOPSFIbcnopsfibrclHh0-9@+\-\[\]\(\)=#$\\/%.]+)$/.test(compact);
  return organicTokens && (hasSmilesCharacters || hasRingNotation);
}
