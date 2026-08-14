#!/usr/bin/env python3
import sys
import json
import yfinance as yf
import pandas as pd
import numpy as np


def get_stock_data(symbol: str, period: str = "1y") -> dict:
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        name = info.get("longName") or info.get("shortName") or symbol
        price = info.get("currentPrice") or info.get("regularMarketPrice")
        prev_price = info.get("previousClose") or info.get("regularMarketPreviousClose")
        currency = info.get("currency") or ("INR" if symbol.upper().endswith(".NS") else "USD")

        # Snapshot fields
        day_high = info.get("dayHigh") or info.get("regularMarketDayHigh")
        day_low = info.get("dayLow") or info.get("regularMarketDayLow")
        week_high_52 = info.get("fiftyTwoWeekHigh")
        week_low_52 = info.get("fiftyTwoWeekLow")
        market_cap = info.get("marketCap")

        change = None
        percent = None
        if price is not None and prev_price is not None:
            change = round(price - prev_price, 4)
            percent = round((change / prev_price) * 100, 4)

        # ── 1H intraday: 5-minute candles for the current trading day ──────────
        if period == "1h":
            df = ticker.history(period="1d", interval="5m")
            if df is None or df.empty:
                return {"error": "no_data", "message": f"No intraday data for '{symbol}'"}
            df = df.reset_index()
            # Keep last 12 bars (~1 hour of 5-min candles)
            df = df.tail(12)
            intra_dates = []
            for d in df["Datetime"]:
                try:
                    intra_dates.append(d.strftime("%H:%M"))
                except Exception:
                    intra_dates.append(str(d)[11:16])
            close_prices = [round(float(v), 4) if pd.notna(v) else None for v in df["Close"]]
            volumes = [int(v) if pd.notna(v) else None for v in df["Volume"]]
            # Simple intraday trend from first vs last close
            intra_trend = None
            if close_prices and close_prices[0] is not None and close_prices[-1] is not None:
                intra_trend = "Bullish" if close_prices[-1] >= close_prices[0] else "Bearish"
            return {
                "symbol": symbol.upper(),
                "name": name,
                "price": price,
                "prevPrice": prev_price,
                "change": change,
                "percent": percent,
                "currency": currency,
                "dayHigh": day_high,
                "dayLow": day_low,
                "weekHigh52": week_high_52,
                "weekLow52": week_low_52,
                "marketCap": market_cap,
                "dates": intra_dates,
                "closePrices": close_prices,
                "ma7": [None] * len(intra_dates),
                "ma30": [None] * len(intra_dates),
                "volume": volumes,
                "insight": None,
                "trend": intra_trend,
                "volatility": None,
                "momentum": "Neutral",
                "benchmarkSymbol": None,
                "benchmarkDates": [],
                "benchmarkPrices": [],
            }
        # ── End 1H ──────────────────────────────────────────────────────────

        period_map = {
            "1mo": "1mo",
            "3mo": "3mo",
            "6mo": "6mo",
            "1y": "1y",
        }
        yf_period = period_map.get(period, "1y")

        df = ticker.history(period=yf_period, interval="1d")

        if df is None or df.empty:
            return {
                "error": "no_data",
                "message": f"No historical data available for symbol '{symbol}'"
            }

        df = df.reset_index()

        dates = []
        for d in df["Date"]:
            try:
                dates.append(str(d.date()))
            except Exception:
                dates.append(str(d)[:10])

        close_prices = [
            round(float(v), 4) if pd.notna(v) else None
            for v in df["Close"]
        ]
        volumes = [
            int(v) if pd.notna(v) else None
            for v in df["Volume"]
        ]

        # Calculate moving averages
        close_series = pd.Series([v if v is not None else float("nan") for v in close_prices])
        ma7_raw = close_series.rolling(window=7).mean()
        ma30_raw = close_series.rolling(window=30).mean()

        ma7 = [round(float(v), 4) if pd.notna(v) else None for v in ma7_raw]
        ma30 = [round(float(v), 4) if pd.notna(v) else None for v in ma30_raw]

        # Trend: Bullish / Bearish
        trend = None
        if price is not None and ma30 and ma30[-1] is not None:
            trend = "Bullish" if price > ma30[-1] else "Bearish"

        # Volatility: based on daily returns std dev (annualised)
        volatility_label = None
        valid_closes = [v for v in close_prices if v is not None]
        if len(valid_closes) >= 5:
            close_arr = np.array(valid_closes, dtype=float)
            daily_returns = np.diff(close_arr) / close_arr[:-1]
            std = float(np.std(daily_returns))
            annualised = std * np.sqrt(252) * 100  # percent
            if annualised < 20:
                volatility_label = "Low"
            elif annualised < 40:
                volatility_label = "Moderate"
            else:
                volatility_label = "High"

        # Momentum: MA crossover
        momentum = "Neutral"
        if (
            len(ma7) >= 2
            and len(ma30) >= 2
            and ma7[-1] is not None
            and ma7[-2] is not None
            and ma30[-1] is not None
            and ma30[-2] is not None
        ):
            if ma7[-2] <= ma30[-2] and ma7[-1] > ma30[-1]:
                momentum = "Bullish Crossover"
            elif ma7[-2] >= ma30[-2] and ma7[-1] < ma30[-1]:
                momentum = "Bearish Crossover"

        # Quick insight (for backward compat)
        insight = None
        if momentum in ("Bullish Crossover", "Bearish Crossover"):
            insight = "Momentum Shift"
        elif trend == "Bullish":
            insight = "Uptrend"
        elif trend == "Bearish":
            insight = "Downtrend"

        # Benchmark comparison
        is_indian = symbol.upper().endswith(".NS") or symbol.upper().endswith(".BO")
        benchmark_symbol = "^NSEI" if is_indian else "^GSPC"
        benchmark_dates = []
        benchmark_prices = []
        try:
            bm = yf.Ticker(benchmark_symbol)
            bm_df = bm.history(period=yf_period, interval="1d").reset_index()
            if not bm_df.empty:
                for d in bm_df["Date"]:
                    try:
                        benchmark_dates.append(str(d.date()))
                    except Exception:
                        benchmark_dates.append(str(d)[:10])
                benchmark_prices = [
                    round(float(v), 4) if pd.notna(v) else None
                    for v in bm_df["Close"]
                ]
        except Exception:
            pass

        return {
            "symbol": symbol.upper(),
            "name": name,
            "price": price,
            "prevPrice": prev_price,
            "change": change,
            "percent": percent,
            "currency": currency,
            "dayHigh": day_high,
            "dayLow": day_low,
            "weekHigh52": week_high_52,
            "weekLow52": week_low_52,
            "marketCap": market_cap,
            "dates": dates,
            "closePrices": close_prices,
            "ma7": ma7,
            "ma30": ma30,
            "volume": volumes,
            "insight": insight,
            "trend": trend,
            "volatility": volatility_label,
            "momentum": momentum,
            "benchmarkSymbol": benchmark_symbol,
            "benchmarkDates": benchmark_dates,
            "benchmarkPrices": benchmark_prices,
        }

    except Exception as e:
        return {
            "error": "fetch_error",
            "message": str(e)
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "invalid_args", "message": "Missing symbol argument"}))
        sys.exit(1)

    symbol = sys.argv[1]
    period = sys.argv[2] if len(sys.argv) > 2 else "1y"

    result = get_stock_data(symbol, period)
    print(json.dumps(result))
