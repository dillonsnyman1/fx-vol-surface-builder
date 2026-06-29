import { useEffect, useState } from "react";
import "./App.css";
import {
  buildSmile,
  buildVolSurface,
  fetchGreeksHeatmap,
  fetchRRBFTermStructure,
  fetchSampleQuotes,
  priceOption,
} from "./api/client.ts";
import { GreeksHeatmap } from "./components/GreeksHeatmap.tsx";
import { GreeksPanel } from "./components/GreeksPanel.tsx";
import { GreeksSensitivityChart } from "./components/GreeksSensitivityChart.tsx";
import { LiveSpotControl } from "./components/LiveSpotControl.tsx";
import { MarketQuoteTable } from "./components/MarketQuoteTable.tsx";
import { PriceResultPanel } from "./components/PriceResultPanel.tsx";
import { PricerForm } from "./components/PricerForm.tsx";
import { ATMTermStructureChart, ButterflyChart, RiskReversalChart } from "./components/RRBFCharts.tsx";
import { SmileCrossSection } from "./components/SmileCrossSection.tsx";
import { VolSurfaceHeatmap } from "./components/VolSurfaceHeatmap.tsx";
import type {
  GKPriceResponse,
  GreekName,
  GreeksHeatmapResponse,
  InterpolationMethod,
  OptionType,
  RRBFTermStructureResponse,
  SampleQuotesResponse,
  SmileResponse,
  TenorQuote,
  VolSurfaceResponse,
} from "./types/vol.ts";
import { DEFAULT_GK_INPUTS } from "./types/vol.ts";

type Tab = "pricer" | "sensitivity" | "vol-surface" | "smile-analysis" | "greeks-heatmap";

const TABS: [Tab, string][] = [
  ["pricer", "Pricer"],
  ["sensitivity", "Sensitivity"],
  ["vol-surface", "Vol Surface"],
  ["smile-analysis", "Smile Analysis"],
  ["greeks-heatmap", "Greeks Heatmap"],
];

const PAIRS = ["EURUSD", "USDJPY", "GBPUSD"];

// Fields loaded from the pair/live fetch that PricerForm should track for edit/reset
type InputSource = { S: number; r_d: number; r_f: number; sigma: number };

function App() {
  const [pair, setPair] = useState("EURUSD");
  const [sampleData, setSampleData] = useState<SampleQuotesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    const hash = window.location.hash.slice(1);
    return TABS.some(([k]) => k === hash) ? (hash as Tab) : "pricer";
  });

  // Single source of truth for all pricing/surface inputs
  const [inputs, setInputs] = useState(DEFAULT_GK_INPUTS);
  // Snapshot of values last loaded from pair selection or live fetch - drives edit indicators in PricerForm
  const [inputSource, setInputSource] = useState<InputSource | null>(null);

  const [tenors, setTenors] = useState<TenorQuote[]>([]);
  const [priceResult, setPriceResult] = useState<GKPriceResponse | null>(null);
  const [pricing, setPricing] = useState(false);
  const [volSurface, setVolSurface] = useState<VolSurfaceResponse | null>(null);
  const [interpMethod, setInterpMethod] = useState<InterpolationMethod>("polynomial");
  const [smileData, setSmileData] = useState<SmileResponse | null>(null);
  const [smileTenorIdx, setSmileTenorIdx] = useState(4);
  const [rrbf, setRRBF] = useState<RRBFTermStructureResponse | null>(null);
  const [heatmapData, setHeatmapData] = useState<GreeksHeatmapResponse | null>(null);
  const [heatmapGreek, setHeatmapGreek] = useState<GreekName>("delta");

  function loadPair(p: string) {
    setPair(p);
    setLoading(true);
    setError(null);
    fetchSampleQuotes(p)
      .then((data) => {
        setSampleData(data);
        setTenors(data.tenors);
        const midIdx = Math.min(4, data.tenors.length - 1);
        setSmileTenorIdx(midIdx);
        const sigma = data.tenors[midIdx]?.atm_vol ?? DEFAULT_GK_INPUTS.sigma;
        setInputs((prev) => ({
          ...prev,
          S: data.spot, K: data.spot,
          r_d: data.r_d, r_f: data.r_f,
          sigma,
        }));
        setInputSource({ S: data.spot, r_d: data.r_d, r_f: data.r_f, sigma });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load quotes"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPair("EURUSD"); }, []);

  // When live spot is fetched, update inputs.S and the source snapshot
  function handleLiveSpotFetched(v: number) {
    setInputs((prev) => ({ ...prev, S: v }));
    setInputSource((prev) => prev ? { ...prev, S: v } : { S: v, r_d: inputs.r_d, r_f: inputs.r_f, sigma: inputs.sigma });
  }

  function handleInputChange(field: string, value: number | string) {
    setInputs((prev) => ({ ...prev, [field]: value }));
  }

  function handleResetField(field: keyof InputSource) {
    if (!inputSource) return;
    setInputs((prev) => ({ ...prev, [field]: inputSource[field] }));
  }

  function handlePrice() {
    setPricing(true);
    priceOption(inputs.S, inputs.K, inputs.T, inputs.r_d, inputs.r_f, inputs.sigma, inputs.option_type, inputs.notional)
      .then(setPriceResult)
      .catch((e) => setError(e instanceof Error ? e.message : "Pricing failed"))
      .finally(() => setPricing(false));
  }

  useEffect(() => {
    if (!sampleData) return;
    handlePrice();
  }, [sampleData]);

  // Vol surface rebuilds whenever market inputs or tenors/method change
  useEffect(() => {
    if (tenors.length < 2) return;
    buildVolSurface(inputs.S, inputs.r_d, inputs.r_f, tenors, interpMethod)
      .then(setVolSurface)
      .catch(() => {});
  }, [inputs.S, inputs.r_d, inputs.r_f, tenors, interpMethod]);

  useEffect(() => {
    if (tenors.length === 0) return;
    const t = tenors[smileTenorIdx] ?? tenors[0];
    buildSmile(inputs.S, inputs.r_d, inputs.r_f, t.tenor_years, t.atm_vol, t.rr_25, t.bf_25, t.rr_10, t.bf_10, interpMethod)
      .then(setSmileData)
      .catch(() => {});
  }, [inputs.S, inputs.r_d, inputs.r_f, tenors, smileTenorIdx, interpMethod]);

  useEffect(() => {
    if (tenors.length < 2) return;
    fetchRRBFTermStructure(tenors).then(setRRBF).catch(() => {});
  }, [tenors]);

  useEffect(() => {
    fetchGreeksHeatmap(inputs.S, inputs.K, inputs.T, inputs.r_d, inputs.r_f, inputs.sigma, inputs.option_type as OptionType, heatmapGreek)
      .then(setHeatmapData)
      .catch(() => {});
  }, [inputs.S, inputs.K, inputs.T, inputs.r_d, inputs.r_f, inputs.sigma, inputs.option_type, heatmapGreek]);

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

      <div className="toolbar">
        <div className="form-row">
          <label className="form-field">
            Currency Pair
            <select value={pair} onChange={(e) => loadPair(e.target.value)}>
              {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <LiveSpotControl pair={pair} spot={inputs.S} onSpotChange={handleLiveSpotFetched} />
          <label className="form-field">
            r domestic
            <input type="number" step={0.0025} value={inputs.r_d}
              onChange={(e) => setInputs((prev) => ({ ...prev, r_d: +e.target.value }))}
              style={{ width: 80 }}
            />
          </label>
          <label className="form-field">
            r foreign
            <input type="number" step={0.0025} value={inputs.r_f}
              onChange={(e) => setInputs((prev) => ({ ...prev, r_f: +e.target.value }))}
              style={{ width: 80 }}
            />
          </label>
        </div>
      </div>

      <nav className="tab-nav">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className={`tab-button${tab === key ? " active" : ""}`}
            onClick={() => { setTab(key); window.location.hash = key; }}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading && <div className="status-message">Loading {pair} quotes...</div>}
      {error && <div className="status-message error">{error}</div>}

      {!loading && !error && (
        <div className="tab-content" key={tab}>

          {tab === "pricer" && (
            <>
              <PricerForm
                {...inputs}
                optionType={inputs.option_type}
                source={inputSource ?? undefined}
                onChange={handleInputChange}
                onReset={handleResetField}
                onPrice={handlePrice}
                loading={pricing}
              />
              {priceResult && (
                <>
                  <PriceResultPanel data={priceResult} />
                  <GreeksPanel greeks={priceResult.greeks} />
                </>
              )}
            </>
          )}

          {tab === "sensitivity" && (
            <GreeksSensitivityChart
              S={inputs.S} K={inputs.K} T={inputs.T}
              r_d={inputs.r_d} r_f={inputs.r_f} sigma={inputs.sigma}
              optionType={inputs.option_type}
            />
          )}

          {tab === "vol-surface" && (
            <>
              <div className="toolbar" style={{ marginBottom: 16 }}>
                <div className="form-row">
                  <div className="form-field">
                    Interpolation
                    <div className="toggle-group">
                      {(["polynomial", "cubic_spline", "vanna_volga"] as InterpolationMethod[]).map((m) => (
                        <button key={m} className={`toggle-btn${interpMethod === m ? " active" : ""}`} onClick={() => setInterpMethod(m)}>
                          {m === "polynomial" ? "Polynomial" : m === "cubic_spline" ? "Cubic Spline" : "Vanna-Volga"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <MarketQuoteTable tenors={tenors} onUpdate={setTenors} />
              {volSurface && <VolSurfaceHeatmap data={volSurface} />}
            </>
          )}

          {tab === "smile-analysis" && (
            <>
              <div className="toolbar" style={{ marginBottom: 16 }}>
                <div className="form-row">
                  <div className="form-field">
                    Tenor
                    <div className="toggle-group">
                      {tenors.map((t, i) => (
                        <button key={t.tenor_label} className={`toggle-btn${smileTenorIdx === i ? " active" : ""}`} onClick={() => setSmileTenorIdx(i)}>
                          {t.tenor_label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-field">
                    Interpolation
                    <div className="toggle-group">
                      {(["polynomial", "cubic_spline", "vanna_volga"] as InterpolationMethod[]).map((m) => (
                        <button key={m} className={`toggle-btn${interpMethod === m ? " active" : ""}`} onClick={() => setInterpMethod(m)}>
                          {m === "polynomial" ? "Polynomial" : m === "cubic_spline" ? "Cubic Spline" : "Vanna-Volga"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="charts-row">
                {smileData && <SmileCrossSection data={smileData} />}
                {rrbf && <ATMTermStructureChart data={rrbf} />}
              </div>
              {rrbf && (
                <div className="charts-row">
                  <RiskReversalChart data={rrbf} />
                  <ButterflyChart data={rrbf} />
                </div>
              )}
            </>
          )}

          {tab === "greeks-heatmap" && (
            <>
              <div className="toolbar" style={{ marginBottom: 16 }}>
                <div className="form-row">
                  <div className="form-field">
                    Greek
                    <div className="toggle-group">
                      {([
                        ["delta", "Delta"], ["gamma", "Gamma"], ["vega", "Vega"],
                        ["theta", "Theta"], ["rho_d", "Rho (d)"], ["rho_f", "Rho (f)"],
                      ] as [GreekName, string][]).map(([g, label]) => (
                        <button key={g} className={`toggle-btn${heatmapGreek === g ? " active" : ""}`} onClick={() => setHeatmapGreek(g)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {heatmapData && <GreeksHeatmap data={heatmapData} />}
            </>
          )}

        </div>
      )}
    </>
  );
}

export default App;
