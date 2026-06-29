import pandas as pd
import pytest

from app.sample_data import fetch_live_spot, generate_sample_quotes


class _FakeTicker:
    def __init__(self, price):
        self._price = price

    def history(self, period="1d"):
        if self._price is None:
            return pd.DataFrame()
        return pd.DataFrame({"Close": [self._price]})


class TestFetchLiveSpot:
    def test_returns_rate_from_ticker(self, monkeypatch):
        monkeypatch.setattr("yfinance.Ticker", lambda sym: _FakeTicker(1.09))
        result = fetch_live_spot("EURUSD")
        assert result == pytest.approx(1.09)

    def test_uses_pair_equals_x_ticker(self, monkeypatch):
        seen = {}

        def fake_ticker(sym):
            seen["symbol"] = sym
            return _FakeTicker(1.09)

        monkeypatch.setattr("yfinance.Ticker", fake_ticker)
        fetch_live_spot("EURUSD")
        assert seen["symbol"] == "EURUSD=X"

    def test_uppercases_pair(self, monkeypatch):
        seen = {}

        def fake_ticker(sym):
            seen["symbol"] = sym
            return _FakeTicker(1.09)

        monkeypatch.setattr("yfinance.Ticker", fake_ticker)
        fetch_live_spot("eurusd")
        assert seen["symbol"] == "EURUSD=X"

    def test_returns_none_on_empty_history(self, monkeypatch):
        monkeypatch.setattr("yfinance.Ticker", lambda sym: _FakeTicker(None))
        result = fetch_live_spot("EURUSD")
        assert result is None

    def test_returns_none_on_exception(self, monkeypatch):
        def bad_ticker(sym):
            raise RuntimeError("network error")

        monkeypatch.setattr("yfinance.Ticker", bad_ticker)
        result = fetch_live_spot("EURUSD")
        assert result is None


class TestGenerateSampleQuotes:
    def test_eurusd_returns_correct_pair(self):
        data = generate_sample_quotes("EURUSD")
        assert data["pair"] == "EURUSD"

    def test_usdjpy_returns_correct_pair(self):
        data = generate_sample_quotes("USDJPY")
        assert data["pair"] == "USDJPY"

    def test_unknown_pair_falls_back_to_eurusd(self):
        data = generate_sample_quotes("XYZABC")
        assert data["pair"] == "EURUSD"

    def test_case_insensitive(self):
        data = generate_sample_quotes("eurusd")
        assert data["pair"] == "EURUSD"
