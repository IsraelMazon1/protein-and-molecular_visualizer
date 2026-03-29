import { useEffect, useRef } from "react";
import type { SmilesGenerationPayload, StructurePayload } from "../types";

type ViewerStyle = "cartoon" | "surface" | "stick";
type MoleculeViewMode = "2d" | "3d";

type StructureViewerProps = {
  structure: StructurePayload | null;
  molecule: SmilesGenerationPayload | null;
  style: ViewerStyle;
  moleculeViewMode: MoleculeViewMode;
  onStyleChange: (style: ViewerStyle) => void;
  onMoleculeViewModeChange: (mode: MoleculeViewMode) => void;
};

function formatDate(isoString?: string) {
  if (!isoString) return "Unknown";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-line bg-panel-subtle px-3 py-2">
      <div className="text-xs font-medium text-body">{label}</div>
      <div className="mt-1 font-data text-sm text-heading">{value}</div>
    </div>
  );
}

export function StructureViewer({
  structure,
  molecule,
  style,
  moleculeViewMode,
  onStyleChange,
  onMoleculeViewModeChange,
}: StructureViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderStructure() {
      if (!containerRef.current) return;

      const modelData = moleculeViewMode === "3d" && molecule?.pdb_data ? molecule.pdb_data : structure?.pdb_data;
      if (!modelData || (molecule && moleculeViewMode === "2d")) {
        containerRef.current.innerHTML = "";
        return;
      }

      const mod: any = await import("3dmol");
      const $3Dmol = mod.default ?? mod;
      if (cancelled) return;

      containerRef.current.innerHTML = "";
      const viewer = $3Dmol.createViewer(containerRef.current, {
        backgroundColor: "#101922"
      });
      viewer.addModel(modelData, "pdb");
      viewer.setStyle({}, {});

      if (molecule && moleculeViewMode === "3d") {
        if (style === "surface") {
          viewer.setStyle({}, { stick: { colorscheme: "greenCarbon", radius: 0.16 } });
          viewer.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.45, color: "white" });
        } else if (style === "stick") {
          viewer.setStyle({}, { stick: { colorscheme: "greenCarbon", radius: 0.18 } });
        } else {
          viewer.setStyle({}, { sphere: { colorscheme: "Jmol", scale: 0.32 }, stick: { colorscheme: "Jmol", radius: 0.14 } });
        }
      } else if (structure?.source === "esmfold") {
        const colorfunc = (atom: { b?: number }) => {
          const score = atom.b ?? 0;
          if (score >= 90) return "#2563eb";
          if (score >= 70) return "#eab308";
          return "#f97316";
        };

        if (style === "cartoon") {
          viewer.setStyle({}, { cartoon: { colorfunc } });
        }
        if (style === "surface") {
          viewer.setStyle({}, { cartoon: { colorfunc, opacity: 0.8 } });
          viewer.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.65, color: "white" });
        }
        if (style === "stick") {
          viewer.setStyle({}, { stick: { colorfunc, radius: 0.18 } });
        }
      } else {
        if (style === "cartoon") {
          viewer.setStyle({}, { cartoon: { colorscheme: "ssPyMol" } });
        }
        if (style === "surface") {
          viewer.setStyle({}, { cartoon: { colorscheme: "ssPyMol", opacity: 0.8 } });
          viewer.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.7, color: "white" });
        }
        if (style === "stick") {
          viewer.setStyle({}, { stick: { colorscheme: "greenCarbon", radius: 0.18 } });
        }
      }

      viewer.zoomTo();
      viewer.render();
    }

    renderStructure();
    return () => {
      cancelled = true;
    };
  }, [molecule, moleculeViewMode, structure, style]);

  const metadata = structure?.metadata as Record<string, unknown> | undefined;
  const method = (metadata?.experimental_method as Array<{ method?: string }> | undefined)?.[0]?.method;
  const deposited = metadata?.deposition_date as string | undefined;
  const organism = (metadata?.organism as Array<{ ncbi_scientific_name?: string }> | undefined)?.[0]?.ncbi_scientific_name;
  const isPredicted = structure?.source === "esmfold";
  const confidenceNote = (metadata?.confidence_note as string | undefined) ?? "pLDDT confidence scores are colored in the structure.";
  const showMoleculeToggle = molecule != null;
  const viewerTitle = molecule ? molecule.name : structure?.name;

  return (
    <section className="flex flex-col overflow-hidden rounded-panel border border-line-strong bg-panel shadow-viewer">
      <div className="flex flex-col gap-4 border-b border-line bg-panel px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-heading">
              {molecule ? "Molecular Structure Viewer" : "3D Structure Viewer"}
            </span>
            {isPredicted ? (
              <span className="rounded-control border border-primary/20 bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                ESMFold predicted structure
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-body">
            {molecule
              ? "Inspect a generated molecular depiction or an RDKit-derived 3D conformer in the primary analysis surface."
              : "Inspect fold topology, residue packing, and molecular context with a focused dark viewport framed by light analytical controls."}
          </p>
          {viewerTitle ? (
            <div className="mt-3">
              <h2 className="text-xl font-semibold leading-snug text-heading">{viewerTitle}</h2>
              {isPredicted ? <p className="mt-1 text-sm text-body">{confidenceNote}</p> : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-caption">Load a structure to begin interactive inspection.</p>
          )}
        </div>

        {showMoleculeToggle ? (
          <div className="flex items-center gap-px self-start rounded-control border border-line bg-panel shadow-sm">
            {(["2d", "3d"] as MoleculeViewMode[]).map((option) => (
              <button
                key={option}
                onClick={() => onMoleculeViewModeChange(option)}
                disabled={option === "3d" && !molecule?.pdb_data}
                className={`px-4 py-2 text-sm font-medium transition ${
                  moleculeViewMode === option
                    ? "bg-primary text-white"
                    : "bg-panel text-body hover:bg-primary-light hover:text-primary disabled:bg-panel disabled:text-muted-text"
                } ${option === "2d" ? "rounded-l-control" : "rounded-r-control"}`}
              >
                {option === "2d" ? "2D Structure" : "3D Conformer"}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-px self-start rounded-control border border-line bg-panel shadow-sm">
            {(["cartoon", "surface", "stick"] as ViewerStyle[]).map((option) => (
              <button
                key={option}
                onClick={() => onStyleChange(option)}
                className={`px-4 py-2 text-sm font-medium capitalize transition ${
                  style === option
                    ? "bg-primary text-white"
                    : "bg-panel text-body hover:bg-primary-light hover:text-primary"
                } ${option === "cartoon" ? "rounded-l-control" : ""} ${option === "stick" ? "rounded-r-control" : ""}`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-y border-line bg-viewer-panel p-5">
        <div className="overflow-hidden border border-slate-700/90 shadow-inner">
          {molecule && moleculeViewMode === "2d" ? (
            <div
              className="flex h-[560px] items-center justify-center bg-white p-6"
              dangerouslySetInnerHTML={{ __html: molecule.svg }}
            />
          ) : (
            <div ref={containerRef} className="relative h-[560px] bg-viewer-bg" />
          )}
        </div>
      </div>

      <div className="grid gap-2.5 border-t border-line px-5 py-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {molecule ? (
          <>
            <MetaItem label="Source" value="RDKIT" />
            <MetaItem label="Input" value="SMILES" />
            <MetaItem label="View" value={moleculeViewMode.toUpperCase()} />
            <MetaItem label="logP" value={molecule.properties.logp.toString()} />
            <MetaItem label="TPSA" value={molecule.properties.tpsa != null ? `${molecule.properties.tpsa}` : "—"} />
            <MetaItem label="Lipinski" value={molecule.properties.lipinski_pass ? "PASS" : "FAIL"} />
          </>
        ) : (
          <>
            <MetaItem label="Source" value={structure?.source?.toUpperCase() ?? "—"} />
            <MetaItem label="PDB" value={structure?.pdb_id ?? "—"} />
            {method ? <MetaItem label="Method" value={method} /> : null}
            {organism ? <MetaItem label="Organism" value={organism} /> : null}
            {deposited ? <MetaItem label="Deposited" value={formatDate(deposited)} /> : null}
            <MetaItem label="Style" value={style} />
          </>
        )}
      </div>
    </section>
  );
}
