import type { OptionType } from "../types/vol.ts";

interface Props {
  S: number; K: number; T: number; r_d: number; r_f: number; sigma: number;
  optionType: OptionType; notional: number;
  onChange: (field: string, value: number | string) => void;
  onPrice: () => void;
  loading: boolean;
}

export function PricerForm({ S, K, T, r_d, r_f, sigma, optionType, notional, onChange, onPrice, loading }: Props) {
  return (
    <div className="toolbar">
      <div className="form-row">
        <label className="form-field">
          Spot
          <input type="number" step="0.001" value={S} onChange={(e) => onChange("S", +e.target.value)} />
        </label>
        <label className="form-field">
          Strike
          <input type="number" step="0.001" value={K} onChange={(e) => onChange("K", +e.target.value)} />
        </label>
        <label className="form-field">
          Expiry (yrs)
          <input type="number" step="0.01" value={T} onChange={(e) => onChange("T", +e.target.value)} />
        </label>
        <label className="form-field">
          r domestic
          <input type="number" step="0.0025" value={r_d} onChange={(e) => onChange("r_d", +e.target.value)} />
        </label>
        <label className="form-field">
          r foreign
          <input type="number" step="0.0025" value={r_f} onChange={(e) => onChange("r_f", +e.target.value)} />
        </label>
        <label className="form-field">
          Vol
          <input type="number" step="0.005" value={sigma} onChange={(e) => onChange("sigma", +e.target.value)} />
        </label>
        <label className="form-field">
          Type
          <select value={optionType} onChange={(e) => onChange("optionType", e.target.value)}>
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </label>
        <label className="form-field">
          Notional
          <input type="number" step="100000" value={notional} onChange={(e) => onChange("notional", +e.target.value)} />
        </label>
        <button className="apply-button" onClick={onPrice} disabled={loading}>
          {loading ? "Pricing..." : "Price"}
        </button>
      </div>
    </div>
  );
}
