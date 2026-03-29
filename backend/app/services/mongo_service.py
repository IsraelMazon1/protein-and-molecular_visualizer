from typing import Any

from pymongo.errors import PyMongoError

from app.core.config import get_settings
from app.core.exceptions import MolecularAIError
from app.db.mongo import get_collection, serialize_document
from app.models.schemas import DocumentModel, SaveRequest
from app.services.gemini_service import embed_text


settings = get_settings()


def build_embedding_text(payload: SaveRequest) -> str:
    return "\n".join(
        part
        for part in [
            payload.name,
            payload.type,
            payload.pdb_id or "",
            payload.smiles or "",
            payload.gemini_summary,
            str(payload.properties),
            str(payload.metadata),
        ]
        if part
    )


def save_document(payload: SaveRequest) -> dict[str, Any]:
    collection = get_collection()
    print(
        f"[SAVE] Received: name={payload.name}, pdb_id={payload.pdb_id}, summary_length={len(payload.gemini_summary)}"
    )
    document = DocumentModel(
        name=payload.name,
        type=payload.type,
        pdb_id=payload.pdb_id,
        smiles=payload.smiles,
        properties=payload.properties,
        gemini_summary=payload.gemini_summary,
        metadata=payload.metadata,
        embedding=embed_text(build_embedding_text(payload)),
    ).model_dump()
    try:
        result = collection.insert_one(document)
        saved = collection.find_one({"_id": result.inserted_id})
    except PyMongoError as exc:
        raise MolecularAIError(f"MongoDB save failed: {exc}", status_code=502) from exc
    return serialize_document(saved)


def get_library_documents(limit: int = 20) -> list[dict[str, Any]]:
    collection = get_collection()
    try:
        results = list(
            collection.find(
                {},
                {
                    "name": 1,
                    "type": 1,
                    "pdb_id": 1,
                    "smiles": 1,
                    "properties": 1,
                    "gemini_summary": 1,
                    "metadata": 1,
                    "created_at": 1,
                },
            )
            .sort("created_at", -1)
            .limit(limit)
        )
    except PyMongoError as exc:
        print(f"[ERROR] Library fetch failed: {exc}")
        return []
    return [serialize_document(item) for item in results]


def semantic_search(query: str) -> list[dict[str, Any]]:
    collection = get_collection()
    vector = embed_text(query)
    pipeline = [
        {
            "$vectorSearch": {
                "index": settings.mongodb_vector_index,
                "path": "embedding",
                "queryVector": vector,
                "numCandidates": 50,
                "limit": 12,
            }
        },
        {
            "$project": {
                "_id": 1,
                "name": 1,
                "type": 1,
                "pdb_id": 1,
                "smiles": 1,
                "properties": 1,
                "gemini_summary": 1,
                "metadata": 1,
                "created_at": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]
    try:
        results = list(collection.aggregate(pipeline))
    except PyMongoError as exc:
        raise MolecularAIError(f"MongoDB vector search failed: {exc}", status_code=502) from exc
    return [serialize_document(item) for item in results]
