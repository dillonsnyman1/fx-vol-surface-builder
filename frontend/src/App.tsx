import { useEffect, useState } from "react";
import "./App.css";
import { fetchSampleQuotes } from "./api/client.ts";
import type { SampleQuotesResponse } from "./types/vol.ts";

type Tab = "pricer" | "sensitivity" | "vol-surface" | "smile-analysis" | "greeks-heatmap";

const TABS: [Tab, string][] = [
  ["pricer", "Pricer"],
  ["sensitivity", "Sensitivity"],
  ["vol-surface", "Vol Surface"],
  ["smile-analysis", "Smile Analysis"],
  ["greeks-heatmap", "Greeks Heatmap"],
];

function App() {
  const [sampleData, setSampleData] = useState<SampleQuotesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pricer");

  useEffect(() => {
    setLoading(true);
    fetchSampleQuotes()
      .then(setSampleData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load sample quotes"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="app-header">
        <h1>FX Volatility Surface Builder</h1>
        <p className="header-tagline">
          Garman-Kohlhagen pricing, delta-space smile construction and risk reversal/butterfly analysis.
        </p>
        <p className="header-background">
          Price FX options using the Garman-Kohlhagen model with full Greeks, build
          implied volatility surfaces from market convention quotes (ATM, risk reversal,
          butterfly), compare interpolation methods (polynomial, cubic spline,
          vanna-volga), and analyse the term structure of smile skew and convexity.
        </p>
      </header>

      <nav className="tab-nav">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className={`tab-button${tab === key ? " active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading && <div className="status-message">Loading...</div>}
      {error && <div className="status-message error">{error}</div>}

      {!loading && !error && sampleData && (
        <div className="tab-content" key={tab}>
          {tab === "pricer" && (
            <div className="tab-placeholder">
              Pricer tab - Garman-Kohlhagen pricing for {sampleData.pair} (spot: {sampleData.spot})
            </div>
          )}
          {tab === "sensitivity" && (
            <div className="tab-placeholder">
              Sensitivity tab - Greeks variation across spot, vol, time and rates
            </div>
          )}
          {tab === "vol-surface" && (
            <div className="tab-placeholder">
              Vol Surface tab - {sampleData.tenors.length} tenors loaded ({sampleData.tenors[0].tenor_label} to{" "}
              {sampleData.tenors[sampleData.tenors.length - 1].tenor_label})
            </div>
          )}
          {tab === "smile-analysis" && (
            <div className="tab-placeholder">
              Smile Analysis tab - cross-sections, RR/BF term structure and interpolation comparison
            </div>
          )}
          {tab === "greeks-heatmap" && (
            <div className="tab-placeholder">
              Greeks Heatmap tab - 2D spot x vol grid for selected Greek
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default App;
