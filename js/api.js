/* ================================================================
   StockSense AI — Live Data API Layer
   All functions return data or fall back gracefully.
   The app NEVER breaks if these fail.
   ================================================================ */

var API_KEYS = { finnhub: '', newsapi: '' };

/* ── Load saved keys ── */
function apiLoadKeys() {
  try {
    var s = JSON.parse(localStorage.getItem('ss_settings') || '{}');
    if (s.finnhub) API_KEYS.finnhub = s.finnhub;
    if (s.newsapi) API_KEYS.newsapi = s.newsapi;
  } catch(e) {}
}

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

/* ── CORS proxy list — each entry specifies whether to encode the URL ── */
var PROXIES = [
  /* corsproxy.io expects raw (non-encoded) URL after the ? */
  { prefix: 'https://corsproxy.io/?',              encode: false },
  /* allorigins expects encoded URL and wraps response in {contents} */
  { prefix: 'https://api.allorigins.win/get?url=', encode: true  },
  /* codetabs proxy — encoded URL */
  { prefix: 'https://api.codetabs.com/v1/proxy?quest=', encode: true }
];

/* Also try query2 subdomain as alternative to query1 for Yahoo Finance */
var YF_BASE2 = 'https://query2.finance.yahoo.com/v7/finance/quote?symbols=';

function proxyFetch(targetUrl) {
  /* First try with query2 subdomain if this is a Yahoo Finance query1 URL */
  var urls = [targetUrl];
  if (targetUrl.indexOf('query1.finance.yahoo.com') !== -1) {
    urls.push(targetUrl.replace('query1.finance.yahoo.com', 'query2.finance.yahoo.com'));
  }

  return new Promise(function(resolve) {
    var proxyIdx = 0;
    var urlIdx   = 0;

    function tryNext() {
      if (proxyIdx >= PROXIES.length) { resolve(null); return; }
      var proxy   = PROXIES[proxyIdx];
      var baseUrl = urls[urlIdx % urls.length];
      urlIdx++;
      /* Move to next proxy after we have tried all url variants for this proxy */
      if (urlIdx % urls.length === 0) proxyIdx++;

      var full = proxy.prefix + (proxy.encode ? encodeURIComponent(baseUrl) : baseUrl);
      safeFetch(full, 8000).then(function(data) {
        if (!data) { tryNext(); return; }
        /* allorigins wraps response in {contents: "...json string..."} */
        if (typeof data.contents === 'string') {
          try { data = JSON.parse(data.contents); } catch(e) { tryNext(); return; }
        }
        if (!data) { tryNext(); return; }
        resolve(data);
      });
    }
    tryNext();
  });
}

/* ══════════════════════════════════════════════
   MARKET INDICES (Yahoo Finance via proxy)
══════════════════════════════════════════════ */
var YF_BASE = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=';

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
  var url = YF_BASE + syms + '&fields=regularMarketPrice,regularMarketChangePercent';
  return proxyFetch(url).then(function(data) {
    if (!data || !data.quoteResponse || !data.quoteResponse.result) return null;
    var result = {};
    data.quoteResponse.result.forEach(function(q) {
      Object.keys(INDEX_MAP).forEach(function(key) {
        if (INDEX_MAP[key] === q.symbol) {
          result[key] = {
            price: q.regularMarketPrice || 0,
            chg: q.regularMarketChangePercent || 0
          };
        }
      });
    });
    return Object.keys(result).length > 0 ? result : null;
  }).catch(function() { return null; });
}

/* ══════════════════════════════════════════════
   STOCK PRICES (batch Yahoo Finance)
══════════════════════════════════════════════ */
function fetchStockPrices(symbols) {
  if (!symbols || symbols.length === 0) return Promise.resolve(null);
  var url = YF_BASE + symbols.join(',') + '&fields=regularMarketPrice,regularMarketChangePercent';
  return proxyFetch(url).then(function(data) {
    if (!data || !data.quoteResponse || !data.quoteResponse.result) return null;
    var result = {};
    data.quoteResponse.result.forEach(function(q) {
      result[q.symbol] = {
        price: q.regularMarketPrice || 0,
        chg: q.regularMarketChangePercent || 0
      };
    });
    return Object.keys(result).length > 0 ? result : null;
  }).catch(function() { return null; });
}

/* ══════════════════════════════════════════════
   FEAR & GREED INDEX (CNN Money)
══════════════════════════════════════════════ */
function fetchFearGreed() {
  var url = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
  return proxyFetch(url).then(function(data) {
    if (data && data.fear_and_greed && data.fear_and_greed.score) {
      return {
        score: Math.round(data.fear_and_greed.score),
        label: data.fear_and_greed.rating || scoreToLabel(data.fear_and_greed.score)
      };
    }
    return null;
  }).catch(function() { return null; });
}

function scoreToLabel(s) {
  if (s <= 25) return 'Extreme Fear';
  if (s <= 45) return 'Fear';
  if (s <= 55) return 'Neutral';
  if (s <= 75) return 'Greed';
  return 'Extreme Greed';
}

/* ══════════════════════════════════════════════
   FX RATES (live via Yahoo Finance)
   Fallbacks are reasonably close approximations.
══════════════════════════════════════════════ */
var FX_RATES = {
  GBPUSD: 1.27,   /* 1 GBP = X USD  */
  GBPEUR: 1.17,   /* 1 GBP = X EUR  */
  GBPCHF: 1.14    /* 1 GBP = X CHF  */
};

function fetchFXRates() {
  var syms = 'GBPUSD=X,GBPEUR=X,GBPCHF=X';
  var url  = YF_BASE + syms + '&fields=regularMarketPrice';
  return proxyFetch(url).then(function(data) {
    if (!data || !data.quoteResponse || !data.quoteResponse.result) return;
    data.quoteResponse.result.forEach(function(q) {
      var p = q.regularMarketPrice;
      if (!p || p <= 0) return;
      if (q.symbol === 'GBPUSD=X') FX_RATES.GBPUSD = p;
      if (q.symbol === 'GBPEUR=X') FX_RATES.GBPEUR = p;
      if (q.symbol === 'GBPCHF=X') FX_RATES.GBPCHF = p;
    });
  }).catch(function() {});
}
