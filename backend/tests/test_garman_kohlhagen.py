import numpy as np
import pytest

from app.garman_kohlhagen import (
    atm_strike_delta_neutral,
    delta_to_strike,
    greeks,
    implied_vol,
    price,
)

S = 1.09
K = 1.09
T = 0.25
R_D = 0.0525
R_F = 0.0425
SIGMA = 0.075


class TestGKPrice:
    def test_price_nonnegative_call(self):
        assert price(S, K, T, R_D, R_F, SIGMA, "call") >= 0

    def test_price_nonnegative_put(self):
        assert price(S, K, T, R_D, R_F, SIGMA, "put") >= 0

    def test_put_call_parity(self):
        c = price(S, K, T, R_D, R_F, SIGMA, "call")
        p = price(S, K, T, R_D, R_F, SIGMA, "put")
        expected = S * np.exp(-R_F * T) - K * np.exp(-R_D * T)
        assert c - p == pytest.approx(expected, abs=1e-10)

    def test_reduces_to_bs_when_rf_zero(self):
        from scipy.stats import norm
        r = 0.05
        s, k, t, sigma = 100.0, 100.0, 1.0, 0.20
        gk_price = price(s, k, t, r, 0.0, sigma, "call")
        d1 = (np.log(s / k) + (r + 0.5 * sigma**2) * t) / (sigma * np.sqrt(t))
        d2 = d1 - sigma * np.sqrt(t)
        bs_price = s * norm.cdf(d1) - k * np.exp(-r * t) * norm.cdf(d2)
        assert gk_price == pytest.approx(bs_price, rel=1e-10)

    def test_deep_itm_call_approaches_intrinsic(self):
        deep_S = 2.0
        deep_K = 1.0
        p = price(deep_S, deep_K, 0.01, R_D, R_F, 0.01, "call")
        intrinsic = deep_S * np.exp(-R_F * 0.01) - deep_K * np.exp(-R_D * 0.01)
        assert p == pytest.approx(intrinsic, rel=0.01)

    def test_known_value(self):
        p = price(S, K, T, R_D, R_F, SIGMA, "call")
        assert p > 0
        assert p < S


class TestGKGreeks:
    def test_call_delta_range(self):
        g = greeks(S, K, T, R_D, R_F, SIGMA, "call")
        disc_f = np.exp(-R_F * T)
        assert 0 < g["delta"] < disc_f

    def test_put_delta_range(self):
        g = greeks(S, K, T, R_D, R_F, SIGMA, "put")
        disc_f = np.exp(-R_F * T)
        assert -disc_f < g["delta"] < 0

    def test_gamma_positive(self):
        for opt in ("call", "put"):
            g = greeks(S, K, T, R_D, R_F, SIGMA, opt)
            assert g["gamma"] > 0

    def test_gamma_same_for_call_and_put(self):
        gc = greeks(S, K, T, R_D, R_F, SIGMA, "call")
        gp = greeks(S, K, T, R_D, R_F, SIGMA, "put")
        assert gc["gamma"] == pytest.approx(gp["gamma"], rel=1e-10)

    def test_vega_positive(self):
        for opt in ("call", "put"):
            g = greeks(S, K, T, R_D, R_F, SIGMA, opt)
            assert g["vega"] > 0

    def test_vega_same_for_call_and_put(self):
        gc = greeks(S, K, T, R_D, R_F, SIGMA, "call")
        gp = greeks(S, K, T, R_D, R_F, SIGMA, "put")
        assert gc["vega"] == pytest.approx(gp["vega"], rel=1e-10)

    def test_rho_d_signs(self):
        gc = greeks(S, K, T, R_D, R_F, SIGMA, "call")
        gp = greeks(S, K, T, R_D, R_F, SIGMA, "put")
        assert gc["rho_d"] > 0
        assert gp["rho_d"] < 0

    def test_rho_f_signs(self):
        gc = greeks(S, K, T, R_D, R_F, SIGMA, "call")
        gp = greeks(S, K, T, R_D, R_F, SIGMA, "put")
        assert gc["rho_f"] < 0
        assert gp["rho_f"] > 0


class TestImpliedVol:
    @pytest.mark.parametrize("sigma", [0.05, 0.075, 0.10, 0.15])
    def test_roundtrip_call(self, sigma):
        p = price(S, K, T, R_D, R_F, sigma, "call")
        recovered = implied_vol(p, S, K, T, R_D, R_F, "call")
        assert recovered == pytest.approx(sigma, abs=1e-5)

    @pytest.mark.parametrize("sigma", [0.05, 0.075, 0.10, 0.15])
    def test_roundtrip_put(self, sigma):
        p = price(S, K, T, R_D, R_F, sigma, "put")
        recovered = implied_vol(p, S, K, T, R_D, R_F, "put")
        assert recovered == pytest.approx(sigma, abs=1e-5)

    def test_deep_otm_call(self):
        p = price(S, 1.30, T, R_D, R_F, 0.10, "call")
        recovered = implied_vol(p, S, 1.30, T, R_D, R_F, "call")
        assert recovered == pytest.approx(0.10, abs=1e-3)


class TestDeltaToStrike:
    def test_atm_delta_maps_to_atm_strike(self):
        K_atm = atm_strike_delta_neutral(S, T, R_D, R_F, SIGMA)
        g = greeks(S, K_atm, T, R_D, R_F, SIGMA, "call")
        K_recovered = delta_to_strike(g["delta"], S, T, R_D, R_F, SIGMA, "call")
        assert K_recovered == pytest.approx(K_atm, rel=1e-4)

    def test_higher_delta_call_means_lower_strike(self):
        K_high = delta_to_strike(0.75, S, T, R_D, R_F, SIGMA, "call")
        K_low = delta_to_strike(0.25, S, T, R_D, R_F, SIGMA, "call")
        assert K_high < K_low

    def test_roundtrip(self):
        K_test = delta_to_strike(0.25, S, T, R_D, R_F, SIGMA, "call")
        g = greeks(S, K_test, T, R_D, R_F, SIGMA, "call")
        K_back = delta_to_strike(g["delta"], S, T, R_D, R_F, SIGMA, "call")
        assert K_back == pytest.approx(K_test, rel=1e-4)
