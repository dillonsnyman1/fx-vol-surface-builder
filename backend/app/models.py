from enum import Enum

from pydantic import BaseModel, Field


class OptionType(str, Enum):
    call = "call"
    put = "put"


class SensitivityParam(str, Enum):
    spot = "spot"
    vol = "vol"
    time = "time"
    rate_domestic = "rate_domestic"
    rate_foreign = "rate_foreign"


class InterpolationMethod(str, Enum):
    polynomial = "polynomial"
    vanna_volga = "vanna_volga"
    cubic_spline = "cubic_spline"


class GreekName(str, Enum):
    delta = "delta"
    gamma = "gamma"
    vega = "vega"
    theta = "theta"
    rho_d = "rho_d"
    rho_f = "rho_f"


# ---------------------------------------------------------------------------
# GK pricing
# ---------------------------------------------------------------------------

class FxGreeks(BaseModel):
    delta: float
    gamma: float
    vega: float
    theta: float
    rho_d: float
    rho_f: float


class GKPriceRequest(BaseModel):
    S: float = Field(gt=0, description="Spot FX rate")
    K: float = Field(gt=0, description="Strike rate")
    T: float = Field(gt=0, description="Time to expiry in years")
    r_d: float = Field(description="Domestic risk-free rate")
    r_f: float = Field(description="Foreign risk-free rate")
    sigma: float = Field(gt=0, description="Implied volatility")
    option_type: OptionType
    notional: float = Field(default=1_000_000, gt=0)


class GKPriceResponse(BaseModel):
    price: float
    price_pips: float
    premium_domestic: float
    premium_foreign: float
    greeks: FxGreeks


# ---------------------------------------------------------------------------
# Greeks sensitivity
# ---------------------------------------------------------------------------

class GreeksSensitivityRequest(BaseModel):
    S: float = Field(gt=0)
    K: float = Field(gt=0)
    T: float = Field(gt=0)
    r_d: float
    r_f: float
    sigma: float = Field(gt=0)
    option_type: OptionType
    vary_param: SensitivityParam
    n_points: int = Field(default=60, ge=10, le=200)


class SensitivityPoint(BaseModel):
    param_value: float
    price: float
    delta: float
    gamma: float
    vega: float
    theta: float
    rho_d: float
    rho_f: float


# ---------------------------------------------------------------------------
# Vol surface
# ---------------------------------------------------------------------------

class TenorQuote(BaseModel):
    tenor_label: str
    tenor_years: float = Field(gt=0)
    atm_vol: float = Field(gt=0)
    rr_25: float
    bf_25: float = Field(ge=0)
    rr_10: float | None = Field(default=None)
    bf_10: float | None = Field(default=None, ge=0)


class VolSurfaceRequest(BaseModel):
    spot: float = Field(gt=0)
    r_d: float
    r_f: float
    tenors: list[TenorQuote] = Field(min_length=2)
    interpolation_method: InterpolationMethod = Field(default=InterpolationMethod.polynomial)
    n_strikes: int = Field(default=50, ge=10, le=100)


class SmilePoint(BaseModel):
    strike: float
    delta: float
    implied_vol: float
    moneyness: float


class TenorSmile(BaseModel):
    tenor_label: str
    tenor_years: float
    points: list[SmilePoint]


class VolSurfaceResponse(BaseModel):
    tenor_labels: list[str]
    tenor_years: list[float]
    strikes: list[float]
    vol_matrix: list[list[float]]
    smiles: list[TenorSmile]


# ---------------------------------------------------------------------------
# Single smile
# ---------------------------------------------------------------------------

class SmileRequest(BaseModel):
    spot: float = Field(gt=0)
    r_d: float
    r_f: float
    T: float = Field(gt=0)
    atm_vol: float = Field(gt=0)
    rr_25: float
    bf_25: float = Field(ge=0)
    rr_10: float | None = Field(default=None)
    bf_10: float | None = Field(default=None, ge=0)
    interpolation_method: InterpolationMethod = Field(default=InterpolationMethod.polynomial)
    n_strikes: int = Field(default=50, ge=10, le=100)


class SmileResponse(BaseModel):
    points: list[SmilePoint]
    atm_strike: float
    atm_vol: float
    put_25d_strike: float
    put_25d_vol: float
    call_25d_strike: float
    call_25d_vol: float


# ---------------------------------------------------------------------------
# RR/BF term structure
# ---------------------------------------------------------------------------

class RRBFTermStructureRequest(BaseModel):
    tenors: list[TenorQuote] = Field(min_length=2)


class RRBFTermStructureResponse(BaseModel):
    tenor_labels: list[str]
    tenor_years: list[float]
    atm_vols: list[float]
    rr_25: list[float]
    bf_25: list[float]
    rr_10: list[float | None]
    bf_10: list[float | None]


# ---------------------------------------------------------------------------
# Greeks heatmap
# ---------------------------------------------------------------------------

class GreeksHeatmapRequest(BaseModel):
    S: float = Field(gt=0)
    K: float = Field(gt=0)
    T: float = Field(gt=0)
    r_d: float
    r_f: float
    sigma: float = Field(gt=0)
    option_type: OptionType
    greek: GreekName
    spot_range_pct: float = Field(default=0.3, gt=0, le=0.5)
    vol_range_mult: float = Field(default=2.5, gt=1.0, le=5.0)
    grid_size: int = Field(default=20, ge=10, le=40)


class GreeksHeatmapResponse(BaseModel):
    spots: list[float]
    vols: list[float]
    values: list[list[float]]
    greek: str


# ---------------------------------------------------------------------------
# Sample quotes
# ---------------------------------------------------------------------------

class SampleQuotesResponse(BaseModel):
    pair: str
    spot: float
    r_d: float
    r_f: float
    tenors: list[TenorQuote]
