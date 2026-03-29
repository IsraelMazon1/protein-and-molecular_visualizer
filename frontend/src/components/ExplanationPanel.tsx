import { Save } from "lucide-react";
import { MarkdownContent, truncateAtSentence } from "./MarkdownContent";
import type { ExplanationPayload } from "../types";

type ExplanationPanelProps = {
  explanation: ExplanationPayload | null;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
};

export function ExplanationPanel({ explanation, loading, saving, onSave }: ExplanationPanelProps) {
  const overviewText = explanation?.overview || "";
  const detailSections = explanation
    ? Object.entries(explanation.sections).filter(([title]) => title !== "Overview")
    : [];

  return (
    <section className="flex flex-col rounded-panel border border-line bg-panel shadow-panel">
      <div className="flex items-center justify-between border-b border-line bg-panel-header px-5 py-3.5">
        <div>
          <span className="text-base font-semibold text-heading">Structural Interpretation</span>
          <div className="mt-0.5 text-sm text-body">AI analysis</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSave}
            disabled={!explanation?.summary || saving}
            className="inline-flex items-center gap-1 rounded-control border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:border-line disabled:bg-slate-300 disabled:text-slate-500"
          >
            <Save size={12} />
            {saving ? "Saving..." : "Save to Library"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="text-sm text-caption">Generating structural interpretation...</p>
        ) : explanation ? (
          <div className="space-y-4">
            <div className="rounded-control border border-line bg-panel-subtle px-4 py-3">
              <h3 className="mb-1 text-sm font-semibold text-heading">Overview</h3>
              <MarkdownContent
                content={overviewText || "No data available."}
                className="text-sm leading-relaxed text-body [&_li]:ml-4 [&_li]:list-disc [&_li+li]:mt-1 [&_ol]:pl-5 [&_p+li]:mt-2 [&_p]:m-0 [&_strong]:font-semibold [&_ul]:pl-5"
              />
            </div>
            {detailSections.map(([title, content]) => (
              <div key={title} className="rounded-control border border-line bg-panel-subtle px-4 py-3">
                <h3 className="mb-1 text-sm font-semibold text-heading">{title}</h3>
                <MarkdownContent
                  content={content ? truncateAtSentence(content) : "No data available."}
                  className="text-sm leading-relaxed text-body [&_li]:ml-4 [&_li]:list-disc [&_li+li]:mt-1 [&_ol]:pl-5 [&_p+li]:mt-2 [&_p]:m-0 [&_strong]:font-semibold [&_ul]:pl-5"
                />
              </div>
            ))}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-body hover:text-heading">
                Full summary text
              </summary>
              <MarkdownContent
                content={explanation.summary}
                className="mt-2 rounded-control border border-line bg-panel-subtle p-4 text-sm leading-relaxed text-body [&_li]:ml-4 [&_li]:list-disc [&_li+li]:mt-1 [&_ol]:pl-5 [&_p+li]:mt-2 [&_p+p]:mt-3 [&_p]:m-0 [&_strong]:font-semibold [&_ul]:pl-5"
              />
            </details>
          </div>
        ) : (
          <p className="text-sm text-caption">Analyze a structure to generate a Gemini-powered summary.</p>
        )}
      </div>
    </section>
  );
}
