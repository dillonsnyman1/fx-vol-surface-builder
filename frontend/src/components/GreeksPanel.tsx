import type { FxGreeks } from "../types/vol.ts";

interface Props {
  greeks: FxGreeks;
}

type GreekKey = keyof FxGreeks;

const GREEK_INFO: Record<GreekKey, { label: string; description: string; fmt: (v: number) => string }> = {
  delta: { label: "Delta", description: "Sensitivity to spot rate", fmt: (v) => v.toFixed(4) },
  gamma: { label: "Gamma", description: "Rate of change of delta", fmt: (v) => v.toFixed(6) },
  vega: { label: "Vega", description: "Per 1% vol change", fmt: (v) => v.toFixed(6) },
  theta: { label: "Theta", description: "Per calendar day", fmt: (v) => v.toFixed(6) },
  rho_d: { label: "Rho (domestic)", description: "Per 1% domestic rate", fmt: (v) => v.toFixed(6) },
  rho_f: { label: "Rho (foreign)", description: "Per 1% foreign rate", fmt: (v) => v.toFixed(6) },
};

const KEYS: GreekKey[] = ["delta", "gamma", "vega", "theta", "rho_d", "rho_f"];

export function GreeksPanel({ greeks }: Props) {
  const colors = ["#2563eb", "#7c3aed", "#0891b2", "#b91c1c", "#059669", "#d97706"];

  return (
    <div className="summary-cards">
      {KEYS.map((key, i) => {
        const info = GREEK_INFO[key];
        return (
          <div key={key} className="summary-card" style={{ borderTopColor: colors[i] }}>
            <div className="summary-card-label">{info.label}</div>
            <div className="summary-card-value">{info.fmt(greeks[key])}</div>
            <div className="summary-card-subvalue">{info.description}</div>
          </div>
        );
      })}
    </div>
  );
}
