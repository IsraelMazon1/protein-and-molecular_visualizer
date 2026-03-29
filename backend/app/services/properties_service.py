from app.services.generation_service import compute_extended_properties


def compute_properties(smiles: str) -> dict:
    return compute_extended_properties(smiles)
