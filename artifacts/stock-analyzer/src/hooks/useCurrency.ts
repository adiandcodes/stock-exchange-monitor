import { useState, useEffect, useCallback } from "react";

export type Currency = "USD" | "INR" | "EUR";

const CURRENCY_KEY = "app_currency";
const RATE_KEY = "app_fx_rates";
const RATE_TTL_KEY = "app_fx_rates_ttl";

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
};

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem(CURRENCY_KEY) as Currency) ?? "USD";
  });

  const [rates, setRates] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem(RATE_KEY);
      const ttl = localStorage.getItem(RATE_TTL_KEY);
      if (cached && ttl && Date.now() < Number(ttl)) {
        return JSON.parse(cached);
      }
    } catch {}
    return FALLBACK_RATES;
  });

  useEffect(() => {
    const ttl = localStorage.getItem(RATE_TTL_KEY);
    if (ttl && Date.now() < Number(ttl)) return;

    fetch("https://api.exchangerate-api.com/v4/latest/USD")
      .then((r) => r.json())
      .then((d) => {
        const r = d.rates as Record<string, number>;
        setRates(r);
        localStorage.setItem(RATE_KEY, JSON.stringify(r));
        localStorage.setItem(RATE_TTL_KEY, String(Date.now() + 3_600_000));
      })
      .catch(() => {});
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(CURRENCY_KEY, c);
  }, []);

  // `value` is denominated in `fromCurrency` (a stock/crypto/metal's native
  // quote currency, e.g. INR for TCS.NS) and is converted into the selected
  // display currency via USD-based cross rates. Defaults to "USD" so callers
  // whose values are already USD-denominated (crypto, metals) are unaffected.
  const convert = useCallback(
    (value: number | null | undefined, fromCurrency: string = "USD"): number | null => {
      if (value == null) return null;
      if (fromCurrency === currency) return value; // no conversion needed
      const fromRate = rates[fromCurrency] ?? 1; // units of fromCurrency per 1 USD
      const toRate = rates[currency] ?? 1; // units of selected currency per 1 USD
      return (value / fromRate) * toRate;
    },
    [rates, currency]
  );

  const symbol = currency === "USD" ? "$" : currency === "INR" ? "₹" : "€";

  return { currency, setCurrency, convert, symbol, rates };
}
