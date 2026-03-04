'use strict';

require('dotenv').config();
const http      = require('http');
const https     = require('https');
const url_mod   = require('url');
const fs        = require('fs');
const path      = require('path');
const { execFile } = require('child_process');

const { fetchLatestNews } = require('./newsMonitor');
const { analyzeNews }     = require('./stockNewsAnalyzer');
const { Resend }          = require('resend');

const PORT = process.env.PORT || 3000;

/* ─── In-memory cache ───────────────────────────────────────────── */
var _cache   = null;
var _cacheTs = 0;
const CACHE_TTL = 15 * 60 * 1000;

/* ─── Scheduler state ───────────────────────────────────────────── */
var _lastChecked      = null;
var _scheduleTimer    = null;
var _scheduleInterval = 0; // minutes; 0 = off

/* ─── MIME types ────────────────────────────────────────────────── */
const MIME = {
  '.html':        'text/html; charset=utf-8',
  '.js':          'application/javascript',
  '.css':         'text/css',
  '.json':        'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png':         'image/png',
  '.jpg':         'image/jpeg',
  '.svg':         'image/svg+xml',
  '.ico':         'image/x-icon'
};

/* ─── Helpers ───────────────────────────────────────────────────── */
function sendJSON(res, status, body) {
  var json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  });
  res.end(json);
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, function(err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    var ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

/* ─── Read POST body ────────────────────────────────────────────── */
function readBody(req) {
  return new Promise(function(resolve) {
    var raw = '';
    req.on('data', function(chunk) { raw += chunk; });
    req.on('end',  function() {
      try { resolve(JSON.parse(raw)); } catch(e) { resolve({}); }
    });
    req.on('error', function() { resolve({}); });
  });
}

/* ─── Email helpers ─────────────────────────────────────────────── */
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEmailHtml(alerts, summary) {
  var ACTION_COLORS = { BUY: '#00c853', SELL: '#ff1744', HOLD: '#757575', WATCH: '#ffd600' };
  var urgentAlerts  = alerts.filter(function(a) { return a.urgency === 'URGENT'; });

  var rows = urgentAlerts.map(function(a) {
    var color = ACTION_COLORS[a.action] || '#6c63ff';
    return '<tr><td style="padding:14px 0;border-bottom:1px solid #e8e8f0">' +
      '<div style="font-size:15px;font-weight:700;color:#1a1a2e;margin-bottom:6px">' + escHtml(a.stock_or_sector) + '</div>' +
      '<span style="background:' + color + ';color:#fff;padding:3px 9px;border-radius:4px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:8px">' + escHtml(a.action) + '</span>' +
      '<p style="color:#444;font-size:13px;line-height:1.55;margin:0 0 8px">' + escHtml(a.reason) + '</p>' +
      (a.source_headline ? '<p style="color:#888;font-size:12px;margin:0 0 4px;font-style:italic">' + escHtml(a.source_headline) + '</p>' : '') +
      (a.source_url ? '<a href="' + escHtml(a.source_url) + '" style="color:#6c63ff;font-size:12px;text-decoration:none">Read full article →</a>' : '') +
      '</td></tr>';
  }).join('');

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
    '<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif">' +
    '<div style="max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">' +
      '<div style="background:linear-gradient(135deg,#6c63ff,#b388ff);padding:24px 28px">' +
        '<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px">' +
          '\uD83D\uDD34 ' + urgentAlerts.length + ' URGENT Alert' + (urgentAlerts.length !== 1 ? 's' : '') + ' — StockSense AI' +
        '</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.8)">' + new Date().toUTCString() + '</div>' +
      '</div>' +
      (summary
        ? '<div style="padding:16px 28px;background:#f8f8ff;border-bottom:1px solid #e8e8f0">' +
            '<div style="font-size:11px;font-weight:700;color:#6c63ff;text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">Market Summary</div>' +
            '<p style="color:#333;font-size:13px;line-height:1.6;margin:0">' + escHtml(summary) + '</p>' +
          '</div>'
        : '') +
      '<div style="padding:0 28px 8px"><table style="width:100%;border-collapse:collapse">' + rows + '</table></div>' +
      '<div style="padding:16px 28px;border-top:1px solid #e8e8f0;text-align:center">' +
        '<p style="color:#aaa;font-size:11px;margin:0">Sent by StockSense AI</p>' +
      '</div>' +
    '</div></body></html>';
}

async function sendUrgentAlertsEmail(toEmail, analysis) {
  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set in .env');

  var urgent = (analysis.alerts || []).filter(function(a) { return a.urgency === 'URGENT'; });
  if (urgent.length === 0) return { skipped: true, reason: 'no URGENT alerts' };

  var resend = new Resend(apiKey);
  var from   = process.env.RESEND_FROM_EMAIL || 'StockSense AI <onboarding@resend.dev>';

  var result = await resend.emails.send({
    from:    from,
    to:      toEmail,
    subject: '\uD83D\uDD34 ' + urgent.length + ' URGENT Alert' + (urgent.length !== 1 ? 's' : '') + ' \u2014 StockSense AI',
    html:    buildEmailHtml(analysis.alerts, analysis.market_summary)
  });

  if (result.error) throw new Error(result.error.message || JSON.stringify(result.error));
  return { sent: true, id: result.data && result.data.id };
}

/* ─── Scheduler ─────────────────────────────────────────────────── */
async function scheduledCheck() {
  console.log('[scheduler] running check...');
  try {
    var articles = await fetchLatestNews();
    var analysis = await analyzeNews(articles);
    _cache       = analysis;
    _cacheTs     = Date.now();
    _lastChecked = new Date();
    console.log('[scheduler] done — ' + analysis.alerts.length + ' alerts, last checked ' + _lastChecked.toISOString());

    /* Send email if ALERT_EMAIL is configured in .env */
    var alertEmail = (process.env.ALERT_EMAIL || '').trim();
    if (alertEmail) {
      try {
        var emailResult = await sendUrgentAlertsEmail(alertEmail, analysis);
        console.log('[scheduler] email:', JSON.stringify(emailResult));
      } catch (emailErr) {
        console.error('[scheduler] email error:', emailErr.message);
      }
    }
  } catch (err) {
    console.error('[scheduler] error:', err.message);
  }
}

function startScheduler(intervalMinutes) {
  if (_scheduleTimer) {
    clearInterval(_scheduleTimer);
    _scheduleTimer = null;
  }
  _scheduleInterval = intervalMinutes || 0;
  if (_scheduleInterval <= 0) {
    console.log('[scheduler] disabled');
    return;
  }
  console.log('[scheduler] running every ' + _scheduleInterval + ' min');
  _scheduleTimer = setInterval(scheduledCheck, _scheduleInterval * 60 * 1000);
}

/* ─── GET /api/quotes — server-side Yahoo Finance proxy ─────────── */
/* Fetches from Yahoo Finance so the browser never needs CORS proxies.
   Source: Yahoo Finance JSON quote endpoint (free, ~15 min delayed).
   Endpoint: /api/quotes?symbols=AAPL,^GSPC&fields=regularMarketPrice,...  */
/* ─── HTTP fetch helpers ──────────────────────────────────────────────── */
/* Two implementations:                                                      */
/*   curlJSON  – uses system curl, honours https_proxy env var automatically */
/*   nodeGet   – uses Node.js https.get, works on Render (direct internet)  */
/* smartGet tries curl first; if it returns null it falls back to nodeGet.   */

var _BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function curlJSON(url) {
  return new Promise(function(resolve) {
    execFile('curl', [
      '-s', '--max-time', '10', '-L',
      '-H', 'User-Agent: ' + _BROWSER_UA,
      '-H', 'Accept: application/json,*/*',
      '-H', 'Accept-Language: en-US,en;q=0.9',
      url
    ], { maxBuffer: 4 * 1024 * 1024, timeout: 12000 }, function(err, stdout) {
      if (err || !stdout || !stdout.trim()) { resolve(null); return; }
      try { resolve(JSON.parse(stdout)); } catch(e) { resolve(null); }
    });
  });
}

function nodeGet(url) {
  return new Promise(function(resolve) {
    var opts = url_mod.parse(url);
    opts.headers = {
      'User-Agent': _BROWSER_UA,
      'Accept': 'application/json,*/*',
      'Accept-Language': 'en-US,en;q=0.9'
    };
    var req = https.get(opts, function(res) {
      if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); resolve(null); return; }
      var raw = '';
      res.on('data', function(c) { raw += c; });
      res.on('end', function() {
        try { resolve(JSON.parse(raw)); } catch(e) { resolve(null); }
      });
    });
    req.on('error', function() { resolve(null); });
    req.setTimeout(10000, function() { req.destroy(); resolve(null); });
  });
}

/* Try curl first (handles proxy env vars); fall back to Node.js https.get */
function smartGet(url) {
  return curlJSON(url).then(function(data) {
    if (data !== null) return data;
    return nodeGet(url);
  });
}

/* ─── Yahoo Finance chart endpoint (per-symbol) ───────────────────────── */
/* The /v7/finance/quote batch endpoint returns 429.                        */
/* The /v8/finance/chart/{sym} endpoint works for all symbol types:         */
/* equities, ETFs, indices (^GSPC), futures (GC=F), crypto, FX (GBPUSD=X). */
/* Tries query1 first, then query2 as fallback (some IP ranges hit 429).   */
function yahooChartFetch(symbol) {
  var path = '/v8/finance/chart/' + encodeURIComponent(symbol) + '?interval=1d&range=1d';
  var url1 = 'https://query1.finance.yahoo.com' + path;
  var url2 = 'https://query2.finance.yahoo.com' + path;
  return smartGet(url1).then(function(data) {
    if (data && data.chart && data.chart.result) return data;
    return smartGet(url2);  /* fallback to query2 host */
  }).then(function(data) {
    if (!data || !data.chart || !data.chart.result || !data.chart.result[0]) return null;
    var meta  = data.chart.result[0].meta;
    var price = meta.regularMarketPrice;
    var prev  = meta.chartPreviousClose;
    if (!price || price <= 0) return null;
    var chg   = (prev && prev > 0) ? ((price - prev) / prev * 100) : 0;
    var chgAbs= (prev && prev > 0) ? (price - prev) : 0;
    return {
      symbol:                     symbol,
      regularMarketPrice:         price,
      regularMarketChange:        parseFloat(chgAbs.toFixed(4)),
      regularMarketChangePercent: parseFloat(chg.toFixed(4)),
      regularMarketTime:          meta.regularMarketTime || Math.floor(Date.now() / 1000),
      /* extra fields available for getAccurateQuote */
      shortName:           meta.longName  || meta.shortName  || symbol,
      regularMarketVolume: meta.regularMarketVolume || null,
      regularMarketOpen:   meta.regularMarketOpen   || null,
      regularMarketDayHigh:meta.regularMarketDayHigh || null,
      regularMarketDayLow: meta.regularMarketDayLow  || null,
      fiftyTwoWeekHigh:    meta.fiftyTwoWeekHigh     || null,
      fiftyTwoWeekLow:     meta.fiftyTwoWeekLow      || null
    };
  }).catch(function() { return null; });
}

/* ─── Layer 1: Yahoo Finance batch (parallel per-symbol chart calls) ─── */
function yahooFetch(symbols) {
  var symList = String(symbols).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  return Promise.all(symList.map(yahooChartFetch)).then(function(results) {
    var filtered = results.filter(Boolean);
    return filtered.length > 0 ? { quoteResponse: { result: filtered, error: null } } : null;
  }).catch(function() { return null; });
}

/* ─── Layer 2: Alpha Vantage (backup, single symbol) ────────────── */
/* Free tier: 25 req/day, 5 req/min.  Only called when Yahoo misses a
   symbol or Layer 3 validation triggers a cross-check.
   Get a free key at https://www.alphavantage.co/support/#api-key
   and set ALPHA_VANTAGE_API_KEY in .env.                            */
/* ─── Layer 2: Alpha Vantage (backup, single symbol, via curl) ──────── */
/* Free tier: 25 req/day, 5 req/min.  Only called when Yahoo chart       */
/* misses a symbol.  Uses curl (like yahooFetch) so it honours the       */
/* system proxy and avoids Node's EAI_AGAIN DNS issue.                   */
function alphaVantageFetch(symbol) {
  var avKey = (process.env.ALPHA_VANTAGE_API_KEY || '').trim();
  if (!avKey) return Promise.resolve(null);
  var url = 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE' +
            '&symbol=' + encodeURIComponent(symbol) +
            '&apikey=' + encodeURIComponent(avKey);
  return smartGet(url).then(function(data) {
    if (!data) return null;
    var gq = data['Global Quote'];
    if (!gq || !gq['05. price']) return null;
    var price  = parseFloat(gq['05. price']);
    var chg    = parseFloat((gq['10. change percent'] || '0%').replace('%', ''));
    var dayStr = gq['07. latest trading day'] || '';
    if (!price || price <= 0) return null;
    var ts = dayStr ? new Date(dayStr + 'T21:00:00Z') : new Date(0);
    return { price: price, chg: chg, ts: ts };
  }).catch(function() { return null; });
}

/* ─── Layer 3: Validation logic ─────────────────────────────────── */
/* Rules:
   1. If both sources disagree by >2%, pick the one with the more
      recent timestamp.
   2. If Yahoo data is ≥5 min older than Alpha Vantage data, prefer AV.
   3. Otherwise default to Yahoo (batch-capable, primary source).      */
var STALE_MS       = 5 * 60 * 1000;  /* 5 minutes */
var PRICE_DISAGREE = 0.02;            /* 2 % */

function pickBestSource(yfQuote, avResult, symbol) {
  if (!avResult) return 'yf';   /* No AV data — always use Yahoo */

  var yfPrice = yfQuote.regularMarketPrice || 0;
  var avPrice = avResult.price;
  var yfTs    = yfQuote.regularMarketTime
                  ? new Date(yfQuote.regularMarketTime * 1000)
                  : new Date(0);
  var avTs    = avResult.ts;
  var now     = Date.now();

  /* Rule 1 — price disagreement */
  if (yfPrice > 0 && avPrice > 0) {
    var diff = Math.abs(yfPrice - avPrice) / Math.max(yfPrice, avPrice);
    if (diff > PRICE_DISAGREE) {
      var winner = (now - yfTs.getTime()) <= (now - avTs.getTime()) ? 'yf' : 'av';
      console.log('[validate] ' + symbol + ': prices disagree YF=' + yfPrice.toFixed(2) +
                  ' AV=' + avPrice.toFixed(2) + ' (' + (diff * 100).toFixed(1) +
                  '%) → using ' + winner.toUpperCase() + ' (fresher timestamp)');
      return winner;
    }
  }

  /* Rule 2 — staleness: AV is measurably fresher than YF */
  if (avTs.getTime() - yfTs.getTime() > STALE_MS) {
    console.log('[validate] ' + symbol + ': YF timestamp is ' +
                Math.round((avTs.getTime() - yfTs.getTime()) / 60000) +
                ' min older than AV → using AV');
    return 'av';
  }

  return 'yf';  /* Rule 3 — default to Yahoo */
}

/* ════════════════════════════════════════════════════════════════
   QUOTE CACHE  (per-symbol, TTL-aware)
   ─────────────────────────────────────────────────────────────
   TTL shrinks when markets are open so traders always see fresh
   data without hammering Yahoo Finance on every render tick.
     open      →  30 s
     pre/post  →  60 s
     closed    → 300 s  (5 min)
════════════════════════════════════════════════════════════════ */
var QUOTE_CACHE = {};   /* { [SYM]: { data: QuoteData, cachedAt: number } } */

function _cacheTTL(marketStatus) {
  if (marketStatus === 'open')                     return 30  * 1000;
  if (marketStatus === 'pre' || marketStatus === 'post') return 60  * 1000;
  return 300 * 1000;
}

function quoteCacheGet(sym) {
  var entry = QUOTE_CACHE[sym];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > _cacheTTL(entry.data.marketStatus)) {
    delete QUOTE_CACHE[sym];
    return null;
  }
  var out = Object.assign({}, entry.data);
  out.fromCache  = true;
  out.cacheAgeSec = Math.round((Date.now() - entry.cachedAt) / 1000);
  return out;
}

function quoteCacheSet(sym, data) {
  QUOTE_CACHE[sym] = { data: data, cachedAt: Date.now() };
}

/* ════════════════════════════════════════════════════════════════
   RETRY FETCH
   Wraps any function that returns Promise<T|null>.
   Retries on null/throw with exponential backoff.
════════════════════════════════════════════════════════════════ */
function retryFetch(fn, maxAttempts, baseMs) {
  maxAttempts = maxAttempts || 3;
  baseMs      = baseMs      || 500;
  return new Promise(function(resolve) {
    var attempt = 0;
    function tryOnce() {
      var p;
      try { p = fn(); } catch(e) { p = Promise.resolve(null); }
      p.then(function(result) {
        if (result !== null && result !== undefined) { resolve(result); return; }
        attempt++;
        if (attempt >= maxAttempts) { resolve(null); return; }
        setTimeout(tryOnce, baseMs * Math.pow(2, attempt - 1));
      }).catch(function() {
        attempt++;
        if (attempt >= maxAttempts) { resolve(null); return; }
        setTimeout(tryOnce, baseMs * Math.pow(2, attempt - 1));
      });
    }
    tryOnce();
  });
}

/* ════════════════════════════════════════════════════════════════
   EXCHANGE HOURS + MARKET STATUS DETECTION
   ─────────────────────────────────────────────────────────────
   All times are local-exchange wall-clock.
   Lunch breaks (HK/China) handled via split-session hours.
   Holiday calendar is simplified — a production app would query
   a holiday API (e.g. Open Exchange Rates or exchangerate.host).
════════════════════════════════════════════════════════════════ */
var EXCHANGES = {
  US:   { tz:'America/New_York', open:[9,30],  close:[16,0],  pre:[4,0],   post:[20,0],  delay:15 },
  LSE:  { tz:'Europe/London',    open:[8,0],   close:[16,30], pre:null,    post:null,    delay:15 },
  EUR:  { tz:'Europe/Berlin',    open:[9,0],   close:[17,30], pre:null,    post:null,    delay:15 },
  HKEX: { tz:'Asia/Hong_Kong',   open:[9,30],  close:[16,0],  pre:null,    post:null,    delay:15,
          lunch:[12,0,13,0] },   /* morning: 09:30-12:00, afternoon: 13:00-16:00 */
  SSE:  { tz:'Asia/Shanghai',    open:[9,30],  close:[15,0],  pre:null,    post:null,    delay:0,
          lunch:[11,30,13,0] },  /* morning: 09:30-11:30, afternoon: 13:00-15:00 */
  SZSE: { tz:'Asia/Shanghai',    open:[9,30],  close:[15,0],  pre:null,    post:null,    delay:0,
          lunch:[11,30,13,0] }
};

function getExchangeKey(sym) {
  var u = sym.toUpperCase();
  if (u.endsWith('.L'))                                                    return 'LSE';
  if (u.endsWith('.DE') || u.endsWith('.PA') || u.endsWith('.AS') ||
      u.endsWith('.MI') || u.endsWith('.BR') || u.endsWith('.MC') ||
      u.endsWith('.LS') || u.endsWith('.HE'))                              return 'EUR';
  if (u.endsWith('.HK'))                                                   return 'HKEX';
  if (u.endsWith('.SS'))                                                   return 'SSE';
  if (u.endsWith('.SZ'))                                                   return 'SZSE';
  return 'US';
}

function _localTimeParts(tz) {
  var parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    weekday: 'short', hour: 'numeric', minute: 'numeric'
  }).formatToParts(new Date());
  var m = {};
  parts.forEach(function(p) { m[p.type] = p.value; });
  return { weekday: m.weekday, h: parseInt(m.hour, 10), min: parseInt(m.minute, 10) };
}

/* Returns 'open' | 'pre' | 'post' | 'lunch' | 'closed' */
function getMarketStatus(sym) {
  var key = getExchangeKey(sym);
  var ex  = EXCHANGES[key];
  var t   = _localTimeParts(ex.tz);
  var day = t.weekday;                /* 'Mon' … 'Sun' */
  var now = t.h * 60 + t.min;        /* minutes since midnight */

  if (day === 'Sat' || day === 'Sun') return 'closed';

  var openMins  = ex.open[0]  * 60 + ex.open[1];
  var closeMins = ex.close[0] * 60 + ex.close[1];

  /* Lunch break (HK / China) */
  if (ex.lunch) {
    var lunchStart = ex.lunch[0] * 60 + ex.lunch[1];
    var lunchEnd   = ex.lunch[2] * 60 + ex.lunch[3];
    if (now >= lunchStart && now < lunchEnd) return 'lunch';
  }

  if (now >= openMins && now < closeMins) return 'open';

  /* US pre / post market */
  if (ex.pre) {
    var preMins  = ex.pre[0]  * 60 + ex.pre[1];
    var postMins = ex.post[0] * 60 + ex.post[1];
    if (now >= preMins  && now < openMins)  return 'pre';
    if (now >= closeMins && now < postMins) return 'post';
  }

  return 'closed';
}

/* ════════════════════════════════════════════════════════════════
   DATA QUALITY VALIDATION
   Reject obviously bad data: zero/negative price, absurd daily move
════════════════════════════════════════════════════════════════ */
function validateQuoteQuality(price, changePct) {
  if (!price || price <= 0)             return false;
  if (Math.abs(changePct || 0) > 60)   return false; /* >60% 1-day move → suspect */
  return true;
}

/* ════════════════════════════════════════════════════════════════
   getAccurateQuote(symbol) — universal single-symbol pipeline
   ─────────────────────────────────────────────────────────────
   Returns QuoteData:
   {
     symbol, name, price, change, changePercent,
     timestamp,        // ISO-8601 — when the price was recorded
     fetchedAt,        // ISO-8601 — when we fetched from source
     source,           // 'yahoo' | 'alphavantage' | 'cache'
     isDelayed,        // true for most free feeds
     delayMinutes,     // how many minutes the feed is delayed
     marketStatus,     // 'open'|'pre'|'post'|'lunch'|'closed'
     confidence,       // 'high'|'medium'|'low'
     isStale,          // true if data age > 30 min
     dataAgeMinutes,
     fromCache,        // true if served from in-process cache
     cacheAgeSec       // seconds since cached (only when fromCache)
   }
════════════════════════════════════════════════════════════════ */
async function getAccurateQuote(symbol) {
  var sym = symbol.toUpperCase().replace(/[^A-Z0-9.^=\-]/g, '');

  /* ── Layer 0: in-process cache ── */
  var cached = quoteCacheGet(sym);
  if (cached) {
    console.log('[quote] ' + sym + ': cache hit (' + cached.cacheAgeSec + 's old)');
    return cached;
  }

  var marketStatus = getMarketStatus(sym);
  var exKey        = getExchangeKey(sym);
  var delayMins    = EXCHANGES[exKey].delay;
  var fetchedAt    = new Date().toISOString();
  var yfResult     = null;
  var avResult     = null;

  /* ── Layer 1: Yahoo Finance with retry ── */
  var yfFields = [
    'regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent',
    'regularMarketTime',  'regularMarketVolume',
    'shortName',          'longName',
    'regularMarketOpen',  'regularMarketDayHigh', 'regularMarketDayLow',
    'fiftyTwoWeekHigh',   'fiftyTwoWeekLow',
    'marketCap',          'trailingPE'
  ].join(',');

  var yfRaw = await retryFetch(function() {
    return yahooFetch(sym, yfFields);
  }, 3, 500);

  if (yfRaw && yfRaw.quoteResponse && yfRaw.quoteResponse.result &&
      yfRaw.quoteResponse.result.length > 0) {
    var q = yfRaw.quoteResponse.result[0];
    if (validateQuoteQuality(q.regularMarketPrice, q.regularMarketChangePercent)) {
      yfResult = {
        price:   q.regularMarketPrice,
        change:  q.regularMarketChange          || 0,
        chgPct:  q.regularMarketChangePercent   || 0,
        ts:      q.regularMarketTime ? new Date(q.regularMarketTime * 1000) : null,
        name:    q.shortName || q.longName      || sym,
        volume:  q.regularMarketVolume          || null,
        open:    q.regularMarketOpen            || null,
        high:    q.regularMarketDayHigh         || null,
        low:     q.regularMarketDayLow          || null,
        high52:  q.fiftyTwoWeekHigh             || null,
        low52:   q.fiftyTwoWeekLow              || null,
        mktCap:  q.marketCap                    || null,
        pe:      q.trailingPE                   || null
      };
    }
  }

  /* ── Layer 2: Alpha Vantage — only when Yahoo fails ── */
  if (!yfResult) {
    avResult = await retryFetch(function() {
      return alphaVantageFetch(sym);
    }, 2, 1000);
  }

  /* ── Layer 3: pick best source (comparison only when both exist) ── */
  var finalPrice, finalChange, finalChgPct, finalTs, finalSource, confidence;

  if (yfResult && !avResult) {
    finalPrice  = yfResult.price;  finalChange = yfResult.change;
    finalChgPct = yfResult.chgPct; finalTs     = yfResult.ts;
    finalSource = 'yahoo';         confidence  = 'high';

  } else if (!yfResult && avResult) {
    finalPrice  = avResult.price;  finalChange = null;
    finalChgPct = avResult.chg;    finalTs     = avResult.ts;
    finalSource = 'alphavantage';  confidence  = 'medium';

  } else if (yfResult && avResult) {
    var choice = pickBestSource(
      { regularMarketPrice: yfResult.price,
        regularMarketTime:  yfResult.ts ? Math.floor(yfResult.ts.getTime() / 1000) : 0 },
      avResult, sym
    );
    if (choice === 'av') {
      finalPrice  = avResult.price;  finalChange = null;
      finalChgPct = avResult.chg;    finalTs     = avResult.ts;
      finalSource = 'alphavantage';  confidence  = 'medium';
    } else {
      finalPrice  = yfResult.price;  finalChange = yfResult.change;
      finalChgPct = yfResult.chgPct; finalTs     = yfResult.ts;
      finalSource = 'yahoo';         confidence  = 'high';
    }

  } else {
    /* Both sources failed */
    console.warn('[quote] ' + sym + ': all sources exhausted');
    return {
      symbol: sym, error: 'No data available from any source',
      marketStatus: marketStatus, fetchedAt: fetchedAt, confidence: 'none',
      fromCache: false
    };
  }

  /* ── Staleness check ── */
  var tsMs           = finalTs ? finalTs.getTime() : 0;
  var dataAgeMs      = Date.now() - tsMs;
  var STALE_THRESHOLD = 30 * 60 * 1000; /* 30 min — reasonable for delayed feeds */
  var isStale        = tsMs > 0 && dataAgeMs > STALE_THRESHOLD;
  /* Lower confidence when stale */
  if (isStale && confidence === 'high') confidence = 'medium';

  var quoteData = {
    symbol:         sym,
    name:           yfResult ? yfResult.name : sym,
    price:          parseFloat(finalPrice.toFixed(6)),
    change:         finalChange !== null ? parseFloat(finalChange.toFixed(6)) : null,
    changePercent:  parseFloat(finalChgPct.toFixed(4)),
    /* Extended fields — present only when from Yahoo */
    open:           yfResult ? yfResult.open   : null,
    high:           yfResult ? yfResult.high   : null,
    low:            yfResult ? yfResult.low    : null,
    high52:         yfResult ? yfResult.high52 : null,
    low52:          yfResult ? yfResult.low52  : null,
    volume:         yfResult ? yfResult.volume : null,
    marketCap:      yfResult ? yfResult.mktCap : null,
    pe:             yfResult ? yfResult.pe     : null,
    /* Metadata — always present */
    timestamp:      finalTs ? finalTs.toISOString() : null,
    fetchedAt:      fetchedAt,
    source:         finalSource,
    isDelayed:      delayMins > 0,
    delayMinutes:   delayMins,
    marketStatus:   marketStatus,
    confidence:     confidence,
    isStale:        isStale,
    dataAgeMinutes: tsMs > 0 ? Math.round(dataAgeMs / 60000) : null,
    fromCache:      false
  };

  quoteCacheSet(sym, quoteData);
  console.log('[quote] ' + sym + ': ' + finalPrice.toFixed(2) +
              ' (' + finalSource + ', ' + marketStatus + ', conf=' + confidence + ')');
  return quoteData;
}

/* ─── GET /api/quote/:symbol ────────────────────────────────────── */
async function handleSingleQuote(symbol, res) {
  try {
    var data = await getAccurateQuote(symbol);
    sendJSON(res, data.error ? 404 : 200, data);
  } catch(err) {
    sendJSON(res, 502, { error: err.message });
  }
}

/* ─── /api/quotes — 3-layer data pipeline ───────────────────────── */
async function handleQuotes(req, res) {
  var parsed     = url_mod.parse(req.url, true);
  var symbols    = (parsed.query.symbols || '').trim();
  var fields     = (parsed.query.fields  ||
                    'regularMarketPrice,regularMarketChangePercent,regularMarketTime').trim();
  if (!symbols) return sendJSON(res, 400, { error: 'symbols parameter required' });

  var symbolList = symbols.split(',').map(function(s) { return s.trim(); }).filter(Boolean);

  /* ── Layer 1: Yahoo Finance (batch) ── */
  var yfData = await yahooFetch(symbols, fields);
  var yfMap  = {};
  if (yfData && yfData.quoteResponse && yfData.quoteResponse.result) {
    yfData.quoteResponse.result.forEach(function(q) {
      if (q.symbol) yfMap[q.symbol] = q;
    });
  }

  /* Identify symbols Yahoo missed or returned a zero price for */
  var needBackup = symbolList.filter(function(s) {
    var q = yfMap[s];
    return !q || !(q.regularMarketPrice > 0);
  });

  /* ── Layer 2: Alpha Vantage for symbols Yahoo missed ── */
  /* Cap at 5 per request to stay within the 5 req/min free limit */
  var avMap = {};
  if (needBackup.length > 0) {
    var batch     = needBackup.slice(0, 5);
    var avResults = await Promise.all(batch.map(alphaVantageFetch));
    batch.forEach(function(sym, i) {
      if (avResults[i]) avMap[sym] = avResults[i];
    });
  }

  /* ── Layer 3: Validation — build the final result array ── */
  var finalResults = [];
  symbolList.forEach(function(sym) {
    var yfQ = yfMap[sym];
    var avR = avMap[sym];

    if (yfQ && yfQ.regularMarketPrice > 0) {
      /* Yahoo returned data — validate against AV if available */
      var choice = pickBestSource(yfQ, avR, sym);
      if (choice === 'av' && avR) {
        finalResults.push({
          symbol:                     sym,
          regularMarketPrice:         avR.price,
          regularMarketChangePercent: avR.chg,
          regularMarketTime:          Math.floor(avR.ts.getTime() / 1000),
          _dataSource:                'alphavantage'
        });
      } else {
        yfQ._dataSource = 'yahoo';
        finalResults.push(yfQ);
      }
    } else if (avR) {
      /* Yahoo failed — use Alpha Vantage backup */
      console.log('[quotes] ' + sym + ': Yahoo unavailable, using Alpha Vantage backup');
      finalResults.push({
        symbol:                     sym,
        regularMarketPrice:         avR.price,
        regularMarketChangePercent: avR.chg,
        regularMarketTime:          Math.floor(avR.ts.getTime() / 1000),
        _dataSource:                'alphavantage'
      });
    } else {
      /* Both sources failed for this symbol */
      console.warn('[quotes] ' + sym + ': no data from Yahoo Finance or Alpha Vantage');
    }
  });

  var missing = symbolList.length - finalResults.length;
  sendJSON(res, 200, {
    quoteResponse: {
      result: finalResults,
      error:  missing > 0 ? missing + ' symbol(s) unavailable from all sources' : null
    }
  });
}

/* ─── GET /api/health ───────────────────────────────────────────── */
function handleHealth(res) {
  var avKey        = (process.env.ALPHA_VANTAGE_API_KEY || '').trim();
  var claudeKey    = (process.env.ANTHROPIC_API_KEY    || '').trim();
  var cacheSymbols = Object.keys(QUOTE_CACHE);
  var cacheEntries = cacheSymbols.slice(0, 60).map(function(sym) {
    var e = QUOTE_CACHE[sym];
    return {
      symbol:     sym,
      ageS:       Math.round((Date.now() - e.cachedAt) / 1000),
      source:     e.data.source     || '?',
      mktStatus:  e.data.marketStatus || '?',
      confidence: e.data.confidence || '?'
    };
  });
  sendJSON(res, 200, {
    status:     'ok',
    uptime:     Math.floor(process.uptime()),
    memoryMB:   Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    quoteCache: { size: cacheSymbols.length, entries: cacheEntries },
    alphaVantage: {
      configured: !!avKey,
      dailyLimit: 25,
      note: avKey ? 'key configured' : 'Not configured — set ALPHA_VANTAGE_API_KEY in Render environment variables'
    },
    claude: {
      configured: !!claudeKey,
      note: claudeKey ? 'key configured' : 'Not configured — set ANTHROPIC_API_KEY in Render environment variables'
    },
    newsCache: {
      hasData:    !!_cache,
      ageMinutes: _cacheTs ? Math.round((Date.now() - _cacheTs) / 60000) : null,
      alertCount: (_cache && _cache.alerts) ? _cache.alerts.length : 0
    }
  });
}

/* ─── GET /api/status ───────────────────────────────────────────── */
function handleStatus(res) {
  var urgentCount = _cache
    ? _cache.alerts.filter(function(a) { return a.urgency === 'URGENT'; }).length
    : 0;
  sendJSON(res, 200, {
    lastChecked:      _lastChecked ? _lastChecked.toISOString() : null,
    urgentCount:      urgentCount,
    scheduleInterval: _scheduleInterval
  });
}

/* ─── POST /api/schedule ────────────────────────────────────────── */
async function handleScheduleUpdate(req, res) {
  var body     = await readBody(req);
  var interval = parseInt(body.interval, 10);
  if (isNaN(interval) || interval < 0) {
    return sendJSON(res, 400, { error: 'interval must be a non-negative integer (minutes)' });
  }
  startScheduler(interval);
  sendJSON(res, 200, { scheduleInterval: _scheduleInterval, active: _scheduleInterval > 0 });
}

/* ─── /api/analyze ──────────────────────────────────────────────── */
async function handleAnalyze(res) {
  var now = Date.now();
  if (_cache && (now - _cacheTs) < CACHE_TTL) {
    console.log('[server] serving cached analysis (' +
      Math.round((now - _cacheTs) / 1000) + 's old)');
    return sendJSON(res, 200, _cache);
  }

  try {
    console.log('[server] fetching latest news...');
    var articles = await fetchLatestNews();
    console.log('[server] ' + articles.length + ' articles fetched — calling Claude...');
    var analysis = await analyzeNews(articles);
    _cache   = analysis;
    _cacheTs = now;
    console.log('[server] analysis done: ' + analysis.alerts.length + ' alerts');
    sendJSON(res, 200, analysis);
  } catch (err) {
    console.error('[server] /api/analyze error:', err.message);
    sendJSON(res, 500, { error: err.message, alerts: [], market_summary: '' });
  }
}

/* ─── POST /api/check-news ──────────────────────────────────────── */
async function handleCheckNews(req, res) {
  var body       = await readBody(req);
  var emailAlerts = body.emailAlerts === true;
  var alertEmail  = typeof body.alertEmail === 'string' ? body.alertEmail.trim() : '';

  /* Re-use shared cache */
  var now = Date.now();
  var analysis;
  if (_cache && (now - _cacheTs) < CACHE_TTL) {
    console.log('[server] /api/check-news: serving cached analysis');
    analysis = _cache;
  } else {
    try {
      console.log('[server] /api/check-news: fetching news...');
      var articles = await fetchLatestNews();
      console.log('[server] ' + articles.length + ' articles — calling Claude...');
      analysis = await analyzeNews(articles);
      _cache   = analysis;
      _cacheTs = now;
      console.log('[server] analysis done: ' + analysis.alerts.length + ' alerts');
    } catch (err) {
      console.error('[server] /api/check-news error:', err.message);
      return sendJSON(res, 500, { error: err.message, alerts: [], market_summary: '' });
    }
  }

  /* Optionally send email for URGENT alerts */
  var emailResult = { skipped: true, reason: 'email alerts not enabled' };
  if (emailAlerts && alertEmail) {
    try {
      emailResult = await sendUrgentAlertsEmail(alertEmail, analysis);
      console.log('[server] email result:', JSON.stringify(emailResult));
    } catch (emailErr) {
      console.error('[server] email error:', emailErr.message);
      emailResult = { error: emailErr.message };
    }
  }

  _lastChecked = new Date();
  sendJSON(res, 200, Object.assign({}, analysis, {
    email:       emailResult,
    lastChecked: _lastChecked.toISOString()
  }));
}

/* ─── HTTP server ───────────────────────────────────────────────── */
var server = http.createServer(function(req, res) {
  var url = req.url.split('?')[0];

  /* CORS preflight */
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  /* API routes */
  var singleQuoteMatch = url.match(/^\/api\/quote\/([A-Za-z0-9.\-^=]+)$/);
  if (singleQuoteMatch && req.method === 'GET') {
    return handleSingleQuote(singleQuoteMatch[1], res);
  }
  if (url === '/api/quotes' && req.method === 'GET') {
    return handleQuotes(req, res);
  }
  if (url === '/api/analyze') {
    return handleAnalyze(res);
  }
  if (url === '/api/check-news' && req.method === 'POST') {
    return handleCheckNews(req, res);
  }
  if (url === '/api/health' && req.method === 'GET') {
    return handleHealth(res);
  }
  if (url === '/api/status' && req.method === 'GET') {
    return handleStatus(res);
  }
  if (url === '/api/schedule' && req.method === 'POST') {
    return handleScheduleUpdate(req, res);
  }

  /* Static files */
  var filePath = (url === '/' || url === '/index.html')
    ? path.join(__dirname, 'index.html')
    : path.join(__dirname, url);

  /* Basic path traversal guard */
  if (filePath.indexOf(__dirname) !== 0) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  serveStatic(res, filePath);
});

server.listen(PORT, function() {
  console.log('StockSense AI running → http://localhost:' + PORT);
  /* Start server-side scheduler from env (default 60 min) */
  var envInterval = parseInt(process.env.SCHEDULE_INTERVAL || '60', 10);
  startScheduler(isNaN(envInterval) ? 60 : envInterval);
});
