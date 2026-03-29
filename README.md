# MolecularAI — Structural Analysis Workbench

A full-stack molecule and protein modeling web application built for a hackathon. MolecularAI enables researchers, students, and drug discovery teams to interrogate protein structures, compute molecular descriptors, and conduct AI-powered structural analysis in a single unified workspace.

---

## Features

- **3D Structure Visualization** — Interactive protein rendering via 3Dmol.js with Cartoon, Surface, and Stick display modes
- **Intelligent Protein Lookup** — Resolves gene names, protein names, PDB IDs, and amino acid sequences via UniProt canonical resolution and RCSB cross-reference
- **AI Structural Analysis** — Gemini generates detailed summaries covering function, disease relevance, structure, drug interactions, and key binding sites
- **Research Assistant** — Context-aware multi-turn chat powered by Gemini, with conversation history and active protein context included in each request
- **Molecular Descriptors** — RDKit computes cheminformatics properties from SMILES strings including molecular weight, logP, TPSA, H-bond donors, H-bond acceptors, rotatable bonds, and Lipinski Rule of Five
- **Molecule Library** — Save analyzed proteins and molecules to MongoDB Atlas and retrieve them via semantic vector search powered by Gemini embeddings
- **ESMFold Integration** — Generate predicted 3D structures from raw amino acid sequences
- **Search Suggestions** — Real-time UniProt-backed dropdown with MongoDB-backed caching

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, TypeScript |
| 3D Rendering | 3Dmol.js |
| Backend | Python 3.12, FastAPI |
| AI / LLM | Google Gemini `gemini-2.5-flash`, Gemini `gemini-embedding-001` |
| Cheminformatics | RDKit, BioPython |
| Database | MongoDB Atlas, PyMongo |
| Vector Search | MongoDB Atlas Vector Search |
| Structure APIs | RCSB PDB, UniProt REST, ESMFold |
| Hosting | Vultr |

---

## Project Structure
```text
protein_visualizer/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py                # FastAPI endpoints
│   │   ├── core/
│   │   │   ├── config.py                # Settings and env var loading
│   │   │   └── exceptions.py
│   │   ├── db/
│   │   │   └── mongo.py                 # MongoDB client setup
│   │   ├── models/
│   │   │   └── schemas.py               # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── gemini_service.py        # Gemini chat, summaries, embeddings
│   │   │   ├── generation_service.py    # SMILES generation pipeline
│   │   │   ├── mongo_service.py         # Save, library fetch, vector search
│   │   │   ├── properties_service.py    # RDKit descriptor computation
│   │   │   ├── structure_service.py     # UniProt, RCSB, ESMFold lookup logic
│   │   │   └── suggestion_service.py    # Cached UniProt suggestions
│   │   └── main.py                      # App entry point and startup validation
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ExplanationPanel.tsx
│   │   │   ├── MoleculeLibrary.tsx
│   │   │   ├── PropertyCard.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── StructureViewer.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                   # Frontend API calls
│   │   │   └── input.ts                 # Input classification
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── .env.example                         # Template for local secrets
└── README.md
```

---

## Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- A MongoDB Atlas account
- A Google Gemini API key

---

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/molecularai.git
cd molecularai
```

### 2. Configure environment variables
```bash
cp .env.example .env
```
Open `.env` and fill in your values:
```env
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/molecularai?retryWrites=true&w=majority
```

### 3. Install backend dependencies
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Install frontend dependencies
```bash
cd ../frontend
npm install
```

---

## Running Locally

### Start the backend
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
On startup you should see logs similar to:
```text
[ENV] MONGODB_URI set: True
[ENV] GEMINI_API_KEY set: True
[MONGO] Successfully connected to MongoDB Atlas
```

### Start the frontend
```bash
cd frontend
npm run dev
```
The app will be available at `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/structure` | Fetch or predict a protein structure |
| POST | `/api/explain` | Generate a Gemini structural summary |
| POST | `/api/chat` | Multi-turn research assistant chat |
| POST | `/api/properties` | Compute RDKit descriptors from SMILES |
| POST | `/api/generate/smiles` | Analyze SMILES input and generate molecular output |
| POST | `/api/generate/sequence` | Fold an amino acid sequence with ESMFold |
| POST | `/api/save` | Save a molecule or protein to MongoDB |
| GET | `/api/library` | Retrieve recently saved library entries |
| GET | `/api/search?q=` | Semantic vector search |
| GET | `/api/search/suggestions?q=` | UniProt-backed search suggestions |
| GET | `/api/env/debug` | Verify environment variable loading |

---

## MongoDB Atlas Setup

### 1. Create a free M0 cluster at cloud.mongodb.com

### 2. Create a database user
- Go to **Database Access → Add New Database User**
- Use password authentication
- Use a simple alphanumeric password for local development
- Assign a role with read/write access to your application database

### 3. Whitelist your IP
- Go to **Network Access → Add IP Address**
- Add your current IP
- For development only, you can temporarily use `0.0.0.0/0`

### 4. Create the Vector Search index
- Go to your cluster → **Atlas Search**
- Create a Vector Search index on database `molecularai`, collection `structures`
- Name the index `embedding_vector_index`
- Use this definition:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GEMINI_MODEL` | No | Gemini generation model, defaults to `gemini-2.5-flash` |
| `GEMINI_EMBEDDING_MODEL` | No | Gemini embedding model, defaults to `gemini-embedding-001` |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | No | MongoDB database name, defaults to `molecularai` |
| `MONGODB_COLLECTION` | No | Main saved-record collection, defaults to `structures` |
| `MONGODB_SUGGESTIONS_COLLECTION` | No | Cached suggestion collection, defaults to `search_suggestions` |
| `MONGODB_VECTOR_INDEX` | No | Atlas vector index name, defaults to `embedding_vector_index` |
| `BACKEND_PORT` | No | Backend port, defaults to `8000` |
| `VITE_API_BASE_URL` | No | Frontend API base URL |

Get your Gemini API key at **aistudio.google.com**

---

## How It Works

### Protein Lookup Pipeline
1. Input is classified as a PDB ID, gene name, protein name, amino acid sequence, or SMILES string.
2. Gene and protein names are resolved via UniProt REST API with a human reviewed-entry bias.
3. The resolved UniProt accession is cross-referenced against RCSB to find the best experimental structure.
4. If the input is a raw amino acid sequence, ESMFold is used to generate a predicted structure.
5. The resulting PDB data is returned to the frontend and rendered in 3Dmol.js.

### AI Analysis Pipeline
1. Gemini receives the active protein or molecule context, including metadata and structure identifiers.
2. It returns a structured summary covering function, disease relevance, structure, drug interactions, and key binding sites.
3. The summary is stored in MongoDB alongside a 768-dimensional Gemini embedding when the user saves the record.
4. The Research Assistant chat includes the active analysis context on every request so follow-up questions stay grounded in the current structure.

### Vector Search Pipeline
1. The saved record is transformed into an embedding text payload from its name, identifiers, metadata, properties, and summary.
2. Gemini generates a 768-dimensional embedding using `gemini-embedding-001`.
3. MongoDB Atlas Vector Search runs cosine similarity against saved embeddings.
4. The most semantically relevant records are returned to the library panel.

---

## Usage Examples

**Search by gene name:**  
Type `BRCA1`, `TP53`, `EGFR`, or `KRAS` in the search bar and press Analyze.

**Search by PDB ID:**  
Type a valid 4-character PDB ID such as `1T15` or `2OCJ`.

**Search by amino acid sequence:**  
Paste a raw sequence of standard amino acid characters and MolecularAI will send it to ESMFold.

**Compute molecular descriptors:**  
Type a SMILES string such as `CC(=O)Oc1ccccc1C(=O)O` and press Analyze.

**Ask the Research Assistant:**  
After loading a protein, ask questions such as:
- `What are the druggable binding sites?`
- `Which residues are most conserved?`
- `What mutations are associated with disease?`

---

## Sponsor Integrations

| Sponsor | Integration |
|---|---|
| **Google Gemini** | Structural summaries, research chat, and text embeddings |
| **MongoDB Atlas** | Document storage, cached suggestions, and Vector Search |
| **Vultr** | Intended backend deployment target |

---

## Known Limitations

- ESMFold predictions may take noticeable time for longer sequences
- Free-tier MongoDB Atlas clusters have storage and throughput limits
- Gemini rate limits may affect repeated rapid requests
- Large protein structures can render slowly on lower-end hardware
- Semantic search quality depends on the richness of saved summaries and metadata

---

## License

MIT
