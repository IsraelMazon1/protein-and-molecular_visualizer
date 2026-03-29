from __future__ import annotations

from typing import Any

import requests

from app.core.config import get_settings
from app.core.exceptions import MolecularAIError


settings = get_settings()
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


def _require_api_key():
    if not settings.gemini_api_key:
        raise MolecularAIError("Gemini API key is missing. Set GEMINI_API_KEY in .env.", status_code=500)


def _post_model(model: str, action: str, payload: dict[str, Any]) -> dict[str, Any]:
    _require_api_key()
    url = f"{BASE_URL}/{model}:{action}?key={settings.gemini_api_key}"
    response = requests.post(url, json=payload, timeout=90)
    if not response.ok:
        raise MolecularAIError(f"Gemini request failed: {response.text}", status_code=502)
    return response.json()


def _extract_text(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates", [])
    if not candidates:
        raise MolecularAIError("Gemini returned no response candidates.", status_code=502)
    parts = candidates[0].get("content", {}).get("parts", [])
    text = "\n".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise MolecularAIError("Gemini returned an empty response.", status_code=502)
    return text


def build_preview(text: str, limit: int = 350) -> str:
    full_text = text.strip()
    if len(full_text) <= limit:
        return full_text

    truncated = full_text[:limit]
    last_period = truncated.rfind(".")
    if last_period > 100:
        return truncated[: last_period + 1]
    return f"{truncated}..."


def explain_protein(protein_name: str, metadata: dict[str, Any], pdb_id: str | None = None) -> dict[str, Any]:
    methods = metadata.get("experimental_method") or []
    method = (methods[0].get("method") if methods and isinstance(methods[0], dict) else None) or "Unknown"
    prompt = f"""
You are a structural biologist assistant. Analyze the structural and functional significance of the following protein entry. Focus on mechanistic insights rather than encyclopedic description. Do not truncate or summarize briefly. Write full paragraphs for each section.

Protein name: {protein_name}
PDB ID: {pdb_id or "N/A"}
Experimental Method: {method}
Metadata: {metadata}

Respond in exactly this structure:
Function:
[3-4 sentences describing the protein's biological role and primary molecular function]

Disease Relevance:
[2-3 sentences describing associated diseases, mutations, and clinical significance]

Structure:
[2-3 sentences describing the structural features visible in this PDB entry specifically]

Drug Interactions:
[2-3 sentences describing known inhibitors, drug targets, or therapeutic relevance]

Key Binding Sites:
[2-3 sentences describing important residues and binding interfaces]

Write complete sentences. Do not cut off mid-sentence. Do not add any preamble before the Function section.
""".strip()
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4096},
    }
    raw = _post_model(settings.gemini_model, "generateContent", payload)
    candidates = raw.get("candidates", [])
    if not candidates:
        raise MolecularAIError("Gemini returned no response candidates.", status_code=502)
    finish_reason = candidates[0].get("finishReason", "UNKNOWN")
    parts = candidates[0].get("content", {}).get("parts", [])
    full_text = "\n".join(part.get("text", "") for part in parts).strip()
    if not full_text:
        raise MolecularAIError("Gemini returned an empty explanation response.", status_code=502)

    print(f"[DIAG] finish_reason: {finish_reason}")
    print(f"[DIAG] Raw length: {len(full_text)}")
    print(f"[DIAG] Full text:\n{full_text}")
    if not full_text.endswith((".", "!", "?")):
        print(f"[WARN] Response may be truncated. Last 100 chars: {full_text[-100:]}")
    sections = parse_sections(
        full_text,
        ("Function", "Disease Relevance", "Structure", "Drug Interactions", "Key Binding Sites"),
    )
    return {"summary": full_text, "overview": build_preview(full_text), "sections": sections}


def explain_molecule(smiles: str, properties: dict[str, Any]) -> dict[str, Any]:
    prompt = f"""
You are a medicinal chemistry copilot. Analyze this small molecule and return a concise but information-dense summary.

SMILES: {smiles}
Descriptors: {properties}

Respond in exactly four labeled sections:
Likely Drug Class:
Mechanism Hints:
Toxicity Flags:
Development Notes:
""".strip()
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1200},
    }
    raw = _post_model(settings.gemini_model, "generateContent", payload)
    summary = _extract_text(raw)
    sections = parse_sections(
        summary,
        ("Likely Drug Class", "Mechanism Hints", "Toxicity Flags", "Development Notes"),
    )
    return {"summary": summary, "sections": sections}


def parse_sections(summary: str, section_titles: tuple[str, ...]) -> dict[str, str]:
    sections: dict[str, str] = {}
    current_key = "Overview"
    buffer: list[str] = []
    for line in summary.splitlines():
        if ":" in line and line.split(":", 1)[0].strip() in section_titles:
            if buffer:
                sections[current_key] = "\n".join(buffer).strip()
            current_key, remainder = line.split(":", 1)
            buffer = [remainder.strip()] if remainder.strip() else []
        else:
            buffer.append(line)
    if buffer:
        sections[current_key] = "\n".join(buffer).strip()
    return sections


def chat_with_context(protein_context: dict[str, Any], history: list[dict[str, str]], message: str) -> str:
    system_context = f"""
You are MolecularAI, a helpful protein analysis assistant.
Always ground answers in this protein context when relevant:
{protein_context}
Keep answers practical, scientifically cautious, and easy to understand.
""".strip()
    contents = [{"role": "user", "parts": [{"text": system_context}]}]
    for item in history:
        role = "model" if item["role"] == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": item["content"]}]})
    contents.append({"role": "user", "parts": [{"text": message}]})
    payload = {
        "contents": contents,
        "generationConfig": {"temperature": 0.5, "maxOutputTokens": 1000},
    }
    raw = _post_model(settings.gemini_model, "generateContent", payload)
    return _extract_text(raw)


def embed_text(text: str) -> list[float]:
    payload = {"content": {"parts": [{"text": text}]}}
    raw = _post_model(settings.gemini_embedding_model, "embedContent", payload)
    values = raw.get("embedding", {}).get("values", [])
    if not values:
        raise MolecularAIError("Gemini did not return embedding values.", status_code=502)
    return values
