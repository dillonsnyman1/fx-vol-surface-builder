import type { TenorQuote } from "../types/vol.ts";

interface Props {
  tenors: TenorQuote[];
  onUpdate: (tenors: TenorQuote[]) => void;
}

export function MarketQuoteTable({ tenors, onUpdate }: Props) {
  function updateField(idx: number, field: keyof TenorQuote, value: number | string | null) {
    onUpdate(tenors.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  }

  function addTenor() {
    const last = tenors[tenors.length - 1];
    onUpdate([...tenors, {
      tenor_label: "New",
      tenor_years: (last?.tenor_years ?? 0.25) + 0.25,
      atm_vol: last?.atm_vol ?? 0.08,
      rr_25: last?.rr_25 ?? -0.005,
      bf_25: last?.bf_25 ?? 0.003,
      rr_10: last?.rr_10 ?? null,
      bf_10: last?.bf_10 ?? null,
    }]);
  }

  function removeTenor(idx: number) {
    if (tenors.length <= 2) return;
    onUpdate(tenors.filter((_, i) => i !== idx));
  }

  const inputStyle = {
    width: 72, padding: "4px 6px", borderRadius: 4,
    border: "1px solid var(--border)", fontFamily: "var(--mono)", fontSize: 12,
  };

  return (
    <div className="chart-card wide">
      <h3>Market Quotes</h3>
      <p className="chart-subtitle">
        Edit ATM, risk reversal and butterfly quotes per tenor. Values are in decimal (e.g. 0.075 = 7.5%).
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Tenor</th>
            <th>T (yrs)</th>
            <th>ATM Vol</th>
            <th>25d RR</th>
            <th>25d BF</th>
            <th>10d RR</th>
            <th>10d BF</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tenors.map((t, i) => (
            <tr key={i}>
              <td>
                <input
                  type="text" value={t.tenor_label}
                  onChange={(e) => updateField(i, "tenor_label", e.target.value)}
                  style={{ ...inputStyle, width: 50 }}
                />
              </td>
              <td>
                <input
                  type="number" step={0.01} value={t.tenor_years}
                  onChange={(e) => updateField(i, "tenor_years", +e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td>
                <input
                  type="number" step={0.001} value={t.atm_vol}
                  onChange={(e) => updateField(i, "atm_vol", +e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td>
                <input
                  type="number" step={0.001} value={t.rr_25}
                  onChange={(e) => updateField(i, "rr_25", +e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td>
                <input
                  type="number" step={0.001} value={t.bf_25}
                  onChange={(e) => updateField(i, "bf_25", +e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td>
                <input
                  type="number" step={0.001} value={t.rr_10 ?? ""}
                  onChange={(e) => updateField(i, "rr_10", e.target.value ? +e.target.value : null)}
                  style={inputStyle} placeholder="-"
                />
              </td>
              <td>
                <input
                  type="number" step={0.001} value={t.bf_10 ?? ""}
                  onChange={(e) => updateField(i, "bf_10", e.target.value ? +e.target.value : null)}
                  style={inputStyle} placeholder="-"
                />
              </td>
              <td>
                {tenors.length > 2 && (
                  <button
                    onClick={() => removeTenor(i)}
                    style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, fontWeight: 700 }}
                  >
                    x
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 10 }}>
        <button
          onClick={addTenor}
          style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card-bg)", fontSize: 13, cursor: "pointer", color: "var(--text-h)" }}
        >
          + Add Tenor
        </button>
      </div>
    </div>
  );
}
