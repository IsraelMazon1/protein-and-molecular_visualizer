import { MarkdownContent, truncateAtSentence } from "./MarkdownContent";
import type { SavedRecord } from "../types";

type MoleculeLibraryProps = {
  records: SavedRecord[];
  query: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelectRecord: (record: SavedRecord) => void;
};

export function MoleculeLibrary({ records, query, loading, onQueryChange, onSearch, onSelectRecord }: MoleculeLibraryProps) {
  return (
    <section className="rounded-panel border border-line bg-panel shadow-panel">
      <div className="flex flex-col gap-3 border-b border-line bg-panel-header px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div>
            <span className="text-base font-semibold text-heading">Molecule Library</span>
            <p className="mt-0.5 text-sm text-body">MongoDB Atlas vector search</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !loading) onSearch(); }}
            placeholder="semantic search..."
            className="w-56 rounded-control border border-line bg-panel px-3 py-2 text-sm text-heading outline-none placeholder:text-muted-text focus:border-primary focus:shadow-focus"
          />
          <button
            onClick={onSearch}
            disabled={loading}
            className="rounded-control border border-line bg-panel-subtle px-3.5 py-2 text-sm font-semibold text-body transition hover:border-primary/35 hover:bg-primary-light/50 hover:text-primary disabled:border-line disabled:bg-slate-100 disabled:text-muted-text"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <p className="text-sm text-caption">Loading library...</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-caption">
            Save analyzed proteins to build a searchable library with semantic embeddings.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {records.map((record) => (
              <button
                key={record.id ?? `${record.name}-${record.created_at}`}
                type="button"
                onClick={() => onSelectRecord(record)}
                title={`Click to load ${record.name}`}
                className="flex w-full gap-4 rounded-control border border-line bg-panel-subtle px-4 py-4 text-left transition-all hover:border-primary/45 hover:shadow-panel"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-heading">{record.name}</h3>
                    <span className="shrink-0 rounded-control border border-primary/20 bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                      {record.type}
                    </span>
                  </div>
                  <MarkdownContent
                    content={record.gemini_summary ? truncateAtSentence(record.gemini_summary) : "No summary."}
                    className="mb-1.5 line-clamp-2 text-xs leading-relaxed text-body [&_p]:m-0 [&_strong]:font-semibold"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-2xs text-caption">
                    {record.pdb_id ? <span>PDB: <span className="font-data text-body">{record.pdb_id}</span></span> : null}
                    {record.score != null ? <span>Score: <span className="font-data text-body">{record.score.toFixed(4)}</span></span> : null}
                    {record.created_at ? <span>{new Date(record.created_at).toLocaleDateString()}</span> : null}
                    <span className="font-medium text-primary">Click to load -&gt;</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
