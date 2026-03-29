import traceback

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    ExplainRequest,
    ExplainResponse,
    PropertiesRequest,
    SequenceGenerationRequest,
    SaveRequest,
    SaveResponse,
    SearchResponse,
    SmilesGenerationRequest,
    SmilesGenerationResponse,
    SuggestionsResponse,
    StructureRequest,
    StructureResponse,
)
from app.services.gemini_service import chat_with_context, explain_protein
from app.services.generation_service import generate_smiles_structure
from app.services.mongo_service import get_library_documents, save_document, semantic_search
from app.services.properties_service import compute_properties
from app.services.structure_service import fold_sequence, resolve_structure
from app.services.suggestion_service import get_suggestions


router = APIRouter(prefix="/api")


@router.post("/structure", response_model=StructureResponse)
def get_structure(payload: StructureRequest):
    return resolve_structure(payload.query)


@router.get("/search/suggestions", response_model=SuggestionsResponse)
async def search_suggestions(q: str):
    return {"results": await get_suggestions(q)}


@router.post("/generate/sequence", response_model=StructureResponse)
def generate_sequence(payload: SequenceGenerationRequest):
    return fold_sequence(payload.sequence)


@router.post("/generate/smiles", response_model=SmilesGenerationResponse)
def generate_smiles(payload: SmilesGenerationRequest):
    return generate_smiles_structure(payload.smiles)


@router.post("/properties")
def get_properties(payload: PropertiesRequest):
    return compute_properties(payload.smiles)


@router.post("/explain", response_model=ExplainResponse)
def explain(payload: ExplainRequest):
    return explain_protein(payload.protein_name, payload.metadata, payload.pdb_id)


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    try:
        prior_history = []
        for message in payload.history:
            role = "assistant" if message.role == "assistant" else "user"
            prior_history.append({"role": role, "content": message.content})

        answer = chat_with_context(
            protein_context=payload.protein_context or "",
            history=prior_history,
            message=payload.message,
        )
        history = [
            *payload.history,
            {"role": "user", "content": payload.message},
            {"role": "assistant", "content": answer},
        ]
        return {"answer": answer, "history": history}
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/save", response_model=SaveResponse)
def save(payload: SaveRequest):
    document = save_document(payload)
    return {"message": "Saved successfully.", "document": document}


@router.get("/library", response_model=SearchResponse)
def library():
    return {"results": get_library_documents()}


@router.get("/search", response_model=SearchResponse)
def search(q: str = ""):
    if not q.strip():
        return {"results": get_library_documents()}
    return {"results": semantic_search(q)}
