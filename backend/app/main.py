import os

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.garman_kohlhagen import (
    atm_strike_delta_neutral,
    delta_to_strike,
    greeks as gk_greeks,
    price as gk_price,
)
from app.models import (
    GKPriceRequest,
    GKPriceResponse,
    GreeksHeatmapRequest,
    GreeksHeatmapResponse,
    GreeksSensitivityRequest,
    FxGreeks,
    RRBFTermStructureRequest,
    RRBFTermStructureResponse,
    SampleQuotesResponse,
    SensitivityPoint,
    SmileRequest,
    SmileResponse,
    VolSurfaceRequest,
    VolSurfaceResponse,
)
from app.sample_data import generate_sample_quotes
from app.vol_surface import (
    build_smile,
    build_surface,
    compute_rr_bf_term_structure,
    market_quotes_to_vols,
)

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

app = FastAPI(title="FX Volatility Surface Builder")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Sample quotes
# ---------------------------------------------------------------------------

@app.get("/api/sample-quotes", response_model=SampleQuotesResponse)
async def sample_quotes(pair: str = "EURUSD"):
    return SampleQuotesResponse(**generate_sample_quotes(pair))


# ---------------------------------------------------------------------------
# GK pricing
# ---------------------------------------------------------------------------

@app.post("/api/price", response_model=GKPriceResponse)
async def price_option(req: GKPriceRequest) -> GKPriceResponse:
    p = gk_price(req.S, req.K, req.T, req.r_d, req.r_f, req.sigma, req.option_type.value)
    g = gk_greeks(req.S, req.K, req.T, req.r_d, req.r_f, req.sigma, req.option_type.value)

    pip_size = 0.0001 if req.S < 50 else 0.01
    price_pips = p / pip_size

    return GKPriceResponse(
        price=p,
        price_pips=price_pips,
        premium_domestic=p * req.notional,
        premium_foreign=p * req.notional / req.S if req.S > 0 else 0.0,
        greeks=FxGreeks(**g),
    )


# ---------------------------------------------------------------------------
# Greeks sensitivity
# ---------------------------------------------------------------------------

@app.post("/api/greeks-sensitivity", response_model=list[SensitivityPoint])
async def greeks_sensitivity(req: GreeksSensitivityRequest) -> list[SensitivityPoint]:
    param = req.vary_param.value
    base = {"S": req.S, "K": req.K, "T": req.T, "r_d": req.r_d, "r_f": req.r_f, "sigma": req.sigma}

    if param == "spot":
        values = np.linspace(req.S * 0.7, req.S * 1.3, req.n_points)
    elif param == "vol":
        values = np.linspace(max(req.sigma * 0.2, 0.001), req.sigma * 3.0, req.n_points)
    elif param == "time":
        values = np.linspace(max(req.T * 0.01, 0.001), req.T * 2.0, req.n_points)
    elif param == "rate_domestic":
        values = np.linspace(max(req.r_d - 0.03, -0.01), req.r_d + 0.03, req.n_points)
    else:
        values = np.linspace(max(req.r_f - 0.03, -0.01), req.r_f + 0.03, req.n_points)

    param_key_map = {"spot": "S", "vol": "sigma", "time": "T", "rate_domestic": "r_d", "rate_foreign": "r_f"}
    key = param_key_map[param]

    points = []
    for v in values:
        args = {**base, key: float(v)}
        p = gk_price(**args, option_type=req.option_type.value)
        g = gk_greeks(**args, option_type=req.option_type.value)
        points.append(SensitivityPoint(
            param_value=float(v), price=p,
            delta=g["delta"], gamma=g["gamma"], vega=g["vega"],
            theta=g["theta"], rho_d=g["rho_d"], rho_f=g["rho_f"],
        ))
    return points


# ---------------------------------------------------------------------------
# Vol surface
# ---------------------------------------------------------------------------

@app.post("/api/vol-surface", response_model=VolSurfaceResponse)
async def vol_surface(req: VolSurfaceRequest) -> VolSurfaceResponse:
    tenor_dicts = [t.model_dump() for t in req.tenors]
    result = build_surface(
        req.spot, req.r_d, req.r_f, tenor_dicts,
        req.interpolation_method.value, req.n_strikes,
    )
    return VolSurfaceResponse(**result)


# ---------------------------------------------------------------------------
# Single smile
# ---------------------------------------------------------------------------

@app.post("/api/smile", response_model=SmileResponse)
async def smile(req: SmileRequest) -> SmileResponse:
    points = build_smile(
        req.spot, req.T, req.r_d, req.r_f,
        req.atm_vol, req.rr_25, req.bf_25,
        req.rr_10, req.bf_10,
        req.interpolation_method.value, req.n_strikes,
    )

    vols = market_quotes_to_vols(req.atm_vol, req.rr_25, req.bf_25)
    K_atm = atm_strike_delta_neutral(req.spot, req.T, req.r_d, req.r_f, req.atm_vol)
    K_25c = delta_to_strike(0.25, req.spot, req.T, req.r_d, req.r_f, vols["call_25"], "call")
    K_25p = delta_to_strike(-0.25, req.spot, req.T, req.r_d, req.r_f, vols["put_25"], "put")

    return SmileResponse(
        points=points,
        atm_strike=K_atm,
        atm_vol=req.atm_vol,
        put_25d_strike=K_25p,
        put_25d_vol=vols["put_25"],
        call_25d_strike=K_25c,
        call_25d_vol=vols["call_25"],
    )


# ---------------------------------------------------------------------------
# RR/BF term structure
# ---------------------------------------------------------------------------

@app.post("/api/rr-bf-term-structure", response_model=RRBFTermStructureResponse)
async def rr_bf_term_structure(req: RRBFTermStructureRequest) -> RRBFTermStructureResponse:
    tenor_dicts = [t.model_dump() for t in req.tenors]
    result = compute_rr_bf_term_structure(tenor_dicts)
    return RRBFTermStructureResponse(**result)


# ---------------------------------------------------------------------------
# Greeks heatmap
# ---------------------------------------------------------------------------

@app.post("/api/greeks-heatmap", response_model=GreeksHeatmapResponse)
async def greeks_heatmap(req: GreeksHeatmapRequest) -> GreeksHeatmapResponse:
    spot_lo = req.S * (1 - req.spot_range_pct)
    spot_hi = req.S * (1 + req.spot_range_pct)
    vol_lo = req.sigma / req.vol_range_mult
    vol_hi = req.sigma * req.vol_range_mult

    spots = np.linspace(spot_lo, spot_hi, req.grid_size).tolist()
    vols = np.linspace(vol_lo, vol_hi, req.grid_size).tolist()

    values = []
    for vol in vols:
        row = []
        for spot in spots:
            g = gk_greeks(spot, req.K, req.T, req.r_d, req.r_f, vol, req.option_type.value)
            row.append(g[req.greek.value])
        values.append(row)

    return GreeksHeatmapResponse(
        spots=spots, vols=vols, values=values, greek=req.greek.value,
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------

from mangum import Mangum

handler = Mangum(app)
