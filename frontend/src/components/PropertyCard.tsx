import type { MoleculeProperties } from "../types";

type PropertyCardProps = {
  properties: MoleculeProperties | null;
  loading: boolean;
};

export function PropertyCard({ properties, loading }: PropertyCardProps) {
  const rows = properties ? [
    ["Molecular Weight", `${properties.molecular_weight} Da`],
    ["logP", properties.logp.toString()],
    ["TPSA", properties.tpsa != null ? `${properties.tpsa} Å²` : "—"],
    ["H-Bond Donors", properties.h_bond_donors.toString()],
    ["H-Bond Acceptors", properties.h_bond_acceptors.toString()],
    ["Rotatable Bonds", properties.rotatable_bonds != null ? properties.rotatable_bonds.toString() : "—"],
  ] : [];

  return (
    <section className="rounded-panel border border-line bg-panel shadow-panel">
      <div className="flex items-center justify-between border-b border-line bg-panel-header px-5 py-3.5">
        <div>
          <span className="text-base font-semibold text-heading">Molecular Descriptors</span>
          <p className="mt-0.5 text-sm text-body">RDKit property summary</p>
        </div>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <p className="text-sm text-caption">Computing descriptors...</p>
        ) : properties ? (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {rows.map(([label, value]) => <Row key={label} label={label} value={value} />)}
              <tr>
                <td className="py-3 pr-4 text-body">Lipinski&apos;s Rule of Five</td>
                <td className="py-1.5 text-right">
                  <span className={`inline-block rounded-control border px-2.5 py-1 text-xs font-semibold ${
                    properties.lipinski_pass
                      ? "border-success/20 bg-success-light text-success"
                      : "border-danger/20 bg-danger-light text-danger"
                  }`}>
                    {properties.lipinski_pass ? "Pass" : "Fail"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-caption">Analyze a SMILES string to compute RDKit descriptors.</p>
        )}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-3 pr-4 text-body">{label}</td>
      <td className="py-3 text-right font-data text-heading">{value}</td>
    </tr>
  );
}
