from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, Field


class StructureRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Sequence, PDB ID, gene, or protein name")


class StructureResponse(BaseModel):
    name: str
    query: str
    pdb_id: str | None = None
    source: Literal["rcsb", "esmfold"]
    pdb_data: str
    metadata: dict = Field(default_factory=dict)


class StructureSuggestion(BaseModel):
    gene_name: str | None = None
    protein_name: str
    uniprot_id: str
    pdb_id: str | None = None
    organism: str = "Homo sapiens"


class SuggestionsResponse(BaseModel):
    results: list[StructureSuggestion]


class SequenceGenerationRequest(BaseModel):
    sequence: str = Field(..., min_length=1)


class PropertiesRequest(BaseModel):
    smiles: str = Field(..., min_length=1)


class MoleculeProperties(BaseModel):
    molecular_weight: float
    logp: float
    tpsa: float | None = None
    h_bond_donors: int
    h_bond_acceptors: int
    rotatable_bonds: int | None = None
    lipinski_pass: bool


class SmilesGenerationRequest(BaseModel):
    smiles: str = Field(..., min_length=1)


class SmilesGenerationResponse(BaseModel):
    name: str
    smiles: str
    svg: str
    pdb_data: str | None = None
    properties: MoleculeProperties
    summary: str
    sections: dict[str, str]
    metadata: dict = Field(default_factory=dict)


class ExplainRequest(BaseModel):
    protein_name: str
    pdb_id: str | None = None
    metadata: dict = Field(default_factory=dict)


class ExplainResponse(BaseModel):
    summary: str
    overview: str
    sections: dict[str, str]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[ChatMessage] = Field(default_factory=list, validation_alias=AliasChoices("history", "messages"))
    protein_context: str | dict[str, Any] | None = None
    messages: list[ChatMessage] = Field(default_factory=list, exclude=True)

    def model_post_init(self, __context: Any) -> None:
        if not self.messages:
            self.messages = list(self.history)
        if not self.history:
            self.history = list(self.messages)


class ChatResponse(BaseModel):
    answer: str
    history: list[ChatMessage]


class SaveRequest(BaseModel):
    name: str
    type: Literal["protein", "molecule"]
    pdb_id: str | None = None
    smiles: str | None = None
    properties: dict = Field(default_factory=dict)
    gemini_summary: str = ""
    metadata: dict = Field(default_factory=dict)


class SaveResponse(BaseModel):
    message: str
    document: dict


class SearchResponse(BaseModel):
    results: list[dict]


class DocumentModel(BaseModel):
    name: str
    type: Literal["protein", "molecule"]
    pdb_id: str | None = None
    smiles: str | None = None
    properties: dict = Field(default_factory=dict)
    gemini_summary: str = ""
    metadata: dict = Field(default_factory=dict)
    embedding: list[float] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
