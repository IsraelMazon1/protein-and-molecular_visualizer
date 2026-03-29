from __future__ import annotations

from rdkit import Chem
from rdkit.Chem import AllChem, Crippen, Descriptors, Lipinski, rdDepictor, rdMolDescriptors
from rdkit.Chem.Draw import rdMolDraw2D

from app.core.exceptions import MolecularAIError
from app.services.gemini_service import explain_molecule


def _build_molecule(smiles: str) -> Chem.Mol:
    if len(smiles) > 5000:
        raise MolecularAIError("SMILES string is too long (max 5000 characters).", status_code=422)

    molecule = Chem.MolFromSmiles(smiles)
    if molecule is None:
        raise MolecularAIError("The provided SMILES string is invalid.", status_code=422)
    return molecule


def compute_extended_properties(smiles: str) -> dict:
    molecule = _build_molecule(smiles)
    molecular_weight = round(Descriptors.MolWt(molecule), 2)
    logp = round(Crippen.MolLogP(molecule), 2)
    tpsa = round(rdMolDescriptors.CalcTPSA(molecule), 2)
    h_donors = Lipinski.NumHDonors(molecule)
    h_acceptors = Lipinski.NumHAcceptors(molecule)
    rotatable_bonds = Lipinski.NumRotatableBonds(molecule)
    lipinski_pass = (
        molecular_weight <= 500
        and logp <= 5
        and h_donors <= 5
        and h_acceptors <= 10
    )

    return {
        "molecular_weight": molecular_weight,
        "logp": logp,
        "tpsa": tpsa,
        "h_bond_donors": h_donors,
        "h_bond_acceptors": h_acceptors,
        "rotatable_bonds": rotatable_bonds,
        "lipinski_pass": lipinski_pass,
    }


def generate_smiles_structure(smiles: str) -> dict:
    molecule = _build_molecule(smiles)

    # 2D depiction
    rdDepictor.Compute2DCoords(molecule)
    drawer = rdMolDraw2D.MolDraw2DSVG(480, 360)
    drawer.drawOptions().clearBackground = False
    drawer.DrawMolecule(molecule)
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText()

    # 3D conformer
    conformer = Chem.AddHs(Chem.Mol(molecule))
    status = AllChem.EmbedMolecule(conformer, AllChem.ETKDGv3())
    pdb_data = None
    if status == 0:
        try:
            if AllChem.MMFFHasAllMoleculeParams(conformer):
                AllChem.MMFFOptimizeMolecule(conformer)
            else:
                AllChem.UFFOptimizeMolecule(conformer)
        except Exception:
            pass
        pdb_data = Chem.MolToPDBBlock(conformer)

    properties = compute_extended_properties(smiles)
    explanation = explain_molecule(smiles, properties)

    return {
        "name": Chem.MolToSmiles(molecule),
        "smiles": smiles,
        "svg": svg,
        "pdb_data": pdb_data,
        "properties": properties,
        "summary": explanation["summary"],
        "sections": explanation["sections"],
        "metadata": {
            "input_type": "smiles",
            "viewer_modes": ["2d", "3d"] if pdb_data else ["2d"],
            "conformer_available": pdb_data is not None,
        },
    }
