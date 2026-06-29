import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SmileResponse } from "../types/vol.ts";

interface Props {
  data: SmileResponse;
}

export function SmileCrossSection({ data }: Props) {
  const chartData = data.points.map((p) => ({
    strike: p.strike,
    vol: +(p.implied_vol * 100).toFixed(3),
  }));

  return (
    <div className="chart-card">
      <h3>Volatility Smile</h3>
      <p className="chart-subtitle">
        Implied vol vs strike. Vertical lines mark ATM and 25-delta strikes.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="strike" tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toFixed(3)} />
          <YAxis tick={{ fontSize: 12 }} unit="%" domain={["auto", "auto"]} />
          <Tooltip
            labelFormatter={(v) => `K = ${Number(v).toFixed(4)}`}
            formatter={(v) => [Number(v).toFixed(3) + "%", "Vol"]}
          />
          <ReferenceLine x={data.atm_strike} stroke="#059669" strokeDasharray="4 4" label={{ value: "ATM", fontSize: 10 }} />
          <ReferenceLine x={data.put_25d_strike} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "25dP", fontSize: 10 }} />
          <ReferenceLine x={data.call_25d_strike} stroke="#2563eb" strokeDasharray="4 4" label={{ value: "25dC", fontSize: 10 }} />
          <Line type="monotone" dataKey="vol" stroke="#2563eb" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
