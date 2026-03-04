/* ================================================================
   StockSense AI — Live Data API Layer
   Data sources (approved):
     • Yahoo Finance JSON quote endpoint — free, ~15 min delayed.
       All calls are routed through /api/quotes on our own server so
       no third-party CORS proxies are needed.
     • Alpha Vantage FREE API — available as fallback (see below).
   The app NEVER breaks if live calls fail; static fallback data
   is always shown first.
   ================================================================ */

/* ── Safe fetch with timeout ── */
function safeFetch(url, timeout) {
  timeout = timeout || 7000;
  return new Promise(function(resolve) {
    var tid = setTimeout(function() { resolve(null); }, timeout);
    fetch(url)
      .then(function(r) {
        clearTimeout(tid);
        if (!r.ok) { resolve(null); return; }
        return r.json();
      })
      .then(function(d) { resolve(d || null); })
      .catch(function() { clearTimeout(tid); resolve(null); });
  });
}

/* ──────────────────────────────────────────
   SERVER-SIDE YAHOO FINANCE PROXY
   The browser calls /api/quotes on our own Node.js server.
   The server fetches from Yahoo Finance (no CORS issues).
   Data is free and approximately 15 minutes delayed for most
   markets.  Real-time data requires a paid feed; none is used.
────────────────────────────────────────── */
function quoteFetch(symbols, fields) {
  fields = fields || 'regularMarketPrice,regularMarketChangePercent,regularMarketTime';
  var url = '/api/quotes?symbols=' + encodeURIComponent(symbols) +
            '&fields='  + encodeURIComponent(fields);
  return safeFetch(url, 9000);
}

/* ══════════════════════════════════════════════
   MARKET INDICES (Yahoo Finance via /api/quotes)
   Source: Yahoo Finance JSON — free, ~15 min delay.
══════════════════════════════════════════════ */

/* Map of our key → Yahoo symbol */
var INDEX_MAP = {
  SP500:  '^GSPC',
  NASDAQ: '^IXIC',
  DOW:    '^DJI',
  FTSE:   '^FTSE',
  GOLD:   'GC=F',
  OIL:    'CL=F',
  VIX:    '^VIX',
  BTC:    'BTC-USD'
};

/* Returns { SP500:{price,chg}, NASDAQ:{price,chg}, ... } or null */
function fetchIndices() {
  var syms = Object.values(INDEX_MAP).join(',');
  return quoteFetch(syms, 'regularMarketPrice,regularMarketChangePercent')
    .then(function(data) {
      if (!data || !data.quoteResponse || !data.quoteResponse.result) return null;
      var result = {};
      data.quoteResponse.result.forEach(function(q) {
        Object.keys(INDEX_MAP).forEach(function(key) {
          if (INDEX_MAP[key] === q.symbol) {
            result[key] = {
              price: q.regularMarketPrice || 0,
              chg:   q.regularMarketChangePercent || 0
            };
          }
        });
      });
      return Object.keys(result).length > 0 ? result : null;
    }).catch(function() { return null; });
}

/* ══════════════════════════════════════════════
   STOCK PRICES — chunked batch (max 25/request)
   Source: Yahoo Finance JSON — free, ~15 min delay.
══════════════════════════════════════════════ */
var PRICE_FIELDS = 'regularMarketPrice,regularMarketChangePercent,regularMarketTime';
var _CHUNK_SIZE  = 25;

function parseYFQuotes(data) {
  if (!data || !data.quoteResponse || !data.quoteResponse.result) return null;
  var result = {};
  data.quoteResponse.result.forEach(function(q) {
    if (!q.symbol) return;
    result[q.symbol] = {
      price: q.regularMarketPrice || 0,
      chg:   q.regularMarketChangePercent || 0,
      ts:    q.regularMarketTime ? new Date(q.regularMarketTime * 1000) : new Date()
    };
  });
  return Object.keys(result).length > 0 ? result : null;
}

function fetchChunk(syms) {
  return quoteFetch(syms.join(','), PRICE_FIELDS)
    .then(function(data) { return parseYFQuotes(data); })
    .catch(function() { return null; });
}

function fetchStockPrices(symbols) {
  if (!symbols || symbols.length === 0) return Promise.resolve(null);
  /* Deduplicate */
  var dedup = symbols.filter(function(s, i) { return s && symbols.indexOf(s) === i; });
  /* Split into chunks */
  var chunks = [];
  for (var i = 0; i < dedup.length; i += _CHUNK_SIZE) {
    chunks.push(dedup.slice(i, i + _CHUNK_SIZE));
  }
  return Promise.all(chunks.map(fetchChunk)).then(function(results) {
    var merged = {};
    results.forEach(function(r) { if (r) Object.assign(merged, r); });
    return Object.keys(merged).length > 0 ? merged : null;
  }).catch(function() { return null; });
}

/* ══════════════════════════════════════════════
   FEAR & GREED — derived from VIX
   Source: VIX data from Yahoo Finance (^VIX).
   VIX is the CBOE Volatility Index — the standard market
   measure of investor fear.  Higher VIX = more fear.
   No CNN or other unofficial endpoints are used.
══════════════════════════════════════════════ */
function vixToFearGreed(vix) {
  var score, label;
  if      (vix <= 12) { score = 85; label = 'Extreme Greed'; }
  else if (vix <= 17) { score = 65; label = 'Greed'; }
  else if (vix <= 20) { score = 50; label = 'Neutral'; }
  else if (vix <= 25) { score = 35; label = 'Fear'; }
  else if (vix <= 30) { score = 20; label = 'Fear'; }
  else                { score = 10; label = 'Extreme Fear'; }
  return { score: score, label: label };
}

function fetchFearGreed() {
  /* VIX is already in INDEX_MAP, but we fetch it standalone here so
     fetchFearGreed() can be called independently by liveRefresh(). */
  return quoteFetch('^VIX', 'regularMarketPrice')
    .then(function(data) {
      if (!data || !data.quoteResponse || !data.quoteResponse.result ||
          !data.quoteResponse.result[0]) return null;
      var vix = data.quoteResponse.result[0].regularMarketPrice;
      if (!vix || vix <= 0) return null;
      return vixToFearGreed(vix);
    }).catch(function() { return null; });
}

/* ══════════════════════════════════════════════
   FX RATES (Yahoo Finance via /api/quotes)
   Source: Yahoo Finance — free, ~15 min delay.
   Fallbacks are reasonable approximations shown
   before live data loads.
══════════════════════════════════════════════ */
var FX_RATES = {
  GBPUSD: 1.27,   /* 1 GBP = X USD  */
  GBPEUR: 1.17,   /* 1 GBP = X EUR  */
  GBPCHF: 1.14,   /* 1 GBP = X CHF  */
  GBPHKD: 9.87,   /* 1 GBP = X HKD  */
  GBPCNY: 9.25    /* 1 GBP = X CNY  */
};

function fetchFXRates() {
  var syms = 'GBPUSD=X,GBPEUR=X,GBPCHF=X,GBPHKD=X,GBPCNY=X';
  return quoteFetch(syms, 'regularMarketPrice')
    .then(function(data) {
      if (!data || !data.quoteResponse || !data.quoteResponse.result) return false;
      var updated = false;
      data.quoteResponse.result.forEach(function(q) {
        var p = q.regularMarketPrice;
        if (!p || p <= 0) return;
        if (q.symbol === 'GBPUSD=X') { FX_RATES.GBPUSD = p; updated = true; }
        if (q.symbol === 'GBPEUR=X') { FX_RATES.GBPEUR = p; updated = true; }
        if (q.symbol === 'GBPCHF=X') { FX_RATES.GBPCHF = p; updated = true; }
        if (q.symbol === 'GBPHKD=X') { FX_RATES.GBPHKD = p; updated = true; }
        if (q.symbol === 'GBPCNY=X') { FX_RATES.GBPCNY = p; updated = true; }
      });
      return updated;
    }).catch(function() { return false; });
}

/* ══════════════════════════════════════════════
   LIVE SECTOR PERFORMANCE
   Each sector is mapped to a representative US ETF.
   Prices are fetched via /api/quotes and the % change
   overwrites the static fallback in SECTORS[].
   ETFs: XLK Technology, ITA Defence, XLV Healthcare,
         XLF Financials, XLI Industrials, XLB Materials,
         XLY Consumer Disc, XLU Utilities, XLE Energy.
══════════════════════════════════════════════ */
var SECTOR_ETF_MAP = [
  { idx: 0, sym: 'XLK'  },   /* Technology   */
  { idx: 1, sym: 'ITA'  },   /* Defence       */
  { idx: 2, sym: 'XLV'  },   /* Healthcare    */
  { idx: 3, sym: 'XLF'  },   /* Financials    */
  { idx: 4, sym: 'XLI'  },   /* Industrials   */
  { idx: 5, sym: 'XLB'  },   /* Materials     */
  { idx: 6, sym: 'XLY'  },   /* Consumer Disc */
  { idx: 7, sym: 'XLU'  },   /* Utilities     */
  { idx: 8, sym: 'XLE'  }    /* Energy        */
];

function fetchSectorData() {
  var etfSyms = SECTOR_ETF_MAP.map(function(e) { return e.sym; }).join(',');
  return quoteFetch(etfSyms, 'regularMarketChangePercent,regularMarketPrice')
    .then(function(data) {
      if (!data || !data.quoteResponse || !data.quoteResponse.result) return false;
      var map = {};
      data.quoteResponse.result.forEach(function(q) {
        if (q.symbol && q.regularMarketChangePercent !== undefined) {
          map[q.symbol] = parseFloat((q.regularMarketChangePercent || 0).toFixed(2));
        }
      });
      var updated = false;
      SECTOR_ETF_MAP.forEach(function(e) {
        if (map[e.sym] !== undefined && SECTORS[e.idx]) {
          SECTORS[e.idx].chg = map[e.sym];
          updated = true;
        }
      });
      return updated;
    }).catch(function() { return false; });
}

/* ══════════════════════════════════════════════
   NOTE ON ALPHA VANTAGE (backup)
   Alpha Vantage FREE API is listed as an approved
   backup source.  It provides 25 req/day on the
   free tier.  It is not currently wired in because
   Yahoo Finance covers all required data.  If Yahoo
   Finance becomes unavailable, Alpha Vantage can be
   integrated at: https://www.alphavantage.co/
══════════════════════════════════════════════ */
