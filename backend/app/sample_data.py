SAMPLE_QUOTES = {
    "EURUSD": {
        "pair": "EURUSD",
        "spot": 1.0900,
        "r_d": 0.0525,
        "r_f": 0.0425,
        "tenors": [
            {"tenor_label": "1W", "tenor_years": 1 / 52, "atm_vol": 0.0620, "rr_25": -0.0030, "bf_25": 0.0015, "rr_10": -0.0080, "bf_10": 0.0055},
            {"tenor_label": "2W", "tenor_years": 2 / 52, "atm_vol": 0.0650, "rr_25": -0.0035, "bf_25": 0.0018, "rr_10": -0.0090, "bf_10": 0.0060},
            {"tenor_label": "1M", "tenor_years": 1 / 12, "atm_vol": 0.0700, "rr_25": -0.0045, "bf_25": 0.0022, "rr_10": -0.0110, "bf_10": 0.0070},
            {"tenor_label": "2M", "tenor_years": 2 / 12, "atm_vol": 0.0730, "rr_25": -0.0050, "bf_25": 0.0025, "rr_10": -0.0120, "bf_10": 0.0075},
            {"tenor_label": "3M", "tenor_years": 3 / 12, "atm_vol": 0.0750, "rr_25": -0.0055, "bf_25": 0.0028, "rr_10": -0.0130, "bf_10": 0.0080},
            {"tenor_label": "6M", "tenor_years": 6 / 12, "atm_vol": 0.0780, "rr_25": -0.0065, "bf_25": 0.0032, "rr_10": -0.0150, "bf_10": 0.0090},
            {"tenor_label": "9M", "tenor_years": 9 / 12, "atm_vol": 0.0810, "rr_25": -0.0070, "bf_25": 0.0035, "rr_10": -0.0160, "bf_10": 0.0095},
            {"tenor_label": "1Y", "tenor_years": 1.0, "atm_vol": 0.0840, "rr_25": -0.0075, "bf_25": 0.0038, "rr_10": -0.0170, "bf_10": 0.0100},
        ],
    },
    "USDJPY": {
        "pair": "USDJPY",
        "spot": 155.00,
        "r_d": 0.0525,
        "r_f": 0.0010,
        "tenors": [
            {"tenor_label": "1W", "tenor_years": 1 / 52, "atm_vol": 0.0850, "rr_25": 0.0040, "bf_25": 0.0020, "rr_10": 0.0100, "bf_10": 0.0065},
            {"tenor_label": "1M", "tenor_years": 1 / 12, "atm_vol": 0.0920, "rr_25": 0.0055, "bf_25": 0.0028, "rr_10": 0.0130, "bf_10": 0.0080},
            {"tenor_label": "3M", "tenor_years": 3 / 12, "atm_vol": 0.0980, "rr_25": 0.0065, "bf_25": 0.0032, "rr_10": 0.0150, "bf_10": 0.0090},
            {"tenor_label": "6M", "tenor_years": 6 / 12, "atm_vol": 0.1020, "rr_25": 0.0075, "bf_25": 0.0038, "rr_10": 0.0170, "bf_10": 0.0100},
            {"tenor_label": "1Y", "tenor_years": 1.0, "atm_vol": 0.1080, "rr_25": 0.0085, "bf_25": 0.0042, "rr_10": 0.0190, "bf_10": 0.0110},
        ],
    },
    "GBPUSD": {
        "pair": "GBPUSD",
        "spot": 1.2700,
        "r_d": 0.0525,
        "r_f": 0.0500,
        "tenors": [
            {"tenor_label": "1W", "tenor_years": 1 / 52, "atm_vol": 0.0680, "rr_25": -0.0025, "bf_25": 0.0012, "rr_10": -0.0065, "bf_10": 0.0045},
            {"tenor_label": "1M", "tenor_years": 1 / 12, "atm_vol": 0.0750, "rr_25": -0.0040, "bf_25": 0.0020, "rr_10": -0.0095, "bf_10": 0.0060},
            {"tenor_label": "3M", "tenor_years": 3 / 12, "atm_vol": 0.0800, "rr_25": -0.0050, "bf_25": 0.0025, "rr_10": -0.0115, "bf_10": 0.0072},
            {"tenor_label": "6M", "tenor_years": 6 / 12, "atm_vol": 0.0830, "rr_25": -0.0058, "bf_25": 0.0030, "rr_10": -0.0135, "bf_10": 0.0082},
            {"tenor_label": "1Y", "tenor_years": 1.0, "atm_vol": 0.0870, "rr_25": -0.0068, "bf_25": 0.0035, "rr_10": -0.0155, "bf_10": 0.0092},
        ],
    },
}


def generate_sample_quotes(pair: str = "EURUSD") -> dict:
    return SAMPLE_QUOTES.get(pair.upper(), SAMPLE_QUOTES["EURUSD"])
