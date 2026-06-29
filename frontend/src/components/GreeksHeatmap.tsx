import type { GreeksHeatmapResponse } from "../types/vol.ts";

interface Props {
  data: GreeksHeatmapResponse;
}

function heatColor(val: number, minVal: number, maxVal: number): string {
  if (maxVal <= minVal) return "#e2e8f0";
  const t = (val - minVal) / (maxVal - minVal);
  if (val >= 0) {
    const r = Math.round(37 + t * 180);
    const g = Math.round(99 - t * 50);
    const b = Math.round(235 - t * 150);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const s = -t;
  return `rgb(${Math.round(220 + s * 35)}, ${Math.round(80 - s * 40)}, ${Math.round(80 - s * 40)})`;
}

export function GreeksHeatmap({ data }: Props) {
  const allVals = data.values.flat();
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);

  const nSpots = data.spots.length;
  const nVols = data.vols.length;
  const cellW = Math.max(14, Math.min(28, 600 / nSpots));
  const cellH = Math.max(14, Math.min(28, 400 / nVols));
  const labelW = 60;
  const labelH = 40;
  const w = labelW + nSpots * cellW;
  const h = labelH + nVols * cellH;

  const spotStep = Math.max(1, Math.floor(nSpots / 6));
  const volStep = Math.max(1, Math.floor(nVols / 6));

  return (
    <div className="chart-card wide">
      <h3>{data.greek.charAt(0).toUpperCase() + data.greek.slice(1)} Heatmap</h3>
      <p className="chart-subtitle">
        {data.greek} values across a grid of spot rates (x-axis) and volatilities (y-axis).
      </p>
      <div style={{ overflowX: "auto" }}>
        <svg width={w + 10} height={h + 10} style={{ display: "block", margin: "0 auto" }}>
          {data.spots.map((s, j) =>
            j % spotStep === 0 ? (
              <text key={`s-${j}`} x={labelW + j * cellW + cellW / 2} y={labelH - 6}
                textAnchor="middle" fontSize={9} fill="#475569">
                {s.toFixed(3)}
              </text>
            ) : null
          )}
          {data.vols.map((v, i) =>
            i % volStep === 0 ? (
              <text key={`v-${i}`} x={labelW - 4} y={labelH + i * cellH + cellH / 2 + 3}
                textAnchor="end" fontSize={9} fill="#475569">
                {(v * 100).toFixed(1)}%
              </text>
            ) : null
          )}
          {data.values.map((row, i) =>
            row.map((val, j) => (
              <rect key={`${i}-${j}`}
                x={labelW + j * cellW} y={labelH + i * cellH}
                width={cellW} height={cellH}
                fill={heatColor(val, minVal, maxVal)}>
                <title>{`Spot=${data.spots[j].toFixed(4)} | Vol=${(data.vols[i] * 100).toFixed(1)}% | ${data.greek}=${val.toFixed(6)}`}</title>
              </rect>
            ))
          )}
        </svg>
      </div>
    </div>
  );
}
