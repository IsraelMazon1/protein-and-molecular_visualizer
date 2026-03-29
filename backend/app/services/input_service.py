from __future__ import annotations

import re
from typing import Literal


InputType = Literal["PDB_ID", "PROTEIN_SEQUENCE", "SMILES", "NAME"]

AMINO_ACID_PATTERN = re.compile(r"^[ACDEFGHIKLMNPQRSTVWY\s]+$", re.IGNORECASE)
PDB_ID_PATTERN = re.compile(r"^\d[A-Za-z0-9]{3}$")
SMILES_TOKEN_PATTERN = re.compile(r"^(?:[BCNOPSFIbcnopsfibrclHh0-9@+\-\[\]\(\)=#$\\/%.]+)$")


def detect_input_type(value: str) -> InputType:
    query = value.strip()
    if not query:
        return "NAME"

    if PDB_ID_PATTERN.fullmatch(query):
        return "PDB_ID"

    if len(query) > 10 and AMINO_ACID_PATTERN.fullmatch(query):
        return "PROTEIN_SEQUENCE"

    compact = re.sub(r"\s+", "", query)
    has_smiles_characters = re.search(r"[=#()[\]@+\\\/]", compact) is not None
    has_ring_notation = re.search(r"[A-Za-z]\d", compact) is not None
    if SMILES_TOKEN_PATTERN.fullmatch(compact) and (has_smiles_characters or has_ring_notation):
        return "SMILES"

    return "NAME"


def normalize_sequence(sequence: str) -> str:
    return re.sub(r"\s+", "", sequence).upper()
