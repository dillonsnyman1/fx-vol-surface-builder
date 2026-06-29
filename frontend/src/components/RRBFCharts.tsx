import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RRBFTermStructureResponse } from "../types/vol.ts";

interface Props {
  data: RRBFTermStructureResponse;
}

export function RiskReversalChart({ data }: Props) {
  const chartData = data.tenor_labels.map((t, i) => ({
    tenor: t,
    "25d RR": +(data.rr_25[i] * 100).toFixed(3),
    ...(data.rr_10[i] != null ? { "10d RR": +(data.rr_10[i]! * 100).toFixed(3) } : {}),
  }));

  return (
    <div className="chart-card">
      <h3>Risk Reversal Term Structure</h3>
      <p className="chart-subtitle">
        Negative RR indicates put skew (downside protection more expensive).
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="tenor" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" />
          <Tooltip />
          <Legend />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
          <Line type="monotone" dataKey="25d RR" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
          {data.rr_10.some((v) => v != null) && (
            <Line type="monotone" dataKey="10d RR" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="6 3" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ButterflyChart({ data }: Props) {
  const chartData = data.tenor_labels.map((t, i) => ({
    tenor: t,
    "25d BF": +(data.bf_25[i] * 100).toFixed(3),
    ...(data.bf_10[i] != null ? { "10d BF": +(data.bf_10[i]! * 100).toFixed(3) } : {}),
  }));

  return (
    <div className="chart-card">
      <h3>Butterfly Term Structure</h3>
      <p className="chart-subtitle">
        Positive BF indicates smile curvature (wings more expensive than ATM).
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="tenor" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="25d BF" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
          {data.bf_10.some((v) => v != null) && (
            <Line type="monotone" dataKey="10d BF" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="6 3" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ATMTermStructureChart({ data }: Props) {
  const chartData = data.tenor_labels.map((t, i) => ({
    tenor: t,
    "ATM Vol": +(data.atm_vols[i] * 100).toFixed(3),
  }));

  return (
    <div className="chart-card">
      <h3>ATM Vol Term Structure</h3>
      <p className="chart-subtitle">
        Delta-neutral straddle volatility across tenors.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="tenor" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" domain={["auto", "auto"]} />
          <Tooltip />
          <Line type="monotone" dataKey="ATM Vol" stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
