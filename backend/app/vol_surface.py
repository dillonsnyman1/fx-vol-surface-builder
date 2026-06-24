from __future__ import annotations

import numpy as np
from scipy.interpolate import CubicSpline
from scipy.stats import norm

from app.garman_kohlhagen import (
    atm_strike_delta_neutral,
    delta_to_strike,
    greeks as gk_greeks,
    price as gk_price,
)


def market_quotes_to_vols(
    atm_vol: float, rr_25: float, bf_25: float,
    rr_10: float | None = None, bf_10: float | None = None,
) -> dict:
    call_25 = atm_vol + bf_25 + rr_25 / 2
    put_25 = atm_vol + bf_25 - rr_25 / 2

    result = {
        "atm": atm_vol,
        "call_25": call_25,
        "put_25": put_25,
    }

    if rr_10 is not None and bf_10 is not None:
        result["call_10"] = atm_vol + bf_10 + rr_10 / 2
        result["put_10"] = atm_vol + bf_10 - rr_10 / 2

    return result


def _build_smile_points(
    S: float, T: float, r_d: float, r_f: float,
    atm_vol: float, rr_25: float, bf_25: float,
    rr_10: float | None, bf_10: float | None,
) -> tuple[list[float], list[float]]:
    vols = market_quotes_to_vols(atm_vol, rr_25, bf_25, rr_10, bf_10)

    K_atm = atm_strike_delta_neutral(S, T, r_d, r_f, atm_vol)
    K_25c = delta_to_strike(0.25, S, T, r_d, r_f, vols["call_25"], "call")
    K_25p = delta_to_strike(-0.25, S, T, r_d, r_f, vols["put_25"], "put")

    strikes = [K_25p, K_atm, K_25c]
    vol_values = [vols["put_25"], vols["atm"], vols["call_25"]]

    if "call_10" in vols:
        K_10c = delta_to_strike(0.10, S, T, r_d, r_f, vols["call_10"], "call")
        K_10p = delta_to_strike(-0.10, S, T, r_d, r_f, vols["put_10"], "put")
        strikes = [K_10p, K_25p, K_atm, K_25c, K_10c]
        vol_values = [vols["put_10"], vols["put_25"], vols["atm"], vols["call_25"], vols["call_10"]]

    order = np.argsort(strikes)
    strikes = [strikes[i] for i in order]
    vol_values = [vol_values[i] for i in order]

    return strikes, vol_values


def build_smile_polynomial(
    S: float, T: float, r_d: float, r_f: float,
    atm_vol: float, rr_25: float, bf_25: float,
    rr_10: float | None = None, bf_10: float | None = None,
    n_strikes: int = 50,
) -> list[dict]:
    known_strikes, known_vols = _build_smile_points(
        S, T, r_d, r_f, atm_vol, rr_25, bf_25, rr_10, bf_10,
    )

    degree = min(len(known_strikes) - 1, 4)
    coeffs = np.polyfit(known_strikes, known_vols, degree)
    poly = np.poly1d(coeffs)

    K_min = known_strikes[0] * 0.95
    K_max = known_strikes[-1] * 1.05
    strike_grid = np.linspace(K_min, K_max, n_strikes)

    K_atm = atm_strike_delta_neutral(S, T, r_d, r_f, atm_vol)
    points = []
    for K in strike_grid:
        vol = max(float(poly(K)), 0.001)
        d = gk_greeks(S, K, T, r_d, r_f, vol, "call")["delta"]
        points.append({
            "strike": float(K),
            "delta": d,
            "implied_vol": vol,
            "moneyness": float(np.log(K / S)),
        })

    return points


def build_smile_cubic_spline(
    S: float, T: float, r_d: float, r_f: float,
    atm_vol: float, rr_25: float, bf_25: float,
    rr_10: float | None = None, bf_10: float | None = None,
    n_strikes: int = 50,
) -> list[dict]:
    known_strikes, known_vols = _build_smile_points(
        S, T, r_d, r_f, atm_vol, rr_25, bf_25, rr_10, bf_10,
    )

    cs = CubicSpline(known_strikes, known_vols, bc_type="natural")

    K_min = known_strikes[0] * 0.95
    K_max = known_strikes[-1] * 1.05
    strike_grid = np.linspace(K_min, K_max, n_strikes)

    K_atm = atm_strike_delta_neutral(S, T, r_d, r_f, atm_vol)
    points = []
    for K in strike_grid:
        vol = max(float(cs(K)), 0.001)
        d = gk_greeks(S, K, T, r_d, r_f, vol, "call")["delta"]
        points.append({
            "strike": float(K),
            "delta": d,
            "implied_vol": vol,
            "moneyness": float(np.log(K / S)),
        })

    return points


def build_smile_vanna_volga(
    S: float, T: float, r_d: float, r_f: float,
    atm_vol: float, rr_25: float, bf_25: float,
    n_strikes: int = 50,
) -> list[dict]:
    vols = market_quotes_to_vols(atm_vol, rr_25, bf_25)
    sigma_atm = vols["atm"]
    sigma_25c = vols["call_25"]
    sigma_25p = vols["put_25"]

    K_atm = atm_strike_delta_neutral(S, T, r_d, r_f, sigma_atm)
    K_25c = delta_to_strike(0.25, S, T, r_d, r_f, sigma_25c, "call")
    K_25p = delta_to_strike(-0.25, S, T, r_d, r_f, sigma_25p, "put")

    def _vanna(K, sigma):
        d1 = (np.log(S / K) + (r_d - r_f + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        return -np.exp(-r_f * T) * np.sqrt(T) * norm.pdf(d1) * d2 / sigma

    def _volga(K, sigma):
        d1 = (np.log(S / K) + (r_d - r_f + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        vega = S * np.exp(-r_f * T) * norm.pdf(d1) * np.sqrt(T)
        return vega * d1 * d2 / sigma

    vanna_25p = _vanna(K_25p, sigma_atm)
    vanna_atm = _vanna(K_atm, sigma_atm)
    vanna_25c = _vanna(K_25c, sigma_atm)

    volga_25p = _volga(K_25p, sigma_atm)
    volga_atm = _volga(K_atm, sigma_atm)
    volga_25c = _volga(K_25c, sigma_atm)

    K_min = K_25p * 0.95
    K_max = K_25c * 1.05
    strike_grid = np.linspace(K_min, K_max, n_strikes)

    points = []
    for K in strike_grid:
        vanna_K = _vanna(K, sigma_atm)
        volga_K = _volga(K, sigma_atm)

        A = np.array([
            [vanna_25p, vanna_atm, vanna_25c],
            [volga_25p, volga_atm, volga_25c],
        ])
        b = np.array([vanna_K, volga_K])

        try:
            x, _, _, _ = np.linalg.lstsq(A.T, b, rcond=None)
        except np.linalg.LinAlgError:
            x = np.array([0.0, 1.0, 0.0])

        vol = sigma_atm + x[0] * (sigma_25p - sigma_atm) + x[2] * (sigma_25c - sigma_atm)
        vol = max(vol, 0.001)

        d = gk_greeks(S, float(K), T, r_d, r_f, vol, "call")["delta"]
        points.append({
            "strike": float(K),
            "delta": d,
            "implied_vol": float(vol),
            "moneyness": float(np.log(K / S)),
        })

    return points


def build_smile(
    S: float, T: float, r_d: float, r_f: float,
    atm_vol: float, rr_25: float, bf_25: float,
    rr_10: float | None = None, bf_10: float | None = None,
    interpolation_method: str = "polynomial",
    n_strikes: int = 50,
) -> list[dict]:
    if interpolation_method == "cubic_spline":
        return build_smile_cubic_spline(S, T, r_d, r_f, atm_vol, rr_25, bf_25, rr_10, bf_10, n_strikes)
    if interpolation_method == "vanna_volga":
        return build_smile_vanna_volga(S, T, r_d, r_f, atm_vol, rr_25, bf_25, n_strikes)
    return build_smile_polynomial(S, T, r_d, r_f, atm_vol, rr_25, bf_25, rr_10, bf_10, n_strikes)


def build_surface(
    spot: float, r_d: float, r_f: float,
    tenor_quotes: list[dict],
    interpolation_method: str = "polynomial",
    n_strikes: int = 50,
) -> dict:
    tenor_labels = []
    tenor_years = []
    smiles = []

    all_strikes = set()

    for tq in tenor_quotes:
        T = tq["tenor_years"]
        smile = build_smile(
            spot, T, r_d, r_f,
            tq["atm_vol"], tq["rr_25"], tq["bf_25"],
            tq.get("rr_10"), tq.get("bf_10"),
            interpolation_method, n_strikes,
        )
        tenor_labels.append(tq["tenor_label"])
        tenor_years.append(T)
        smiles.append(smile)
        for pt in smile:
            all_strikes.add(round(pt["strike"], 6))

    strikes = sorted(all_strikes)

    vol_matrix = []
    for smile in smiles:
        smile_map = {round(p["strike"], 6): p["implied_vol"] for p in smile}
        row = []
        for K in strikes:
            row.append(smile_map.get(K, 0.0))
        vol_matrix.append(row)

    smile_data = []
    for i, smile in enumerate(smiles):
        smile_data.append({
            "tenor_label": tenor_labels[i],
            "tenor_years": tenor_years[i],
            "points": smile,
        })

    return {
        "tenor_labels": tenor_labels,
        "tenor_years": tenor_years,
        "strikes": strikes,
        "vol_matrix": vol_matrix,
        "smiles": smile_data,
    }


def compute_rr_bf_term_structure(tenor_quotes: list[dict]) -> dict:
    return {
        "tenor_labels": [tq["tenor_label"] for tq in tenor_quotes],
        "tenor_years": [tq["tenor_years"] for tq in tenor_quotes],
        "atm_vols": [tq["atm_vol"] for tq in tenor_quotes],
        "rr_25": [tq["rr_25"] for tq in tenor_quotes],
        "bf_25": [tq["bf_25"] for tq in tenor_quotes],
        "rr_10": [tq.get("rr_10") for tq in tenor_quotes],
        "bf_10": [tq.get("bf_10") for tq in tenor_quotes],
    }
