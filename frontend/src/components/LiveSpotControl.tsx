import { useEffect, useRef, useState } from "react";
import { fetchLiveSpot } from "../api/client.ts";

interface Props {
  pair: string;
  spot: number;
  onSpotChange: (value: number) => void;
}

const CACHE_TTL = 60;

export function LiveSpotControl({ pair, spot, onSpotChange }: Props) {
  const [spotSource, setSpotSource] = useState<number | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPair = useRef(pair);

  useEffect(() => {
    if (lastPair.current !== pair) {
      lastPair.current = pair;
      setSpotSource(null);
      setFetchedAt(null);
      setError(null);
    }
  }, [pair]);

  useEffect(() => {
    if (fetchedAt === null) return;
    setElapsed(Math.floor((Date.now() - fetchedAt) / 1000));
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - fetchedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchedAt]);

  const edited = spotSource !== null && spot !== spotSource;
  const stale = fetchedAt !== null && elapsed >= CACHE_TTL;

  function handleFetch() {
    setFetching(true);
    setError(null);
    fetchLiveSpot(pair)
      .then((res) => {
        if (!res.available || res.spot === null) {
          setError(`No live data for ${pair}`);
          return;
        }
        onSpotChange(res.spot);
        setSpotSource(res.spot);
        setFetchedAt(Date.now());
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Fetch failed"))
      .finally(() => setFetching(false));
  }

  function handleReset() {
    if (spotSource !== null) onSpotChange(spotSource);
  }

  return (
    <div className="form-field">
      {/* Label row - contains the Live button and timer so the input stays at standard height */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>
        <span>Spot</span>
        <button
          onClick={handleFetch}
          disabled={fetching}
          style={{
            padding: "1px 7px", borderRadius: 4,
            border: `1px solid ${stale ? "#b91c1c" : "var(--accent)"}`,
            background: "transparent",
            color: stale ? "#b91c1c" : "var(--accent)",
            fontSize: 10, cursor: "pointer", fontWeight: 600,
            textTransform: "none", letterSpacing: "normal",
          }}
        >
          {fetching ? "..." : "Live"}
        </button>
        {fetchedAt !== null && (
          <span style={{ fontSize: 10, fontWeight: 400, color: stale ? "#b91c1c" : "var(--text)", textTransform: "none", letterSpacing: "normal" }}>
            {stale ? "stale" : `${elapsed}s ago`}
            {stale && (
              <button
                onClick={handleFetch}
                style={{ marginLeft: 3, background: "none", border: "none", color: "#b91c1c", cursor: "pointer", fontSize: 10, padding: 0 }}
              >
                ↻
              </button>
            )}
          </span>
        )}
        {edited && (
          <button
            title={`Reset to ${spotSource}`}
            onClick={handleReset}
            style={{ background: "none", border: "none", color: "#d97706", cursor: "pointer", fontSize: 12, padding: 0, textTransform: "none" }}
          >
            ↺
          </button>
        )}
      </div>

      {/* Input row - at same height as other form fields */}
      <input
        type="number"
        step={0.001}
        value={spot}
        onChange={(e) => onSpotChange(+e.target.value)}
        style={{
          width: 100,
          borderColor: edited ? "#d97706" : undefined,
          background: edited ? "#fffbeb" : undefined,
        }}
      />

      {error && (
        <span style={{ fontSize: 10, color: "#b91c1c", fontWeight: 400, textTransform: "none", letterSpacing: "normal" }}>
          {error}
        </span>
      )}
    </div>
  );
}
