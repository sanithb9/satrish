/**
 * StockSense AI — React Native quote component
 * ─────────────────────────────────────────────
 * Drop-in example showing how to consume the /api/quote/:symbol
 * endpoint from a React Native app backed by the StockSense server.
 *
 * Features demonstrated:
 *   • getAccurateQuote()  — universal quote fetch hook
 *   • Cache + retry logic (client-side)
 *   • Timestamp display
 *   • Delayed-data banner
 *   • Market open / closed / pre / post status badge
 *   • Stale-data warning
 *   • Confidence indicator
 *
 * Requirements:
 *   npm install @tanstack/react-query  (or use plain useEffect)
 *
 * Usage:
 *   <StockQuoteCard symbol="AAPL" />
 *   <StockQuoteCard symbol="VOD.L" />
 *   <StockQuoteCard symbol="0700.HK" />
 *   <StockQuoteCard symbol="600519.SS" />
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, ScrollView
} from 'react-native';

/* ─── Config ──────────────────────────────────────────────────────── */
const API_BASE_URL = 'http://YOUR_SERVER_IP:3000';   /* ← replace with your server URL */

/* Auto-refresh intervals (ms) */
const REFRESH_INTERVALS = {
  open:   30_000,   /* 30 s during market hours    */
  pre:    60_000,   /* 60 s pre-market             */
  post:   60_000,   /* 60 s after hours            */
  lunch:  60_000,   /* 60 s during lunch break     */
  closed: 300_000   /* 5 min when market is closed */
};

/* ─── Client-side cache ───────────────────────────────────────────── */
const _cache = new Map();

function _cacheTTL(marketStatus) {
  if (marketStatus === 'open')  return 20_000;
  if (marketStatus === 'pre' || marketStatus === 'post') return 45_000;
  return 120_000;
}

function cacheGet(sym) {
  const entry = _cache.get(sym);
  if (!entry) return null;
  if (Date.now() - entry.at > _cacheTTL(entry.data.marketStatus)) {
    _cache.delete(sym);
    return null;
  }
  return entry.data;
}

function cacheSet(sym, data) {
  _cache.set(sym, { data, at: Date.now() });
}

/* ─── In-flight deduplication ─────────────────────────────────────── */
const _inflight = new Map();

/* ─── Core fetch function ─────────────────────────────────────────── */
/**
 * getAccurateQuote(symbol) → Promise<QuoteData>
 *
 * Full data pipeline:
 *   1. Check client cache (avoids duplicate requests during fast renders)
 *   2. Deduplicate in-flight requests for the same symbol
 *   3. Call /api/quote/:symbol on the StockSense server
 *      └── Server runs: Yahoo Finance → Alpha Vantage backup → validation
 *   4. Store result in client cache
 *   5. Return validated QuoteData with full metadata
 */
async function getAccurateQuote(symbol, options = {}) {
  const sym    = symbol.toUpperCase().replace(/[^A-Z0-9.\-^=]/g, '');
  const bust   = options.bustCache === true;

  /* Layer 0: client cache */
  if (!bust) {
    const cached = cacheGet(sym);
    if (cached) return { ...cached, fromClientCache: true };
  }

  /* In-flight dedup */
  if (_inflight.has(sym)) return _inflight.get(sym);

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 10_000);

  const promise = (async () => {
    let lastError;
    /* Retry up to 3 times with exponential backoff */
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/quote/${encodeURIComponent(sym)}`,
          {
            signal:  controller.signal,
            headers: { 'Accept': 'application/json' }
          }
        );
        if (!res.ok && res.status !== 404) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!data.error) cacheSet(sym, data);
        return data;
      } catch (err) {
        if (err.name === 'AbortError') throw err; /* timeout — don't retry */
        lastError = err;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError;
  })().finally(() => {
    clearTimeout(timeout);
    _inflight.delete(sym);
  });

  _inflight.set(sym, promise);
  return promise;
}

/* ─── Data consistency helpers ────────────────────────────────────── */
function marketStatusConfig(status) {
  const configs = {
    open:   { label: 'Live',        color: '#22c55e', dot: true  },
    pre:    { label: 'Pre-Market',  color: '#f59e0b', dot: true  },
    post:   { label: 'After Hours', color: '#8b5cf6', dot: false },
    lunch:  { label: 'Lunch Break', color: '#6b7280', dot: false },
    closed: { label: 'Closed',      color: '#6b7280', dot: false }
  };
  return configs[status] || { label: status || '—', color: '#6b7280', dot: false };
}

function formatAge(minutes) {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < 1)  return '< 1 min ago';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

function formatPrice(price, symbol) {
  if (price === null || price === undefined) return '—';
  /* Penny stocks and pence-quoted LSE stocks need more decimals */
  const decimals = (price < 1 || symbol?.endsWith('.L')) ? 4 : 2;
  return price.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function currencySymbol(sym) {
  if (!sym) return '$';
  const u = sym.toUpperCase();
  if (u.endsWith('.L'))  return 'p';
  if (u.endsWith('.DE') || u.endsWith('.PA') || u.endsWith('.AS') ||
      u.endsWith('.MC') || u.endsWith('.MI')) return '€';
  if (u.endsWith('.SW')) return 'CHF ';
  if (u.endsWith('.HK')) return 'HK$';
  if (u.endsWith('.SS') || u.endsWith('.SZ')) return '¥';
  return '$';
}

/* ─── useQuote hook ───────────────────────────────────────────────── */
/**
 * React hook that wraps getAccurateQuote() with:
 *   - Loading state
 *   - Error state
 *   - Auto-refresh (interval adapts to market status)
 *   - Manual refresh via returned `refresh()` function
 *
 * @example
 *   const { quote, loading, error, refresh } = useQuote('AAPL');
 */
function useQuote(symbol) {
  const [quote,    setQuote]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const timerRef               = useRef(null);

  const fetch_ = useCallback(async (bustCache = false) => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAccurateQuote(symbol, { bustCache });
      setQuote(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch quote');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  /* Initial fetch */
  useEffect(() => {
    fetch_(false);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetch_]);

  /* Auto-refresh — interval adapts to market status */
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const status   = quote?.marketStatus || 'closed';
    const interval = REFRESH_INTERVALS[status] || REFRESH_INTERVALS.closed;
    timerRef.current = setInterval(() => fetch_(true), interval);
    return () => clearInterval(timerRef.current);
  }, [fetch_, quote?.marketStatus]);

  return {
    quote,
    loading,
    error,
    refresh: () => fetch_(true)
  };
}

/* ─── StockQuoteCard component ────────────────────────────────────── */
/**
 * A self-contained card that shows a fully-validated, timestamped
 * stock quote with market status, delay indicator, and staleness warning.
 *
 * Props:
 *   symbol  {string}   — Yahoo Finance ticker
 *   onPress {function} — optional tap handler (receives QuoteData)
 */
export function StockQuoteCard({ symbol, onPress }) {
  const { quote, loading, error, refresh } = useQuote(symbol);
  const currency = currencySymbol(symbol);

  if (loading && !quote) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#60a5fa" />
        <Text style={styles.loadingText}>Loading {symbol}…</Text>
      </View>
    );
  }

  if (error && !quote) {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.symbol}>{symbol}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!quote) return null;

  const status   = marketStatusConfig(quote.marketStatus);
  const isUp     = (quote.changePercent || 0) >= 0;
  const chgColor = isUp ? '#22c55e' : '#ef4444';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(quote)}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.symbol}>{quote.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>{quote.name}</Text>
        </View>

        {/* Market status badge */}
        <View style={[styles.badge, { backgroundColor: status.color + '22', borderColor: status.color }]}>
          {status.dot && (
            <View style={[styles.dot, { backgroundColor: status.color }]} />
          )}
          <Text style={[styles.badgeText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Price row */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>
          {currency}{formatPrice(quote.price, symbol)}
        </Text>
        <View style={[styles.chgBadge, { backgroundColor: chgColor + '22' }]}>
          <Text style={[styles.chgText, { color: chgColor }]}>
            {isUp ? '▲' : '▼'} {Math.abs(quote.changePercent || 0).toFixed(2)}%
            {quote.change !== null
              ? ` (${isUp ? '+' : ''}${currency}${Math.abs(quote.change).toFixed(2)})`
              : ''}
          </Text>
        </View>
      </View>

      {/* OHLV row */}
      {(quote.open || quote.high || quote.low) && (
        <View style={styles.ohlvRow}>
          {quote.open  && <OHLVItem label="Open"  value={currency + formatPrice(quote.open,  symbol)} />}
          {quote.high  && <OHLVItem label="High"  value={currency + formatPrice(quote.high,  symbol)} />}
          {quote.low   && <OHLVItem label="Low"   value={currency + formatPrice(quote.low,   symbol)} />}
          {quote.volume && <OHLVItem label="Vol"  value={formatVolume(quote.volume)} />}
        </View>
      )}

      {/* ── DATA CONSISTENCY FOOTER — always shown ── */}
      <View style={styles.footer}>

        {/* Timestamp — always present */}
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>Last updated</Text>
          <Text style={styles.footerValue}>
            {quote.timestamp
              ? new Date(quote.timestamp).toLocaleTimeString()
              : '—'}
            {' · '}{formatAge(quote.dataAgeMinutes)}
          </Text>
        </View>

        {/* Delayed data banner */}
        {quote.isDelayed && (
          <View style={styles.delayBanner}>
            <Text style={styles.delayText}>
              ⏱ Data delayed ~{quote.delayMinutes} min
            </Text>
          </View>
        )}

        {/* Stale data warning */}
        {quote.isStale && (
          <View style={styles.staleBanner}>
            <Text style={styles.staleText}>
              ⚠ Price may be stale — last data from {formatAge(quote.dataAgeMinutes)}
            </Text>
          </View>
        )}

        {/* Confidence + source */}
        <View style={styles.footerRow}>
          <ConfidenceDot confidence={quote.confidence} />
          <Text style={styles.sourceText}>
            via {quote.source}{quote.fromCache ? ' · cached' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */
function OHLVItem({ label, value }) {
  return (
    <View style={styles.ohlvItem}>
      <Text style={styles.ohlvLabel}>{label}</Text>
      <Text style={styles.ohlvValue}>{value}</Text>
    </View>
  );
}

function ConfidenceDot({ confidence }) {
  const colors = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444', none: '#6b7280' };
  const labels = { high: 'High confidence', medium: 'Med confidence',
                   low:  'Low confidence',  none:   'No confidence' };
  const color = colors[confidence] || colors.none;
  return (
    <View style={styles.confRow}>
      <View style={[styles.dot, { backgroundColor: color, width: 7, height: 7 }]} />
      <Text style={[styles.confLabel, { color }]}>{labels[confidence]}</Text>
    </View>
  );
}

function formatVolume(v) {
  if (!v) return '—';
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(v);
}

/* ─── Multi-symbol feed example ──────────────────────────────────── */
/**
 * A scrollable list that fetches multiple symbols concurrently.
 * Each card manages its own auto-refresh lifecycle independently.
 */
export function StockFeed({ symbols }) {
  return (
    <ScrollView
      contentContainerStyle={styles.feed}
      showsVerticalScrollIndicator={false}
    >
      {symbols.map(sym => (
        <StockQuoteCard key={sym} symbol={sym} />
      ))}
    </ScrollView>
  );
}

/* ─── Usage example ─────────────────────────────────────────────── */
/**
 * Example screen demonstrating all five markets.
 *
 * To use in your React Native app:
 *
 *   import { MultiMarketDemo } from './examples/react-native-quote';
 *   // In your navigator:
 *   <Stack.Screen name="Demo" component={MultiMarketDemo} />
 */
export function MultiMarketDemo() {
  const watchlist = [
    /* US */        'AAPL',      'TSLA',      'NVDA',
    /* UK (LSE) */  'VOD.L',     'HSBA.L',    'ULVR.L',
    /* Europe */    'SAP.DE',    'AIR.PA',    'ASML.AS',
    /* Hong Kong */ '0700.HK',   '9988.HK',   '3690.HK',
    /* China A */   '600519.SS', '000858.SZ', '300750.SZ'
  ];
  return <StockFeed symbols={watchlist} />;
}

/* ─── Styles ─────────────────────────────────────────────────────── */
const COLORS = {
  bg:       '#0f0f13',
  card:     '#1a1a24',
  border:   '#2a2a3a',
  t1:       '#f1f5f9',
  t2:       '#94a3b8',
  t3:       '#64748b',
  green:    '#22c55e',
  red:      '#ef4444',
  amber:    '#f59e0b',
  blue:     '#60a5fa'
};

const styles = StyleSheet.create({
  feed: {
    padding: 12,
    gap: 10
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10
  },
  errorCard: {
    borderColor: COLORS.red + '44'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  symbol: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.t1,
    letterSpacing: 0.3
  },
  name: {
    fontSize: 12,
    color: COLORS.t3,
    marginTop: 2,
    maxWidth: 180
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600'
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.t1,
    letterSpacing: -0.5
  },
  chgBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  chgText: {
    fontSize: 13,
    fontWeight: '600'
  },
  ohlvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 10
  },
  ohlvItem: {
    alignItems: 'center',
    gap: 2
  },
  ohlvLabel: {
    fontSize: 10,
    color: COLORS.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  ohlvValue: {
    fontSize: 12,
    color: COLORS.t1,
    fontWeight: '600'
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    gap: 6
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerLabel: {
    fontSize: 11,
    color: COLORS.t3
  },
  footerValue: {
    fontSize: 11,
    color: COLORS.t2
  },
  delayBanner: {
    backgroundColor: COLORS.amber + '15',
    borderRadius: 6,
    padding: 6
  },
  delayText: {
    fontSize: 11,
    color: COLORS.amber
  },
  staleBanner: {
    backgroundColor: COLORS.red + '15',
    borderRadius: 6,
    padding: 6
  },
  staleText: {
    fontSize: 11,
    color: COLORS.red
  },
  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  confLabel: {
    fontSize: 10,
    fontWeight: '600'
  },
  sourceText: {
    fontSize: 10,
    color: COLORS.t3
  },
  loadingText: {
    color: COLORS.t3,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center'
  },
  errorText: {
    color: COLORS.red,
    fontSize: 13
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: COLORS.blue + '22',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center'
  },
  retryText: {
    color: COLORS.blue,
    fontWeight: '600',
    fontSize: 13
  }
});

/* ─── Direct usage without components ───────────────────────────── */
/*
  If you just need the data (no UI), use getAccurateQuote directly:

  import { getAccurateQuote } from './examples/react-native-quote';

  const quote = await getAccurateQuote('AAPL');

  console.log(quote.price);          // 193.42
  console.log(quote.changePercent);  // 1.34
  console.log(quote.marketStatus);   // 'open' | 'closed' | 'pre' | 'post'
  console.log(quote.isDelayed);      // true  (15-min delayed feed)
  console.log(quote.delayMinutes);   // 15
  console.log(quote.timestamp);      // '2025-03-04T14:32:00.000Z'
  console.log(quote.fetchedAt);      // '2025-03-04T14:47:00.123Z'
  console.log(quote.confidence);     // 'high' | 'medium' | 'low'
  console.log(quote.isStale);        // false
  console.log(quote.source);         // 'yahoo' | 'alphavantage'
*/
