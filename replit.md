# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Python**: Python 3.11 (yfinance, requests — for all data fetching)
- **External APIs**: Yahoo Finance (stocks, search, news), CoinGecko (crypto), Yahoo Finance Futures (metals)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Stock Price Analyzer (`artifacts/stock-analyzer`)
- React + Vite frontend at `/`
- Dark financial terminal aesthetic
- Features: Magnificent 7 quick access, stock search, price/change display, moving average charts (7D/30D MA), volume chart, time period filters (1M/3M/6M/1Y), quick insight badge (Uptrend/Downtrend/Momentum Shift)

### API Server (`artifacts/api-server`)
- Express 5 backend at `/api`
- `/api/stock?symbol=AAPL&period=1y` — fetches stock data via Python/yfinance subprocess
- Python script: `artifacts/api-server/src/stock_fetch.py` (copied to `dist/` during build)

## Notes

- Stock data is fetched using Python's yfinance library via Node.js `child_process.spawn`
- Indian stocks use .NS suffix (e.g., RELIANCE.NS)
- The Python script is at `src/stock_fetch.py` and gets copied to `dist/` during build
