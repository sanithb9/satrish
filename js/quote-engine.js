'use strict';
/* ════════════════════════════════════════════════════════════════════
   quote-engine.js  —  StockSense AI
   Universal client-side quote interface.

   Primary entry point:
     getAccurateQuote(symbol)  →  Promise<QuoteData>

   QuoteData shape:
   {
     symbol         : string           — normalised ticker
     name           : string           — company / fund name
     price          : number           — last traded price (native currency)
     change         : number | null    — absolute change from prev close
     changePercent  : number           — % change from prev close
     open           : number | null    — session open price
     high           : number | null    — session high
     low            : number | null    — session low
     high52         : number | null    — 52-week high
     low52          : number | null    — 52-week low
     volume         : number | null    — session volume
     marketCap      : number | null    — market capitalisation
     pe             : number | null    — trailing P/E ratio

     timestamp      : string | null    — ISO-8601 — when price was recorded
     fetchedAt      : string           — ISO-8601 — when server fetched it
     source         : 'yahoo'|'alphavantage'|'cache'
     isDelayed      : boolean          — true for 15-min delayed feeds
     delayMinutes   : number           — typical feed delay
     marketStatus   : 'open'|'pre'|'post'|'lunch'|'closed'
     confidence     : 'high'|'medium'|'low'|'none'
     isStale        : boolean          — data age > 30 min
     dataAgeMinutes : number | null
     fromCache      : boolean
     cacheAgeSec    : number           — present only when fromCache=true

     error          : string           — present only on failure
   }
════════════════════════════════════════════════════════════════════ */

/* ─── In-browser quote cache ─────────────────────────────────────── */
/* Secondary defence: prevents the page issuing duplicate requests
   for the same symbol within a short burst (e.g. portfolio renders). */
var _clientCache = {};   /* { [SYM]: { data: QuoteData, at: number } } */

/* Client-side TTL mirrors server TTL; server enforces the real policy. */
function _clientTTL(marketStatus) {
  if (marketStatus === 'open')                          return 20  * 1000;  /* 20 s */
  if (marketStatus === 'pre' || marketStatus === 'post') return 45  * 1000;  /* 45 s */
  return 120 * 1000;                                                          /* 2 min */
}

function _clientCacheGet(sym) {
  var entry = _clientCache[sym];
  if (!entry) return null;
  if (Date.now() - entry.at > _clientTTL(entry.data.marketStatus)) {
    delete _clientCache[sym];
    return null;
  }
  return entry.data;
}

function _clientCacheSet(sym, data) {
  _clientCache[sym] = { data: data, at: Date.now() };
}

/* ─── In-flight deduplication ────────────────────────────────────── */
/* If two callers request the same symbol simultaneously, only one HTTP
   request is made.  Both callers receive the same resolved value.     */
var _inflight = {};   /* { [SYM]: Promise<QuoteData> } */

/* ─── Normalise symbol ───────────────────────────────────────────── */
function _normaliseSym(symbol) {
  return (symbol || '').trim().toUpperCase().replace(/[^A-Z0-9.\-^=]/g, '');
}

/* ─── Format helpers — utilities for rendering QuoteData ─────────── */

/* Human-readable market status label */
function marketStatusLabel(status) {
  var map = {
    open:   'Market Open',
    pre:    'Pre-Market',
    post:   'After Hours',
    lunch:  'Lunch Break',
    closed: 'Market Closed'
  };
  return map[status] || status;
}

/* CSS class name for colouring change values */
function changeClass(changePercent) {
  if (changePercent >  0) return 'pos';
  if (changePercent <  0) return 'neg';
  return 'neu';
}

/* Short human-readable age string: '< 1 min ago', '5 min ago', etc. */
function dataAgeLabel(dataAgeMinutes) {
  if (dataAgeMinutes === null || dataAgeMinutes === undefined) return '—';
  if (dataAgeMinutes < 1)  return '< 1 min ago';
  if (dataAgeMinutes < 60) return dataAgeMinutes + ' min ago';
  var h = Math.floor(dataAgeMinutes / 60);
  return h + 'h ' + (dataAgeMinutes % 60) + 'm ago';
}

/* Format a large number: 1234567890 → '1.23B' */
function formatLargeNumber(n) {
  if (!n) return null;
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9 ).toFixed(2) + 'B';
  if (n >= 1e6)  return (n / 1e6 ).toFixed(2) + 'M';
  if (n >= 1e3)  return (n / 1e3 ).toFixed(1) + 'K';
  return String(n);
}

/* ─── Core: getAccurateQuote ─────────────────────────────────────── */
/**
 * Fetches a validated, timestamped, cache-aware quote for any
 * ticker supported by Yahoo Finance (US, UK .L, EU .DE/.PA/.AS,
 * HK .HK, China .SS/.SZ).
 *
 * @param  {string}  symbol  — Yahoo Finance ticker (e.g. 'AAPL', 'VOD.L', '0700.HK')
 * @return {Promise<QuoteData>}
 */
function getAccurateQuote(symbol) {
  var sym = _normaliseSym(symbol);
  if (!sym) return Promise.reject(new Error('symbol is required'));

  /* Browser cache hit */
  var cached = _clientCacheGet(sym);
  if (cached) return Promise.resolve(cached);

  /* In-flight dedup */
  if (_inflight[sym]) return _inflight[sym];

  var promise = fetch('/api/quote/' + encodeURIComponent(sym))
    .then(function(res) {
      if (!res.ok && res.status !== 404) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      if (data && !data.error) {
        _clientCacheSet(sym, data);
      }
      return data;
    })
    .finally(function() {
      delete _inflight[sym];
    });

  _inflight[sym] = promise;
  return promise;
}

/* ─── Batch helper ───────────────────────────────────────────────── */
/**
 * Fetch multiple symbols concurrently.
 * Each symbol goes through the full 3-layer validation pipeline.
 *
 * @param  {string[]} symbols
 * @return {Promise<{ [symbol]: QuoteData }>}
 */
function getAccurateQuotes(symbols) {
  var unique = [];
  var seen   = {};
  (symbols || []).forEach(function(s) {
    var n = _normaliseSym(s);
    if (n && !seen[n]) { seen[n] = true; unique.push(n); }
  });

  return Promise.all(unique.map(function(sym) {
    return getAccurateQuote(sym).then(function(q) {
      return { sym: sym, data: q };
    }).catch(function(err) {
      return { sym: sym, data: { symbol: sym, error: err.message, confidence: 'none' } };
    });
  })).then(function(results) {
    var map = {};
    results.forEach(function(r) { map[r.sym] = r.data; });
    return map;
  });
}

/* ─── Consistency guard ──────────────────────────────────────────── */
/**
 * Returns a display-safe representation of a QuoteData object.
 * Guarantees that every field consumed by the UI has a safe default,
 * preventing blank or broken renders from partially-populated data.
 */
function safeQuote(data) {
  data = data || {};
  return {
    symbol:         data.symbol         || '—',
    name:           data.name           || data.symbol || '—',
    price:          typeof data.price === 'number' ? data.price : null,
    change:         typeof data.change  === 'number' ? data.change : null,
    changePercent:  typeof data.changePercent === 'number' ? data.changePercent : null,
    open:           data.open    || null,
    high:           data.high    || null,
    low:            data.low     || null,
    high52:         data.high52  || null,
    low52:          data.low52   || null,
    volume:         data.volume  || null,
    marketCap:      data.marketCap ? formatLargeNumber(data.marketCap) : null,
    pe:             data.pe ? data.pe.toFixed(1) : null,
    timestamp:      data.timestamp      || null,
    fetchedAt:      data.fetchedAt      || null,
    source:         data.source         || 'unknown',
    isDelayed:      data.isDelayed      !== false,
    delayMinutes:   data.delayMinutes   || 0,
    marketStatus:   data.marketStatus   || 'unknown',
    marketLabel:    marketStatusLabel(data.marketStatus),
    confidence:     data.confidence     || 'none',
    isStale:        data.isStale        === true,
    dataAgeMinutes: data.dataAgeMinutes !== undefined ? data.dataAgeMinutes : null,
    dataAgeLabel:   dataAgeLabel(data.dataAgeMinutes),
    changeClass:    changeClass(data.changePercent),
    fromCache:      data.fromCache      === true,
    error:          data.error          || null
  };
}

/* ─── Exports (works as global object or as CommonJS/ES module) ─── */
(function(root) {
  var pub = {
    getAccurateQuote:   getAccurateQuote,
    getAccurateQuotes:  getAccurateQuotes,
    safeQuote:          safeQuote,
    marketStatusLabel:  marketStatusLabel,
    changeClass:        changeClass,
    dataAgeLabel:       dataAgeLabel,
    formatLargeNumber:  formatLargeNumber
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = pub;                   /* Node / CommonJS  */
  } else if (typeof define === 'function' && define.amd) {
    define(function() { return pub; });     /* AMD              */
  } else {
    root.QuoteEngine = pub;                 /* Browser global   */
  }
}(typeof globalThis !== 'undefined' ? globalThis : this));
