# Stock Exchange Monitor — Portable Deployment Handoff

This document describes the current application as it exists in the Replit
project. The existing frontend, Express API, generated API libraries, database
library, and Python fetchers are preserved. The only portability helper added
for this handoff is `scripts/local-proxy.mjs`, which provides the `/api`
reverse-proxy behavior that Replit normally supplies between the frontend and
backend services.

## 1. Architecture

```text
Browser
  |
  | relative requests such as /api/stock
  v
scripts/local-proxy.mjs
  |-- /api/* --> Express API server
  |                 |
  |                 | spawns python3 for market data
  |                 v
  |              Yahoo Finance / CoinGecko
  |
  `-- all other paths --> Vite frontend
```

### Frontend

- Package: `@workspace/stock-analyzer`
- Entry point: `artifacts/stock-analyzer/src/main.tsx`
- React entry code mounts `App` with `createRoot`: `artifacts/stock-analyzer/src/main.tsx`
- Browser route `/` renders `Home`: `artifacts/stock-analyzer/src/App.tsx`
- Vite configuration: `artifacts/stock-analyzer/vite.config.ts`

### Backend

- Package: `@workspace/api-server`
- Entry point: `artifacts/api-server/src/index.ts`
- Framework: Express 5
- API base path: `/api`
- Python subprocesses are launched by route handlers using `spawn("python3", ...)`.
- Build output: `artifacts/api-server/dist`

### Shared libraries

- React Query client: `lib/api-client-react`
- Zod schemas: `lib/api-zod`
- OpenAPI source: `lib/api-spec/openapi.yaml`
- Drizzle/PostgreSQL library: `lib/db`

The API contract is generated from OpenAPI using
`pnpm --filter @workspace/api-spec run codegen`. The Orval configuration writes
React Query and Zod output into the two generated libraries:
`lib/api-spec/orval.config.ts`.

## 2. Windows prerequisites

Install the following:

1. Node.js 24 or newer.
2. pnpm 10 or newer.
3. Python 3.11 or newer.
4. Git, if cloning the repository.

Confirm the installations from PowerShell:

```powershell
node --version
corepack --version
python --version
python3 --version
pnpm --version
```

The backend currently invokes the executable name `python3`. On Windows,
ensure that `python3` resolves in `PATH`. If the Python installer provides only
`py.exe` and `python.exe`, create a small `python3.bat` wrapper outside the
repository containing:

```bat
@echo off
py -3.11 %*
```

Put the directory containing that wrapper on `PATH`, then confirm:

```powershell
python3 --version
```

This avoids changing the application’s existing subprocess behavior.

## 3. Installation

From the repository root:

```powershell
corepack enable
pnpm install --frozen-lockfile
python -m pip install "numpy>=2.4.4" "pandas>=3.0.2" "yfinance>=1.2.2"
```

The Node workspace uses pnpm. The root package explicitly rejects npm and yarn
during installation, and the Python dependency versions come from
`pyproject.toml`.

No API key is currently required by the market-data fetchers. Yahoo Finance
and CoinGecko are accessed through their public endpoints/libraries.

## 4. Environment variables

Copy the example file:

```powershell
Copy-Item .env.example .env
```

The current source does not automatically load `.env` files. Set variables in
each PowerShell process before starting that process, or use a compatible
environment loader.

### Required for the frontend process

```text
PORT
BASE_PATH
```

For local standalone use:

```text
PORT=5173
BASE_PATH=/
```

The Vite configuration throws if either value is absent:
`artifacts/stock-analyzer/vite.config.ts`.

### Required for the API process

```text
PORT
```

For local use:

```text
PORT=8080
```

The Express entrypoint reads and validates `PORT`:
`artifacts/api-server/src/index.ts`.

### Optional variables

- `NODE_ENV`: the API development script sets this to `development`; use
  `production` for a production build/start.
- `LOG_LEVEL`: API logger level; defaults to `info`.
- `REPL_ID`: only used to conditionally enable Replit cartographer and dev-banner
  plugins. Leave it unset outside Replit.
- `DATABASE_URL`: required only when importing `@workspace/db` or running
  Drizzle database commands. The current API route tree does not import the DB
  library.

No `SESSION_SECRET` use was found in the current application source, so it is
not required for the current stock application.

## 5. Development mode on Windows

Use four PowerShell windows from the repository root.

### Window 1 — API server

```powershell
$env:PORT="8080"
$env:NODE_ENV="development"
pnpm --filter @workspace/api-server run dev
```

The API package’s development script builds the server and then starts
`dist/index.mjs`.

### Window 2 — frontend

```powershell
$env:PORT="5173"
$env:BASE_PATH="/"
$env:NODE_ENV="development"
pnpm --filter @workspace/stock-analyzer run dev
```

### Window 3 — local proxy

```powershell
$env:PROXY_PORT="3000"
$env:API_ORIGIN="http://127.0.0.1:8080"
$env:FRONTEND_ORIGIN="http://127.0.0.1:5173"
node scripts/local-proxy.mjs
```

Open:

```text
http://127.0.0.1:3000/
```

Use the proxy URL rather than the Vite port directly. The frontend emits
relative `/api/...` requests, so the proxy is what sends them to Express.

## 6. Production build and start

### Build the API

```powershell
$env:NODE_ENV="production"
pnpm --filter @workspace/api-server run build
```

This bundles the Express entrypoint and copies all six Python fetchers into
`artifacts/api-server/dist`:

- `stock_fetch.py`
- `movers_fetch.py`
- `news_fetch.py`
- `metals_fetch.py`
- `crypto_fetch.py`
- `search_fetch.py`

### Build the frontend

```powershell
$env:PORT="5173"
$env:BASE_PATH="/"
$env:NODE_ENV="production"
pnpm --filter @workspace/stock-analyzer run build
```

The frontend build is written to:

```text
artifacts/stock-analyzer/dist/public
```

### Start the API in production

```powershell
$env:PORT="8080"
$env:NODE_ENV="production"
pnpm --filter @workspace/api-server run start
```

### Serve the built frontend

In a separate PowerShell window:

```powershell
$env:PORT="5173"
$env:BASE_PATH="/"
$env:NODE_ENV="production"
pnpm --filter @workspace/stock-analyzer run serve
```

Then start the same local proxy:

```powershell
$env:PROXY_PORT="3000"
$env:API_ORIGIN="http://127.0.0.1:8080"
$env:FRONTEND_ORIGIN="http://127.0.0.1:5173"
node scripts/local-proxy.mjs
```

The production browser URL is:

```text
http://127.0.0.1:3000/
```

## 7. API endpoint reference

All API URLs below are relative to `/api`.

### `GET /api/healthz`

Purpose: health check.

Response:

```json
{
  "status": "ok"
}
```

### `GET /api/stock`

Parameters:

- `symbol` — required stock ticker, for example `AAPL` or `RELIANCE.NS`.
- `period` — optional; one of `1h`, `1mo`, `3mo`, `6mo`, or `1y`. Defaults to `1y`.

Example:

```text
/api/stock?symbol=AAPL&period=1mo
```

The response contains symbol metadata, current/previous price, change,
historical dates and closes, moving averages, volume, trend/insight fields,
and benchmark data. The exact schema is in
`lib/api-spec/openapi.yaml` under `StockData`.

### `GET /api/resolve`

Parameters:

- `query` — required company name or known symbol.

Example:

```text
/api/resolve?query=apple
```

Success response:

```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "confidence": "exact"
}
```

Unknown symbols return HTTP 404 with an `error` and `message` object.

### `GET /api/movers`

No parameters.

Response shape:

```json
{
  "gainers": [],
  "losers": []
}
```

The arrays contain symbol, name, price, change, percent, and currency fields.

### `GET /api/search`

Parameters:

- `q` — required search text.

Example:

```text
/api/search?q=Apple
```

Response shape:

```json
{
  "results": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "exchange": "NMS",
      "type": "EQUITY"
    }
  ]
}
```

### `GET /api/news`

Parameters:

- `symbol` — optional stock symbol. Omit it for general market news.

Example:

```text
/api/news?symbol=AAPL
```

Response shape:

```json
{
  "articles": [
    {
      "title": "...",
      "publisher": "...",
      "link": "...",
      "publishedAt": "...",
      "thumbnail": "..."
    }
  ]
}
```

### `GET /api/crypto`

Parameters:

- `ids` — optional comma-separated CoinGecko IDs. Omit for the default top-20
  list.

Example:

```text
/api/crypto?ids=bitcoin,ethereum
```

Response shape:

```json
{
  "coins": [
    {
      "id": "bitcoin",
      "symbol": "BTC",
      "name": "Bitcoin",
      "price": 0,
      "change24h": 0,
      "marketCap": 0,
      "volume24h": 0,
      "image": "..."
    }
  ]
}
```

### `GET /api/metals`

No parameters.

Response shape:

```json
{
  "metals": [
    {
      "symbol": "GC=F",
      "name": "Gold",
      "price": 0,
      "change": 0,
      "percent": 0,
      "currency": "USD",
      "unit": "troy oz"
    }
  ]
}
```

## 8. External services

### Yahoo Finance

Used by:

- `artifacts/api-server/src/stock_fetch.py`
- `artifacts/api-server/src/movers_fetch.py`
- `artifacts/api-server/src/news_fetch.py`
- `artifacts/api-server/src/metals_fetch.py`
- `artifacts/api-server/src/search_fetch.py`

The first four use `yfinance`. Symbol search directly requests Yahoo Finance’s
search endpoint.

### CoinGecko

`artifacts/api-server/src/crypto_fetch.py` requests
`https://api.coingecko.com/api/v3/coins/markets`.

### ExchangeRate-API

The frontend currency hook directly requests:

```text
https://api.exchangerate-api.com/v4/latest/USD
```

No API key is configured in the current source.

## 9. Verification commands

### Workspace typecheck

```powershell
pnpm run typecheck
```

### Full package build

```powershell
pnpm run build
```

### API smoke tests

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/healthz
Invoke-RestMethod "http://127.0.0.1:3000/api/stock?symbol=AAPL&period=1mo"
Invoke-RestMethod http://127.0.0.1:3000/api/movers
Invoke-RestMethod "http://127.0.0.1:3000/api/news?symbol=AAPL"
Invoke-RestMethod "http://127.0.0.1:3000/api/crypto"
Invoke-RestMethod http://127.0.0.1:3000/api/metals
Invoke-RestMethod "http://127.0.0.1:3000/api/search?q=Apple"
Invoke-RestMethod "http://127.0.0.1:3000/api/resolve?query=apple"
```

### Frontend smoke test

```powershell
(Invoke-WebRequest http://127.0.0.1:3000/).StatusCode
```

Then open `http://127.0.0.1:3000/` in a browser and verify that the stock
search, chart, movers, news, crypto, metals, and watchlist views load.

### Verification results for this handoff

The following checks were run after installing with
`pnpm install --frozen-lockfile`:

- Python imports for `numpy`, `pandas`, and `yfinance`: **passed**.
- `node --check scripts/local-proxy.mjs`: **passed**.
- API package typecheck: **passed**.
- Mockup-sandbox typecheck: **passed**.
- Scripts package typecheck: **passed**.
- API production build: **passed**; all six Python fetchers were copied into
  `artifacts/api-server/dist`.
- Frontend production build with `PORT=5173 BASE_PATH=/`: **passed**.
- Local proxy frontend smoke test: **passed** with HTTP 200.
- Local proxy health check: **passed** with `{"status":"ok"}`.
- Replit-proxy API smoke tests for `/healthz`, `/stock`, `/movers`, `/news`,
  `/crypto`, `/metals`, `/search`, and `/resolve`: **all returned HTTP 200**.

The root `pnpm run typecheck` and root `pnpm run build` commands currently
remain **blocked by pre-existing frontend TypeScript errors** in the untouched
application. The exact errors are:

```text
CryptoTab.tsx(54,7): TS2741 — queryKey missing
MetalsTab.tsx(31,5): TS2741 — queryKey missing
NewsPanel.tsx(29,7): TS2741 — queryKey missing
ShareInsightCard.tsx(4,27): TS2307 — cannot resolve
  @workspace/api-client-react/src/generated/api.schemas
StockChart.tsx(14,27): TS2307 — cannot resolve
  @workspace/api-client-react/src/generated/api.schemas
StockChart.tsx(60,44): TS7006 — dateStr implicitly any
StockChart.tsx(60,53): TS7006 — i implicitly any
StockChart.tsx(85,29): TS7006 — d implicitly any
StockChart.tsx(85,32): TS7006 — i implicitly any
StockSnapshot.tsx(1,27): TS2307 — cannot resolve
  @workspace/api-client-react/src/generated/api.schemas
StockSnapshot.tsx(69,20): TS2322 — ROWS key can include symbol
TrendSummary.tsx(1,27): TS2307 — cannot resolve
  @workspace/api-client-react/src/generated/api.schemas
```

Affected files are under
`artifacts/stock-analyzer/src/components/`. The generated package already
exports these schemas from `@workspace/api-client-react`, so the import errors
can be fixed by using that public package export rather than its private
source path. The query-hook errors can be fixed by passing each generated
query key through the hook’s nested `query.queryKey` option (or by updating
the generated hook typings). The implicit-`any` errors then need explicit
callback parameter types, and `StockSnapshot` needs a string-only row-key type.
Those application changes were intentionally not applied in this portability
handoff.

The first standalone frontend build attempt without `PORT` failed exactly as
the current Vite configuration requires:

```text
Error: PORT environment variable is required but was not provided.
```

Rerunning it with `PORT=5173 BASE_PATH=/ NODE_ENV=production` passed. Vite
reported a non-blocking sourcemap warning for
`src/components/ui/tooltip.tsx` and a non-blocking warning that the generated
JavaScript chunk is larger than 500 kB.

## 10. Replit-specific dependencies and portability status

The application currently contains these Replit-specific pieces:

- `.replit` and `.replit-artifact/artifact.toml` workflow metadata.
- Replit’s shared proxy, which normally maps `/api` to the API service.
- `@replit/vite-plugin-runtime-error-modal`, imported by the frontend Vite
  configuration.
- Conditional cartographer and dev-banner plugins, enabled only when
  `REPL_ID` is present.
- Replit-specific port/base-path environment injection in artifact workflows.

They are not required for the source package itself when using the local proxy
instructions in this document. The existing Vite dependency list still
contains the Replit plugins because this handoff preserves the working
application unchanged.

### Can it run completely outside Replit?

**Yes, with the included local proxy and the prerequisites above.** The
application source itself does not require a Replit database or Replit
authentication. The local proxy replaces the path-routing behavior that
Replit normally provides.

The main portability warning is the literal `python3` subprocess name on
Windows. Ensure that command resolves before starting the API.

The PostgreSQL library is present for workspace compatibility, but the current
API routes do not use it. Set `DATABASE_URL` only when using
`@workspace/db` or Drizzle commands.

## 11. Handoff summary

- **Frontend entry:** `artifacts/stock-analyzer/src/main.tsx`
- **Backend entry:** `artifacts/api-server/src/index.ts`
- **Python fetchers:** `stock_fetch.py`, `movers_fetch.py`, `news_fetch.py`,
  `metals_fetch.py`, `crypto_fetch.py`, `search_fetch.py`
- **Package manager:** pnpm
- **Install:** `pnpm install --frozen-lockfile` plus the Python install command
  in section 3
- **Development:** API, frontend, and `scripts/local-proxy.mjs` commands in
  section 5
- **Production build:** API and frontend commands in section 6
- **Production start:** API, frontend preview, and local proxy commands in
  section 6
- **Required runtime variables:** `PORT` for each process and `BASE_PATH` for
  the frontend
- **Optional operational variable:** `DATABASE_URL` for database tooling
- **External services:** Yahoo Finance, CoinGecko, and ExchangeRate-API
- **Known warnings:** Windows must resolve `python3`; the frontend/backend
  require a proxy when run on separate local ports