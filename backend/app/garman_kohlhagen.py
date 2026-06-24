import numpy as np
from scipy.stats import norm


def _d1_d2(
    S: float, K: float, T: float, r_d: float, r_f: float, sigma: float
) -> tuple[float, float]:
    d1 = (np.log(S / K) + (r_d - r_f + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return d1, d2


def price(
    S: float, K: float, T: float, r_d: float, r_f: float, sigma: float, option_type: str
) -> float:
    d1, d2 = _d1_d2(S, K, T, r_d, r_f, sigma)
    if option_type == "call":
        return float(S * np.exp(-r_f * T) * norm.cdf(d1) - K * np.exp(-r_d * T) * norm.cdf(d2))
    return float(K * np.exp(-r_d * T) * norm.cdf(-d2) - S * np.exp(-r_f * T) * norm.cdf(-d1))


def greeks(
    S: float, K: float, T: float, r_d: float, r_f: float, sigma: float, option_type: str
) -> dict:
    d1, d2 = _d1_d2(S, K, T, r_d, r_f, sigma)
    phi = norm.pdf(d1)
    sqrt_T = np.sqrt(T)
    disc_d = np.exp(-r_d * T)
    disc_f = np.exp(-r_f * T)

    if option_type == "call":
        delta = float(disc_f * norm.cdf(d1))
        theta = float(
            (-(S * disc_f * phi * sigma / (2 * sqrt_T))
             + r_f * S * disc_f * norm.cdf(d1)
             - r_d * K * disc_d * norm.cdf(d2))
            / 365
        )
        rho_d = float(K * T * disc_d * norm.cdf(d2) / 100)
        rho_f = float(-S * T * disc_f * norm.cdf(d1) / 100)
    else:
        delta = float(disc_f * (norm.cdf(d1) - 1.0))
        theta = float(
            (-(S * disc_f * phi * sigma / (2 * sqrt_T))
             - r_f * S * disc_f * norm.cdf(-d1)
             + r_d * K * disc_d * norm.cdf(-d2))
            / 365
        )
        rho_d = float(-K * T * disc_d * norm.cdf(-d2) / 100)
        rho_f = float(S * T * disc_f * norm.cdf(-d1) / 100)

    gamma = float(disc_f * phi / (S * sigma * sqrt_T))
    vega = float(S * disc_f * phi * sqrt_T / 100)

    return {
        "delta": delta,
        "gamma": gamma,
        "vega": vega,
        "theta": theta,
        "rho_d": rho_d,
        "rho_f": rho_f,
    }


def _vega_raw(
    S: float, K: float, T: float, r_d: float, r_f: float, sigma: float
) -> float:
    d1, _ = _d1_d2(S, K, T, r_d, r_f, sigma)
    return float(S * np.exp(-r_f * T) * norm.pdf(d1) * np.sqrt(T))


def implied_vol(
    market_price: float,
    S: float,
    K: float,
    T: float,
    r_d: float,
    r_f: float,
    option_type: str,
    tol: float = 1e-7,
    max_iter: int = 100,
) -> float:
    sigma = 0.2
    for _ in range(max_iter):
        p = price(S, K, T, r_d, r_f, sigma, option_type)
        v = _vega_raw(S, K, T, r_d, r_f, sigma)
        diff = p - market_price
        if abs(diff) < tol:
            return sigma
        if abs(v) < 1e-12:
            break
        sigma -= diff / v
        sigma = max(1e-6, min(sigma, 10.0))
    return sigma


def delta_to_strike(
    delta_target: float,
    S: float,
    T: float,
    r_d: float,
    r_f: float,
    sigma: float,
    option_type: str,
) -> float:
    disc_f = np.exp(-r_f * T)
    sqrt_T = np.sqrt(T)
    if option_type == "call":
        x = norm.ppf(delta_target / disc_f)
    else:
        x = norm.ppf((delta_target / disc_f) + 1.0)
    K = S * np.exp(-x * sigma * sqrt_T + (r_d - r_f + 0.5 * sigma**2) * T)
    return float(K)


def atm_strike_delta_neutral(
    S: float, T: float, r_d: float, r_f: float, sigma: float
) -> float:
    return float(S * np.exp((r_d - r_f + 0.5 * sigma**2) * T))
