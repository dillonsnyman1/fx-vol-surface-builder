export type OptionType = "call" | "put";
export type SensitivityParam = "spot" | "vol" | "time" | "rate_domestic" | "rate_foreign";
export type InterpolationMethod = "polynomial" | "vanna_volga" | "cubic_spline";
export type GreekName = "delta" | "gamma" | "vega" | "theta" | "rho_d" | "rho_f";

export interface FxGreeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho_d: number;
  rho_f: number;
}

export interface GKPriceResponse {
  price: number;
  price_pips: number;
  premium_domestic: number;
  premium_foreign: number;
  greeks: FxGreeks;
}

export interface SensitivityPoint {
  param_value: number;
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho_d: number;
  rho_f: number;
}

export interface TenorQuote {
  tenor_label: string;
  tenor_years: number;
  atm_vol: number;
  rr_25: number;
  bf_25: number;
  rr_10: number | null;
  bf_10: number | null;
}

export interface SmilePoint {
  strike: number;
  delta: number;
  implied_vol: number;
  moneyness: number;
}

export interface SmileResponse {
  points: SmilePoint[];
  atm_strike: number;
  atm_vol: number;
  put_25d_strike: number;
  put_25d_vol: number;
  call_25d_strike: number;
  call_25d_vol: number;
}

export interface TenorSmile {
  tenor_label: string;
  tenor_years: number;
  points: SmilePoint[];
}

export interface VolSurfaceResponse {
  tenor_labels: string[];
  tenor_years: number[];
  strikes: number[];
  vol_matrix: number[][];
  smiles: TenorSmile[];
}

export interface RRBFTermStructureResponse {
  tenor_labels: string[];
  tenor_years: number[];
  atm_vols: number[];
  rr_25: number[];
  bf_25: number[];
  rr_10: (number | null)[];
  bf_10: (number | null)[];
}

export interface GreeksHeatmapResponse {
  spots: number[];
  vols: number[];
  values: number[][];
  greek: string;
}

export interface SampleQuotesResponse {
  pair: string;
  spot: number;
  r_d: number;
  r_f: number;
  tenors: TenorQuote[];
}

export const GREEK_LABELS: Record<GreekName, string> = {
  delta: "Delta",
  gamma: "Gamma",
  vega: "Vega",
  theta: "Theta",
  rho_d: "Rho (domestic)",
  rho_f: "Rho (foreign)",
};

export const INTERPOLATION_LABELS: Record<InterpolationMethod, string> = {
  polynomial: "Polynomial",
  vanna_volga: "Vanna-Volga",
  cubic_spline: "Cubic Spline",
};

export const SENSITIVITY_LABELS: Record<SensitivityParam, string> = {
  spot: "Spot Rate",
  vol: "Volatility",
  time: "Time to Expiry",
  rate_domestic: "Domestic Rate",
  rate_foreign: "Foreign Rate",
};

export const DEFAULT_GK_INPUTS = {
  S: 1.09,
  K: 1.09,
  T: 0.25,
  r_d: 0.0525,
  r_f: 0.0425,
  sigma: 0.075,
  option_type: "call" as OptionType,
  notional: 1_000_000,
};
