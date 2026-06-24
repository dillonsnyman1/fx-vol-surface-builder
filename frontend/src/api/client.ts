import type {
  GKPriceResponse,
  GreeksHeatmapResponse,
  GreekName,
  InterpolationMethod,
  OptionType,
  RRBFTermStructureResponse,
  SampleQuotesResponse,
  SensitivityParam,
  SensitivityPoint,
  SmileResponse,
  TenorQuote,
  VolSurfaceResponse,
} from "../types/vol.ts";

const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(
      (payload as { detail?: string } | null)?.detail ??
        `Request failed (${res.status})`
    );
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(
      (payload as { detail?: string } | null)?.detail ??
        `Request failed (${res.status})`
    );
  }
  return res.json() as Promise<T>;
}

export function fetchSampleQuotes(
  pair: string = "EURUSD"
): Promise<SampleQuotesResponse> {
  return get<SampleQuotesResponse>(`/api/sample-quotes?pair=${pair}`);
}

export function priceOption(
  S: number,
  K: number,
  T: number,
  r_d: number,
  r_f: number,
  sigma: number,
  optionType: OptionType,
  notional: number = 1_000_000
): Promise<GKPriceResponse> {
  return post<GKPriceResponse>("/api/price", {
    S, K, T, r_d, r_f, sigma,
    option_type: optionType,
    notional,
  });
}

export function fetchGreeksSensitivity(
  S: number,
  K: number,
  T: number,
  r_d: number,
  r_f: number,
  sigma: number,
  optionType: OptionType,
  varyParam: SensitivityParam,
  nPoints: number = 60
): Promise<SensitivityPoint[]> {
  return post<SensitivityPoint[]>("/api/greeks-sensitivity", {
    S, K, T, r_d, r_f, sigma,
    option_type: optionType,
    vary_param: varyParam,
    n_points: nPoints,
  });
}

export function buildVolSurface(
  spot: number,
  r_d: number,
  r_f: number,
  tenors: TenorQuote[],
  interpolationMethod: InterpolationMethod = "polynomial",
  nStrikes: number = 50
): Promise<VolSurfaceResponse> {
  return post<VolSurfaceResponse>("/api/vol-surface", {
    spot, r_d, r_f, tenors,
    interpolation_method: interpolationMethod,
    n_strikes: nStrikes,
  });
}

export function buildSmile(
  spot: number,
  r_d: number,
  r_f: number,
  T: number,
  atmVol: number,
  rr25: number,
  bf25: number,
  rr10: number | null = null,
  bf10: number | null = null,
  interpolationMethod: InterpolationMethod = "polynomial",
  nStrikes: number = 50
): Promise<SmileResponse> {
  return post<SmileResponse>("/api/smile", {
    spot, r_d, r_f, T,
    atm_vol: atmVol,
    rr_25: rr25,
    bf_25: bf25,
    rr_10: rr10,
    bf_10: bf10,
    interpolation_method: interpolationMethod,
    n_strikes: nStrikes,
  });
}

export function fetchRRBFTermStructure(
  tenors: TenorQuote[]
): Promise<RRBFTermStructureResponse> {
  return post<RRBFTermStructureResponse>("/api/rr-bf-term-structure", {
    tenors,
  });
}

export function fetchGreeksHeatmap(
  S: number,
  K: number,
  T: number,
  r_d: number,
  r_f: number,
  sigma: number,
  optionType: OptionType,
  greek: GreekName,
  spotRangePct: number = 0.3,
  volRangeMult: number = 2.5,
  gridSize: number = 20
): Promise<GreeksHeatmapResponse> {
  return post<GreeksHeatmapResponse>("/api/greeks-heatmap", {
    S, K, T, r_d, r_f, sigma,
    option_type: optionType,
    greek,
    spot_range_pct: spotRangePct,
    vol_range_mult: volRangeMult,
    grid_size: gridSize,
  });
}
