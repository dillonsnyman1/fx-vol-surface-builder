import type { OptionType } from "../types/vol.ts";

type SourceField = "S" | "r_d" | "r_f" | "sigma";

interface Props {
  S: number; K: number; T: number; r_d: number; r_f: number; sigma: number;
  optionType: OptionType; notional: number;
  source?: Record<SourceField, number>;
  onChange: (field: string, value: number | string) => void;
  onReset: (field: SourceField) => void;
  onPrice: () => void;
  loading: boolean;
}

const SOURCE_FIELDS: SourceField[] = ["S", "r_d", "r_f", "sigma"];

export function PricerForm({ S, K, T, r_d, r_f, sigma, optionType, notional, source, onChange, onReset, onPrice, loading }: Props) {
  const vals: Record<SourceField, number> = { S, r_d, r_f, sigma };

  function isEdited(field: SourceField) {
    return source != null && vals[field] !== source[field];
  }

  const anyEdited = source != null && SOURCE_FIELDS.some(isEdited);

  function fieldLabel(field: SourceField, display: string) {
    const edited = isEdited(field);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>
        <span>{display}</span>
        {edited && (
          <button
            title={`Reset to ${source![field]}`}
            onClick={() => onReset(field)}
            style={{ background: "none", border: "none", color: "#d97706", cursor: "pointer", fontSize: 12, padding: 0 }}
          >
            ↺
          </button>
        )}
      </div>
    );
  }

  function editedStyle(field: SourceField) {
    return isEdited(field)
      ? { borderColor: "#d97706", background: "#fffbeb" }
      : {};
  }

  return (
    <div className="toolbar">
      <div className="form-row">
        <div className="form-field">
          {fieldLabel("S", "Spot")}
          <input type="number" step={0.001} value={S}
            onChange={(e) => onChange("S", +e.target.value)}
            style={editedStyle("S")}
          />
        </div>
        <label className="form-field">
          Strike
          <input type="number" step={0.001} value={K} onChange={(e) => onChange("K", +e.target.value)} />
        </label>
        <label className="form-field">
          Expiry (yrs)
          <input type="number" step={0.01} value={T} onChange={(e) => onChange("T", +e.target.value)} />
        </label>
        <div className="form-field">
          {fieldLabel("r_d", "r domestic")}
          <input type="number" step={0.0025} value={r_d}
            onChange={(e) => onChange("r_d", +e.target.value)}
            style={{ ...editedStyle("r_d"), width: 80 }}
          />
        </div>
        <div className="form-field">
          {fieldLabel("r_f", "r foreign")}
          <input type="number" step={0.0025} value={r_f}
            onChange={(e) => onChange("r_f", +e.target.value)}
            style={{ ...editedStyle("r_f"), width: 80 }}
          />
        </div>
        <div className="form-field">
          {fieldLabel("sigma", "Vol")}
          <input type="number" step={0.005} value={sigma}
            onChange={(e) => onChange("sigma", +e.target.value)}
            style={editedStyle("sigma")}
          />
        </div>
        <label className="form-field">
          Type
          <select value={optionType} onChange={(e) => onChange("optionType", e.target.value)}>
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </label>
        <label className="form-field">
          Notional
          <input type="number" step={100000} value={notional} onChange={(e) => onChange("notional", +e.target.value)} />
        </label>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 5, justifyContent: "flex-end" }}>
          <button className="apply-button" onClick={onPrice} disabled={loading}>
            {loading ? "Pricing..." : "Price"}
          </button>
          {anyEdited && (
            <button
              onClick={() => SOURCE_FIELDS.forEach(onReset)}
              style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "none", color: "#d97706", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
            >
              ↺ Reset all to source
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
