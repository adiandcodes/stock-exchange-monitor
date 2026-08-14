# Stock Exchange Monitor

Production migration of the Replit Stock Exchange Monitor.

## Architecture
- Frontend: React + Vite → Vercel
- API: Express + Python market-data fetchers → Render (Docker)
- Data sources: Yahoo Finance / CoinGecko / ExchangeRate API
- Database package retained from the original project but not currently used by API routes.

## Environment
Frontend (Vercel): `VITE_API_URL=https://YOUR-API.onrender.com`
API (Render): `PORT` is supplied by Render.
