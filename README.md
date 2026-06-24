# FX Volatility Surface Builder

A full-stack demo that builds and visualises FX implied volatility
surfaces from delta-space market quotes, prices FX options using
Garman-Kohlhagen, and analyses risk reversals and butterfly spreads.

- **Backend**: Python + FastAPI for the GK pricing and vol surface engine
- **Frontend**: React + Vite + TypeScript dashboard (pricer, sensitivity,
  vol surface, smile analysis, Greeks heatmap)

> **Disclaimer**: Simplified demo built for portfolio purposes. Not a
> production pricing system and should not be used for live trading or
> risk management. All market data is illustrative.

---

## Background

The FX options market quotes implied volatility in delta space rather
than strike space. Instead of quoting a volatility for each strike, the
market convention uses three instruments at each tenor:

- **ATM (at-the-money)** - the delta-neutral straddle volatility,
  representing the overall level of implied vol.
- **Risk Reversal (RR)** - the difference between the 25-delta call vol
  and the 25-delta put vol (RR = sigma_25c - sigma_25p). A negative RR
  indicates a put skew (downside protection is more expensive),
  reflecting market expectations of downside risk.
- **Butterfly (BF)** - the average of the 25-delta wing vols minus the
  ATM vol (BF = (sigma_25c + sigma_25p)/2 - sigma_ATM). A positive BF
  indicates the smile has curvature - wings are more expensive than ATM,
  reflecting demand for tail hedging.

Converting these market quotes into a continuous volatility surface
across strikes and tenors requires:

1. Recovering individual option vols from the ATM/RR/BF convention.
2. Converting delta-space quotes to strike-space using the
   Garman-Kohlhagen model.
3. Interpolating between the known points to build a smooth smile at
   each tenor.
4. Interpolating across tenors to construct the full surface.

This tool covers the full pipeline: Garman-Kohlhagen pricing with six
Greeks, delta-to-strike conversion, three interpolation methods
(polynomial, cubic spline, vanna-volga), and term structure analysis
of risk reversals and butterflies.

---

## Methodology

### 1. Garman-Kohlhagen Pricing

The Garman-Kohlhagen model extends Black-Scholes to FX options by
replacing the single risk-free rate with two rates - one for each
currency:

```
C = S * exp(-r_f * T) * N(d1) - K * exp(-r_d * T) * N(d2)
P = K * exp(-r_d * T) * N(-d2) - S * exp(-r_f * T) * N(-d1)
```

where:

```
d1 = [ln(S/K) + (r_d - r_f + sigma^2/2) * T] / (sigma * sqrt(T))
d2 = d1 - sigma * sqrt(T)
```

S is the spot FX rate, K the strike, T the time to expiry, r_d the
domestic (base currency) risk-free rate, r_f the foreign currency rate,
and sigma the implied volatility.

**Put-call parity** for FX options:

```
C - P = S * exp(-r_f * T) - K * exp(-r_d * T)
```

### 2. Greeks

Six sensitivities are computed in closed form:

| Greek | Formula | Interpretation |
|-------|---------|----------------|
| **Delta** | exp(-r_f T) N(d1) [call] | Sensitivity to spot rate |
| **Gamma** | exp(-r_f T) phi(d1) / (S sigma sqrt(T)) | Rate of change of delta |
| **Vega** | S exp(-r_f T) phi(d1) sqrt(T) / 100 | Sensitivity to 1% vol change |
| **Theta** | Time decay per calendar day | Sensitivity to passage of time |
| **Rho_d** | K T exp(-r_d T) N(d2) / 100 [call] | Sensitivity to 1% domestic rate change |
| **Rho_f** | -S T exp(-r_f T) N(d1) / 100 [call] | Sensitivity to 1% foreign rate change |

Note the two rho Greeks: rho_d (domestic rate sensitivity) and rho_f
(foreign rate sensitivity), reflecting the two-rate nature of FX options.

### 3. Market Quote Conversion

Individual option vols are recovered from the market convention:

```
sigma_25d_call = ATM + BF + RR/2
sigma_25d_put  = ATM + BF - RR/2
```

The same formula applies for 10-delta quotes when available.

### 4. Delta-to-Strike Conversion

To place the market-quoted vols on a strike axis, the GK delta formula
is inverted:

```
K = S * exp(-x * sigma * sqrt(T) + (r_d - r_f + sigma^2/2) * T)
```

where x = N_inv(delta / exp(-r_f T)) for calls. This gives the strike
corresponding to a given delta value.

### 5. Smile Interpolation

Three methods are available for building a smooth smile from the known
(strike, vol) points:

**Polynomial** - fits a polynomial (quadratic for 3 points, quartic for
5 points) through the known strike-vol pairs and evaluates on a fine
grid. Simple and transparent.

**Cubic Spline** - natural cubic spline through the known points.
Smoother than polynomial but can oscillate at the boundaries with few
data points.

**Vanna-Volga** - a market-standard method for FX that prices the
target option as a portfolio of the three liquid instruments (25d put,
ATM, 25d call) matched on vanna and volga (second-order vol
sensitivities). The vol adjustment is derived from the replicating
weights:

```
sigma(K) = sigma_ATM + x1 * (sigma_put - sigma_ATM) + x3 * (sigma_call - sigma_ATM)
```

where x1, x3 are the least-squares vanna-volga weights at strike K.

### 6. Surface Construction

The full surface is built by computing the smile at each tenor
independently, then presenting the result as a tenor x strike grid.
Each row of the vol matrix corresponds to a tenor, each column to a
strike. The smiles share a common strike grid for consistent
visualisation.

**Calendar arbitrage check**: total variance (sigma^2 * T) should be
non-decreasing in T at each strike. This is verified in the test suite.

---

## Roadmap

### Phase 1: Backend engine and API *(complete)*

FastAPI backend with Garman-Kohlhagen pricing, implied vol solver,
delta-to-strike conversion, three smile interpolation methods, full
surface construction, and sample market quotes for three currency pairs.
All endpoints tested with 44 passing pytest tests. See
[`backend/`](backend/).

### Phase 2: Full-stack local demo *(in progress)*

React + Vite + TypeScript dashboard with five tabs: Pricer, Sensitivity,
Vol Surface, Smile Analysis, and Greeks Heatmap. App shell with tab
navigation, TypeScript types mirroring backend models, and API client
are complete. Recharts line charts for smile cross-sections and term
structures, custom SVG heatmaps for the vol surface contour and Greeks
grid are next. See [`frontend/`](frontend/).

### Phase 3: AWS deployment *(planned)*

Terraform infrastructure (Lambda, API Gateway, S3, CloudFront) and a
GitHub Actions CI/CD pipeline.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sample-quotes` | Realistic demo vol quotes for a currency pair |
| POST | `/api/price` | GK option price + all 6 Greeks |
| POST | `/api/greeks-sensitivity` | Vary one parameter, return price + Greeks at each point |
| POST | `/api/vol-surface` | Build full vol surface from multi-tenor market quotes |
| POST | `/api/smile` | Single-tenor smile from delta-space quotes |
| POST | `/api/rr-bf-term-structure` | Risk reversal and butterfly values across tenors |
| POST | `/api/greeks-heatmap` | 2D grid of a selected Greek (spot x vol) |
| GET | `/api/health` | Health check |

---

## Known limitations and possible extensions

- **No SABR calibration.** The smile interpolation uses polynomial,
  cubic spline, and vanna-volga methods. Adding SABR (Stochastic Alpha
  Beta Rho) calibration would provide a parametric model widely used
  for FX vol surfaces.

- **No smile dynamics.** The surface is static - built from a single
  snapshot of market quotes. Modelling how the smile evolves over time
  (sticky strike vs sticky delta) would add a risk management
  dimension.

- **European options only.** The GK model prices European FX options.
  American-style FX options (rare in practice for vanilla FX) would
  require a binomial tree or finite difference approach.

- **No exotic pricing.** The surface could be used as an input to price
  barrier, digital, or other exotic FX options via Monte Carlo
  simulation with local or stochastic vol.

- **Simplified vanna-volga.** The implementation uses a least-squares
  approximation of the vanna-volga weights. A full first-generation
  vanna-volga method would use exact replication costs.

---

## Running locally

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Tests**
```bash
cd backend
source .venv/bin/activate
pytest
```

---

## Infrastructure

FastAPI on AWS Lambda (arm64) behind API Gateway, with the frontend on
S3 + CloudFront. Deployed via Terraform on every push to `main`. See
`infra/` *(planned)*.
