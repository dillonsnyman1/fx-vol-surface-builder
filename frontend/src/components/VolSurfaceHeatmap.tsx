import type { VolSurfaceResponse } from "../types/vol.ts";

interface Props {
  data: VolSurfaceResponse;
}

function volColor(vol: number, minVol: number, maxVol: number): string {
  if (maxVol <= minVol) return "#2563eb";
  const t = (vol - minVol) / (maxVol - minVol);
  const r = Math.round(37 + t * 218);
  const g = Math.round(99 - t * 60);
  const b = Math.round(235 - t * 180);
  return `rgb(${r}, ${g}, ${b})`;
}

export function VolSurfaceHeatmap({ data }: Props) {
  const nTenors = data.tenor_labels.length;
  const nStrikes = data.strikes.length;

  const allVols = data.vol_matrix.flat().filter((v) => v > 0);
  const minVol = Math.min(...allVols);
  const maxVol = Math.max(...allVols);

  const cellW = Math.max(12, Math.min(20, 700 / nStrikes));
  const cellH = 32;
  const labelW = 50;
  const labelH = 40;
  const w = labelW + nStrikes * cellW;
  const h = labelH + nTenors * cellH;

  const strikeStep = Math.max(1, Math.floor(nStrikes / 8));

  return (
    <div className="chart-card wide">
      <h3>Volatility Surface</h3>
      <p className="chart-subtitle">
        Implied volatility across tenors and strikes. Colour intensity
        reflects vol level (darker = higher).
      </p>
      <div style={{ overflowX: "auto" }}>
        <svg width={w + 60} height={h + 20} style={{ display: "block", margin: "0 auto" }}>
          {data.strikes.map((K, j) =>
            j % strikeStep === 0 ? (
              <text
                key={`s-${j}`}
                x={labelW + j * cellW + cellW / 2}
                y={labelH - 6}
                textAnchor="middle"
                fontSize={9}
                fill="#475569"
              >
                {K.toFixed(3)}
              </text>
            ) : null
          )}
          {data.tenor_labels.map((t, i) => (
            <text
              key={`t-${i}`}
              x={labelW - 6}
              y={labelH + i * cellH + cellH / 2 + 4}
              textAnchor="end"
              fontSize={11}
              fontWeight={600}
              fill="#475569"
            >
              {t}
            </text>
          ))}
          {data.vol_matrix.map((row, i) =>
            row.map((vol, j) =>
              vol > 0 ? (
                <rect
                  key={`${i}-${j}`}
                  x={labelW + j * cellW}
                  y={labelH + i * cellH}
                  width={cellW}
                  height={cellH - 1}
                  fill={volColor(vol, minVol, maxVol)}
                >
                  <title>{`${data.tenor_labels[i]} | K=${data.strikes[j].toFixed(4)} | Vol=${(vol * 100).toFixed(2)}%`}</title>
                </rect>
              ) : null
            )
          )}
          <text x={w + 10} y={labelH + 4} fontSize={9} fill="#475569">{(maxVol * 100).toFixed(1)}%</text>
          <text x={w + 10} y={h} fontSize={9} fill="#475569">{(minVol * 100).toFixed(1)}%</text>
          <defs>
            <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={volColor(maxVol, minVol, maxVol)} />
              <stop offset="100%" stopColor={volColor(minVol, minVol, maxVol)} />
            </linearGradient>
          </defs>
          <rect x={w + 4} y={labelH + 8} width={8} height={h - labelH - 16} fill="url(#volGrad)" rx={2} />
        </svg>
      </div>
    </div>
  );
}
