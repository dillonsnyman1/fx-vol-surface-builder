import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchGreeksSensitivity } from "../api/client.ts";
import type { GreekName, OptionType, SensitivityParam, SensitivityPoint } from "../types/vol.ts";
import { SENSITIVITY_LABELS } from "../types/vol.ts";

const GREEK_KEYS: GreekName[] = ["delta", "gamma", "vega", "theta", "rho_d", "rho_f"];
const GREEK_COLORS: Record<GreekName, string> = {
  delta: "#2563eb", gamma: "#7c3aed", vega: "#0891b2",
  theta: "#b91c1c", rho_d: "#059669", rho_f: "#d97706",
};
const GREEK_DISPLAY: Record<GreekName, string> = {
  delta: "Delta", gamma: "Gamma", vega: "Vega",
  theta: "Theta", rho_d: "Rho(d)", rho_f: "Rho(f)",
};

interface Props {
  S: number; K: number; T: number; r_d: number; r_f: number; sigma: number;
  optionType: OptionType;
}

export function GreeksSensitivityChart({ S, K, T, r_d, r_f, sigma, optionType }: Props) {
  const [varyParam, setVaryParam] = useState<SensitivityParam>("spot");
  const [selected, setSelected] = useState<Set<GreekName>>(new Set(["delta", "gamma"]));
  const [data, setData] = useState<SensitivityPoint[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleGreek(g: GreekName) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(g) && next.size > 1) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  useEffect(() => {
    setLoading(true);
    fetchGreeksSensitivity(S, K, T, r_d, r_f, sigma, optionType, varyParam)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [S, K, T, r_d, r_f, sigma, optionType, varyParam]);

  const xFmt = (v: number) => {
    if (varyParam === "vol" || varyParam === "rate_domestic" || varyParam === "rate_foreign")
      return `${(v * 100).toFixed(1)}%`;
    if (varyParam === "time") return v.toFixed(2);
    return v.toFixed(4);
  };

  const params: SensitivityParam[] = ["spot", "vol", "time", "rate_domestic", "rate_foreign"];

  return (
    <div className="chart-card wide">
      <h3>Greeks Sensitivity</h3>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {params.map((p) => (
            <button
              key={p}
              className={`tab-button${varyParam === p ? " active" : ""}`}
              onClick={() => setVaryParam(p)}
              style={{ padding: "5px 12px", fontSize: 12 }}
            >
              {SENSITIVITY_LABELS[p]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {GREEK_KEYS.map((g) => (
            <button
              key={g}
              className={`tab-button${selected.has(g) ? " active" : ""}`}
              onClick={() => toggleGreek(g)}
              style={{
                padding: "5px 12px", fontSize: 12,
                ...(selected.has(g) ? { background: GREEK_COLORS[g], color: "#fff", borderColor: GREEK_COLORS[g] } : {}),
              }}
            >
              {GREEK_DISPLAY[g]}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="status-message">Loading...</div>}

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 8, right: 24, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="param_value" tickFormatter={xFmt} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={(v) => `${SENSITIVITY_LABELS[varyParam]}: ${xFmt(Number(v))}`} />
            <Legend verticalAlign="top" />
            {GREEK_KEYS.filter((g) => selected.has(g)).map((g) => (
              <Line key={g} type="monotone" dataKey={g} stroke={GREEK_COLORS[g]} dot={false} strokeWidth={2} name={GREEK_DISPLAY[g]} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
