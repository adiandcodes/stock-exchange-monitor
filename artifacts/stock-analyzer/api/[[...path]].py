from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import urllib.request
import urllib.parse
import math
from datetime import datetime, timezone

UA = "Mozilla/5.0"
YAHOO = "https://query1.finance.yahoo.com"

def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())

def yahoo_chart(symbol, range_="1y", interval="1d"):
    url = f"{YAHOO}/v8/finance/chart/{urllib.parse.quote(symbol, safe='')}?range={range_}&interval={interval}&includePrePost=false"
    data = get_json(url)
    result = (data.get("chart") or {}).get("result") or []
    if not result:
        raise ValueError(f"No historical data available for symbol '{symbol}'")
    return result[0]

def stock(symbol, period="1y"):
    ranges = {"1mo":"1mo", "3mo":"3mo", "6mo":"6mo", "1y":"1y"}

    if period == "1h":
        r = yahoo_chart(symbol, "1d", "5m")
        interval = "5m"
    else:
        r = yahoo_chart(symbol, ranges.get(period, "1y"), "1d")
        interval = "1d"

    meta = r.get("meta") or {}
    timestamps = r.get("timestamp") or []
    quote = ((r.get("indicators") or {}).get("quote") or [{}])[0]

    closes = quote.get("close") or []
    volumes = quote.get("volume") or []

    rows = [
        (t, c, v)
        for t, c, v in zip(timestamps, closes, volumes)
        if c is not None
    ]

    if period == "1h":
        rows = rows[-12:]

    prices = [round(float(c), 4) for _, c, _ in rows]
    vols = [int(v) if v is not None else None for _, _, v in rows]

    if period == "1h":
        dates = [
            datetime.fromtimestamp(t, timezone.utc).strftime("%H:%M")
            for t, _, _ in rows
        ]
    else:
        dates = [
            datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%d")
            for t, _, _ in rows
        ]

    price = meta.get("regularMarketPrice") or (prices[-1] if prices else None)
    prev = (
        meta.get("chartPreviousClose")
        or meta.get("previousClose")
        or (prices[-2] if len(prices) > 1 else None)
    )

    change = round(price - prev, 4) if price is not None and prev is not None else None
    percent = round(change / prev * 100, 4) if change is not None and prev else None

    ma7 = []
    ma30 = []

    for i in range(len(prices)):
        ma7.append(
            round(sum(prices[i-6:i+1]) / 7, 4)
            if i >= 6 else None
        )
        ma30.append(
            round(sum(prices[i-29:i+1]) / 30, 4)
            if i >= 29 else None
        )

    trend = None
    if ma30 and ma30[-1] is not None and price is not None:
        trend = "Bullish" if price > ma30[-1] else "Bearish"

    momentum = "Neutral"

    if len(ma7) >= 2 and len(ma30) >= 2:
        if all(x is not None for x in [ma7[-1], ma7[-2], ma30[-1], ma30[-2]]):
            if ma7[-2] <= ma30[-2] and ma7[-1] > ma30[-1]:
                momentum = "Bullish Crossover"
            elif ma7[-2] >= ma30[-2] and ma7[-1] < ma30[-1]:
                momentum = "Bearish Crossover"

    return {
        "symbol": symbol.upper(),
        "name": meta.get("longName") or meta.get("shortName") or symbol,
        "price": price,
        "prevPrice": prev,
        "change": change,
        "percent": percent,
        "currency": meta.get("currency") or (
            "INR" if symbol.upper().endswith((".NS", ".BO")) else "USD"
        ),
        "dayHigh": meta.get("regularMarketDayHigh"),
        "dayLow": meta.get("regularMarketDayLow"),
        "weekHigh52": meta.get("fiftyTwoWeekHigh"),
        "weekLow52": meta.get("fiftyTwoWeekLow"),
        "marketCap": meta.get("marketCap"),
        "dates": dates,
        "closePrices": prices,
        "ma7": ma7,
        "ma30": ma30,
        "volume": vols,
        "insight": (
            "Momentum Shift"
            if "Crossover" in momentum
            else "Uptrend" if trend == "Bullish"
            else "Downtrend" if trend == "Bearish"
            else None
        ),
        "trend": trend,
        "volatility": None,
        "momentum": momentum,
        "benchmarkSymbol": None,
        "benchmarkDates": [],
        "benchmarkPrices": [],
    }

def search(q):
    url = (
        f"{YAHOO}/v1/finance/search?q={urllib.parse.quote(q)}"
        "&lang=en-US&region=US&quotesCount=8&newsCount=0"
        "&enableFuzzyQuery=true&enableCb=false&enableNavLinks=false"
    )

    data = get_json(url)
    results = []
    seen = set()

    for item in data.get("quotes", []):
        symbol = item.get("symbol", "")

        if (
            not symbol
            or symbol in seen
            or item.get("quoteType") in {"FUTURE", "CURRENCY", "OPTION"}
        ):
            continue

        seen.add(symbol)

        results.append({
            "symbol": symbol,
            "name": item.get("longname") or item.get("shortname") or symbol,
            "exchange": item.get("exchDisp") or item.get("exchange") or "",
            "type": item.get("quoteType", ""),
        })

        if len(results) >= 5:
            break

    return {"results": results}

def crypto():
    ids = [
        "bitcoin", "ethereum", "tether", "binancecoin", "solana",
        "ripple", "usd-coin", "staked-ether", "dogecoin", "cardano",
        "tron", "avalanche-2", "shiba-inu", "polkadot", "chainlink",
        "bitcoin-cash", "near", "uniswap", "litecoin",
        "internet-computer"
    ]

    params = urllib.parse.urlencode({
        "vs_currency": "usd",
        "ids": ",".join(ids),
        "order": "market_cap_desc",
        "per_page": len(ids),
        "page": 1,
        "sparkline": "false",
        "price_change_percentage": "24h",
    })

    data = get_json(
        f"https://api.coingecko.com/api/v3/coins/markets?{params}"
    )

    return {
        "coins": [
            {
                "id": c.get("id", ""),
                "symbol": (c.get("symbol") or "").upper(),
                "name": c.get("name", ""),
                "price": c.get("current_price") or 0,
                "change24h": c.get("price_change_percentage_24h"),
                "marketCap": c.get("market_cap"),
                "volume24h": c.get("total_volume"),
                "image": c.get("image"),
            }
            for c in data
        ]
    }

def news(symbol):
    q = urllib.parse.quote(symbol or "stock market")

    data = get_json(
        f"{YAHOO}/v1/finance/search?q={q}"
        "&lang=en-US&region=US&quotesCount=0&newsCount=10"
    )

    articles = []

    for n in data.get("news", [])[:10]:
        thumb = None

        resolutions = (
            (n.get("thumbnail") or {}).get("resolutions")
            or []
        )

        if resolutions:
            thumb = resolutions[0].get("url")

        articles.append({
            "title": n.get("title", ""),
            "publisher": n.get("publisher", ""),
            "link": n.get("link", ""),
            "publishedAt": n.get("providerPublishTime", ""),
            "thumbnail": thumb,
        })

    return {"articles": articles}

def movers():
    symbols = [
        "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA",
        "JPM", "V", "JNJ", "WMT", "UNH", "XOM", "PG", "MA",
        "HD", "CVX", "MRK", "ABBV", "PFE", "BAC", "KO", "CSCO",
        "ORCL", "ADBE", "NFLX", "CRM", "AMD", "INTC", "QCOM",
    ]

    results = []

    for symbol in symbols:
        try:
            data = yahoo_chart(symbol, "2d", "1d")

            meta = data.get("meta") or {}

            quote = (
                (data.get("indicators") or {})
                .get("quote", [{}])[0]
            )

            closes = [
                x for x in (quote.get("close") or [])
                if x is not None
            ]

            price = meta.get("regularMarketPrice")

            prev = (
                meta.get("chartPreviousClose")
                or meta.get("previousClose")
            )

            if price is None and closes:
                price = closes[-1]

            if prev is None and len(closes) >= 2:
                prev = closes[-2]

            if price is None or prev in (None, 0):
                continue

            change = price - prev
            percent = (change / prev) * 100

            results.append({
                "symbol": symbol,
                "name": (
                    meta.get("longName")
                    or meta.get("shortName")
                    or symbol
                ),
                "price": round(float(price), 4),
                "change": round(float(change), 4),
                "percent": round(float(percent), 4),
                "currency": meta.get("currency") or "USD",
            })

        except Exception:
            # Skip an individual symbol if Yahoo temporarily
            # fails for that symbol.
            continue

    results.sort(
        key=lambda x: x["percent"],
        reverse=True
    )

    return {
        "gainers": results[:3],
        "losers": sorted(
            results,
            key=lambda x: x["percent"]
        )[:3],
    }


def metals():
    definitions = [
        ("GC=F", "Gold", "troy oz"),
        ("SI=F", "Silver", "troy oz"),
        ("PL=F", "Platinum", "troy oz"),
        ("HG=F", "Copper", "lb"),
    ]

    results = []

    for symbol, name, unit in definitions:
        try:
            meta = yahoo_chart(symbol, "5d", "1d").get("meta") or {}

            price = meta.get("regularMarketPrice")
            prev = meta.get("chartPreviousClose") or meta.get("previousClose")

            change = (
                round(price - prev, 4)
                if price is not None and prev is not None
                else None
            )

            results.append({
                "symbol": symbol,
                "name": name,
                "price": price,
                "change": change,
                "percent": (
                    round(change / prev * 100, 4)
                    if change is not None and prev
                    else None
                ),
                "currency": meta.get("currency", "USD"),
                "unit": unit,
            })
        except Exception:
            results.append({
                "symbol": symbol,
                "name": name,
                "price": None,
                "change": None,
                "percent": None,
                "currency": "USD",
                "unit": unit,
            })

    return {"metals": results}

class handler(BaseHTTPRequestHandler):

    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "s-maxage=60, stale-while-revalidate=300")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            path = parsed.path
            query = parse_qs(parsed.query)

            if path.endswith("/search"):
                q = query.get("q", [""])[0]
                self.send_json(200, search(q))

            elif path.endswith("/stock"):
                symbol = query.get("symbol", [""])[0]
                period = query.get("period", ["1y"])[0]

                if not symbol:
                    self.send_json(400, {
                        "error": "invalid_symbol",
                        "message": "Stock symbol cannot be empty"
                    })
                    return

                self.send_json(200, stock(symbol.upper(), period))

            elif path.endswith("/crypto"):
                self.send_json(200, crypto())

            elif path.endswith("/news"):
                symbol = query.get("symbol", [""])[0]
                self.send_json(200, news(symbol))

            elif path.endswith("/metals"):
                self.send_json(200, metals())

            elif path.endswith("/movers"):
                self.send_json(200, movers())

            else:
                self.send_json(404, {
                    "error": "not_found",
                    "message": "API route not found"
                })

        except Exception as e:
            self.send_json(500, {
                "error": "server_error",
                "message": str(e)
            })
