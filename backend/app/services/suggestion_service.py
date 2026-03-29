from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx
from pymongo.errors import PyMongoError

from app.core.config import get_settings
from app.core.exceptions import MolecularAIError
from app.db.mongo import get_named_collection


settings = get_settings()
INDEX_CREATED = False
UNIPROT_SEARCH_URL = "https://rest.uniprot.org/uniprotkb/search"
RCSB_SEARCH_URL = "https://search.rcsb.org/rcsbsearch/v2/query"


def _get_cache_collection():
    try:
        collection = get_named_collection(settings.mongodb_suggestions_collection)
    except MolecularAIError:
        return None

    global INDEX_CREATED
    if not INDEX_CREATED:
        collection.create_index("created_at", expireAfterSeconds=settings.suggestions_ttl_seconds)
        collection.create_index("query", unique=True)
        INDEX_CREATED = True
    return collection


def _extract_gene_name(result: dict[str, Any], accession: str) -> str:
    try:
        return result["genes"][0]["geneName"]["value"]
    except (KeyError, IndexError, TypeError):
        return accession


def _extract_protein_name(result: dict[str, Any], accession: str) -> str:
    try:
        return result["proteinDescription"]["recommendedName"]["fullName"]["value"]
    except (KeyError, TypeError):
        pass

    try:
        return result["proteinDescription"]["submissionNames"][0]["fullName"]["value"]
    except (KeyError, IndexError, TypeError):
        return accession


def _extract_organism(result: dict[str, Any]) -> str:
    try:
        return result["organism"]["scientificName"]
    except (KeyError, TypeError):
        return "Homo sapiens"


async def _fetch_best_pdb_id(client: httpx.AsyncClient, accession: str) -> str | None:
    payload = {
        "query": {
            "type": "terminal",
            "service": "text",
            "parameters": {
                "attribute": "rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession",
                "operator": "exact_match",
                "value": accession,
            },
        },
        "return_type": "entry",
        "request_options": {
            "results_content_type": ["experimental"],
            "sort": [{"sort_by": "score", "direction": "desc"}],
            "paginate": {"start": 0, "rows": 1},
        },
    }
    response = await client.post(RCSB_SEARCH_URL, json=payload)
    response.raise_for_status()
    result_set = response.json().get("result_set", [])
    if not result_set:
        return None
    return result_set[0].get("identifier")


async def _map_result(client: httpx.AsyncClient, result: dict[str, Any]) -> dict[str, Any]:
    accession = result.get("primaryAccession") or "UNKNOWN"

    try:
        pdb_id = await _fetch_best_pdb_id(client, accession)
    except Exception:
        pdb_id = None

    return {
        "gene_name": _extract_gene_name(result, accession),
        "protein_name": _extract_protein_name(result, accession),
        "uniprot_id": accession,
        "pdb_id": pdb_id,
        "organism": _extract_organism(result),
    }


async def _fetch_suggestion_results(query: str) -> list[dict[str, Any]]:
    params = {
        "query": f"(gene:{query}* OR protein_name:{query}*) AND (organism_id:9606) AND (reviewed:true)",
        "fields": "accession,gene_names,protein_name,organism_name",
        "format": "json",
        "size": 8,
    }
    timeout = httpx.Timeout(10.0, connect=3.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(UNIPROT_SEARCH_URL, params=params)
        if response.status_code >= 400:
            raise MolecularAIError("UniProt suggestion lookup failed for the supplied query.", status_code=502)

        payload = response.json()
        results = payload.get("results", [])
        pdb_client = httpx.AsyncClient(timeout=httpx.Timeout(3.0, connect=3.0))
        try:
            mapped = await asyncio.gather(
                *[_map_result(pdb_client, result) for result in results],
                return_exceptions=True,
            )
        finally:
            await pdb_client.aclose()

    suggestions: list[dict[str, Any]] = []
    for item, original in zip(mapped, results):
        if isinstance(item, Exception):
            accession = original.get("primaryAccession") or "UNKNOWN"
            suggestions.append(
                {
                    "gene_name": _extract_gene_name(original, accession),
                    "protein_name": _extract_protein_name(original, accession),
                    "uniprot_id": accession,
                    "pdb_id": None,
                    "organism": _extract_organism(original),
                }
            )
        else:
            suggestions.append(item)
    return suggestions


async def get_suggestions(query: str) -> list[dict[str, Any]]:
    normalized = query.strip().lower()
    if len(normalized) < 3:
        return []

    collection = _get_cache_collection()
    if collection is not None:
        try:
            cached = collection.find_one({"query": normalized})
        except PyMongoError:
            cached = None
        else:
            if cached:
                return cached.get("results", [])

    results = await _fetch_suggestion_results(normalized)

    if collection is not None:
        try:
            collection.replace_one(
                {"query": normalized},
                {
                    "query": normalized,
                    "results": results,
                    "created_at": datetime.now(timezone.utc),
                },
                upsert=True,
            )
        except PyMongoError:
            pass

    return results
