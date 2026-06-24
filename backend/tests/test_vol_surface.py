import pytest

from app.vol_surface import (
    build_smile,
    build_surface,
    compute_rr_bf_term_structure,
    market_quotes_to_vols,
)

S = 1.09
R_D = 0.0525
R_F = 0.0425
T = 0.25
ATM = 0.075
RR_25 = -0.005
BF_25 = 0.0025
RR_10 = -0.013
BF_10 = 0.008

SAMPLE_TENORS = [
    {"tenor_label": "1M", "tenor_years": 1 / 12, "atm_vol": 0.070, "rr_25": -0.0045, "bf_25": 0.0022, "rr_10": -0.011, "bf_10": 0.007},
    {"tenor_label": "3M", "tenor_years": 3 / 12, "atm_vol": 0.075, "rr_25": -0.0055, "bf_25": 0.0028, "rr_10": -0.013, "bf_10": 0.008},
    {"tenor_label": "6M", "tenor_years": 6 / 12, "atm_vol": 0.078, "rr_25": -0.0065, "bf_25": 0.0032, "rr_10": -0.015, "bf_10": 0.009},
    {"tenor_label": "1Y", "tenor_years": 1.0, "atm_vol": 0.084, "rr_25": -0.0075, "bf_25": 0.0038, "rr_10": -0.017, "bf_10": 0.010},
]


class TestMarketQuotesToVols:
    def test_basic_conversion(self):
        vols = market_quotes_to_vols(ATM, RR_25, BF_25)
        expected_call = ATM + BF_25 + RR_25 / 2
        expected_put = ATM + BF_25 - RR_25 / 2
        assert vols["call_25"] == pytest.approx(expected_call)
        assert vols["put_25"] == pytest.approx(expected_put)
        assert vols["atm"] == ATM

    def test_zero_rr_gives_equal_wings(self):
        vols = market_quotes_to_vols(ATM, 0.0, BF_25)
        assert vols["call_25"] == pytest.approx(vols["put_25"])

    def test_zero_bf_zero_rr_gives_flat(self):
        vols = market_quotes_to_vols(ATM, 0.0, 0.0)
        assert vols["call_25"] == pytest.approx(ATM)
        assert vols["put_25"] == pytest.approx(ATM)

    def test_ten_delta_included_when_provided(self):
        vols = market_quotes_to_vols(ATM, RR_25, BF_25, RR_10, BF_10)
        assert "call_10" in vols
        assert "put_10" in vols

    def test_ten_delta_excluded_when_none(self):
        vols = market_quotes_to_vols(ATM, RR_25, BF_25)
        assert "call_10" not in vols
        assert "put_10" not in vols


class TestSmileConstruction:
    @pytest.mark.parametrize("method", ["polynomial", "cubic_spline", "vanna_volga"])
    def test_all_vols_positive(self, method):
        points = build_smile(S, T, R_D, R_F, ATM, RR_25, BF_25,
                             RR_10 if method != "vanna_volga" else None,
                             BF_10 if method != "vanna_volga" else None,
                             method)
        for pt in points:
            assert pt["implied_vol"] > 0, f"Negative vol at strike {pt['strike']}"

    @pytest.mark.parametrize("method", ["polynomial", "cubic_spline"])
    def test_correct_number_of_points(self, method):
        points = build_smile(S, T, R_D, R_F, ATM, RR_25, BF_25,
                             RR_10, BF_10, method, n_strikes=40)
        assert len(points) == 40

    def test_smile_has_put_skew_with_negative_rr(self):
        points = build_smile(S, T, R_D, R_F, ATM, RR_25, BF_25,
                             RR_10, BF_10, "polynomial")
        low_strike_vol = points[0]["implied_vol"]
        high_strike_vol = points[-1]["implied_vol"]
        assert low_strike_vol > high_strike_vol

    def test_strikes_are_sorted(self):
        points = build_smile(S, T, R_D, R_F, ATM, RR_25, BF_25,
                             RR_10, BF_10, "polynomial")
        strikes = [pt["strike"] for pt in points]
        assert strikes == sorted(strikes)


class TestSurface:
    def test_correct_number_of_tenors(self):
        result = build_surface(S, R_D, R_F, SAMPLE_TENORS, "polynomial", 30)
        assert len(result["tenor_labels"]) == 4
        assert len(result["smiles"]) == 4

    def test_vol_matrix_shape(self):
        result = build_surface(S, R_D, R_F, SAMPLE_TENORS, "polynomial", 30)
        assert len(result["vol_matrix"]) == 4
        for row in result["vol_matrix"]:
            assert len(row) == len(result["strikes"])

    def test_all_vols_positive_in_surface(self):
        result = build_surface(S, R_D, R_F, SAMPLE_TENORS, "polynomial", 30)
        for smile in result["smiles"]:
            for pt in smile["points"]:
                assert pt["implied_vol"] > 0

    def test_no_calendar_arbitrage(self):
        result = build_surface(S, R_D, R_F, SAMPLE_TENORS, "polynomial", 30)
        for smile in result["smiles"]:
            mid_idx = len(smile["points"]) // 2
            mid_strike = smile["points"][mid_idx]["strike"]
            break

        total_variances = []
        for i, smile in enumerate(result["smiles"]):
            T_i = result["tenor_years"][i]
            closest = min(smile["points"], key=lambda p: abs(p["strike"] - mid_strike))
            total_variances.append(closest["implied_vol"] ** 2 * T_i)

        for i in range(1, len(total_variances)):
            assert total_variances[i] >= total_variances[i - 1] - 1e-6


class TestRRBFTermStructure:
    def test_correct_length(self):
        result = compute_rr_bf_term_structure(SAMPLE_TENORS)
        assert len(result["tenor_labels"]) == 4
        assert len(result["rr_25"]) == 4
        assert len(result["bf_25"]) == 4

    def test_values_match_input(self):
        result = compute_rr_bf_term_structure(SAMPLE_TENORS)
        for i, tq in enumerate(SAMPLE_TENORS):
            assert result["atm_vols"][i] == tq["atm_vol"]
            assert result["rr_25"][i] == tq["rr_25"]
            assert result["bf_25"][i] == tq["bf_25"]
