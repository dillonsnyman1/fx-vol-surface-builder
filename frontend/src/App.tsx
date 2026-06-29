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

function App() {
  const [sampleData, setSampleData] = useState<SampleQuotesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pricer");

  // Pricer state
  const [inputs, setInputs] = useState(DEFAULT_GK_INPUTS);
  const [priceResult, setPriceResult] = useState<GKPriceResponse | null>(null);
  const [pricing, setPricing] = useState(false);

  // Vol surface state
  const [volSurface, setVolSurface] = useState<VolSurfaceResponse | null>(null);
  const [interpMethod, setInterpMethod] = useState<InterpolationMethod>("polynomial");

  // Smile state
  const [smileData, setSmileData] = useState<SmileResponse | null>(null);
  const [smileTenorIdx, setSmileTenorIdx] = useState(4);

  // RR/BF state
  const [rrbf, setRRBF] = useState<RRBFTermStructureResponse | null>(null);

  // Greeks heatmap state
  const [heatmapData, setHeatmapData] = useState<GreeksHeatmapResponse | null>(null);
  const [heatmapGreek, setHeatmapGreek] = useState<GreekName>("delta");

  useEffect(() => {
    setLoading(true);
    fetchSampleQuotes()
      .then(setSampleData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load sample quotes"))
      .finally(() => setLoading(false));
  }, []);

  function handleInputChange(field: string, value: number | string) {
    setInputs((prev) => ({ ...prev, [field]: value }));
  }

  function handlePrice() {
    setPricing(true);
    priceOption(inputs.S, inputs.K, inputs.T, inputs.r_d, inputs.r_f, inputs.sigma, inputs.option_type, inputs.notional)
      .then(setPriceResult)
      .catch((e) => setError(e instanceof Error ? e.message : "Pricing failed"))
      .finally(() => setPricing(false));
  }

  useEffect(() => {
    handlePrice();
  }, []);

  // Build vol surface when sample data or interp method changes
  useEffect(() => {
    if (!sampleData) return;
    buildVolSurface(sampleData.spot, sampleData.r_d, sampleData.r_f, sampleData.tenors, interpMethod)
      .then(setVolSurface)
      .catch(() => {});
  }, [sampleData, interpMethod]);

  // Build smile for selected tenor
  useEffect(() => {
    if (!sampleData) return;
    const t = sampleData.tenors[smileTenorIdx] ?? sampleData.tenors[0];
    buildSmile(sampleData.spot, sampleData.r_d, sampleData.r_f, t.tenor_years,
      t.atm_vol, t.rr_25, t.bf_25, t.rr_10, t.bf_10, interpMethod)
      .then(setSmileData)
      .catch(() => {});
  }, [sampleData, smileTenorIdx, interpMethod]);

  // RR/BF term structure
  useEffect(() => {
    if (!sampleData) return;
    fetchRRBFTermStructure(sampleData.tenors)
      .then(setRRBF)
      .catch(() => {});
  }, [sampleData]);

  // Greeks heatmap
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

      {!loading && !error && (
        <div className="tab-content" key={tab}>

          {tab === "pricer" && (
            <>
              <PricerForm
                {...inputs}
                optionType={inputs.option_type}
                onChange={handleInputChange}
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

          {tab === "vol-surface" && sampleData && (
            <>
              <div className="toolbar" style={{ marginBottom: 16 }}>
                <div className="form-row">
                  <label className="form-field">
                    Interpolation
                    <select value={interpMethod} onChange={(e) => setInterpMethod(e.target.value as InterpolationMethod)}>
                      <option value="polynomial">Polynomial</option>
                      <option value="cubic_spline">Cubic Spline</option>
                      <option value="vanna_volga">Vanna-Volga</option>
                    </select>
                  </label>
                </div>
              </div>
              {volSurface && <VolSurfaceHeatmap data={volSurface} />}
            </>
          )}

          {tab === "smile-analysis" && sampleData && (
            <>
              <div className="toolbar" style={{ marginBottom: 16 }}>
                <div className="form-row">
                  <label className="form-field">
                    Tenor
                    <select value={smileTenorIdx} onChange={(e) => setSmileTenorIdx(+e.target.value)}>
                      {sampleData.tenors.map((t, i) => (
                        <option key={t.tenor_label} value={i}>{t.tenor_label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    Interpolation
                    <select value={interpMethod} onChange={(e) => setInterpMethod(e.target.value as InterpolationMethod)}>
                      <option value="polynomial">Polynomial</option>
                      <option value="cubic_spline">Cubic Spline</option>
                      <option value="vanna_volga">Vanna-Volga</option>
                    </select>
                  </label>
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
                  <label className="form-field">
                    Greek
                    <select value={heatmapGreek} onChange={(e) => setHeatmapGreek(e.target.value as GreekName)}>
                      <option value="delta">Delta</option>
                      <option value="gamma">Gamma</option>
                      <option value="vega">Vega</option>
                      <option value="theta">Theta</option>
                      <option value="rho_d">Rho (domestic)</option>
                      <option value="rho_f">Rho (foreign)</option>
                    </select>
                  </label>
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
