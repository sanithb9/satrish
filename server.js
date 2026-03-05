'use strict';

require('dotenv').config();
const http      = require('http');
const https     = require('https');
const url_mod   = require('url');
const fs        = require('fs');
const path      = require('path');
const { execFile } = require('child_process');
const os           = require('os');

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
var _BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/* curl-based fetch — honours https_proxy env var automatically */
function curlJSON(url, extraArgs) {
  return new Promise(function(resolve) {
    var args = [
      '-s', '--max-time', '10', '-L',
      '-w', '\n__STATUS__:%{http_code}',   /* append HTTP status for logging */
      '-H', 'User-Agent: ' + _BROWSER_UA,
      '-H', 'Accept: application/json,*/*',
      '-H', 'Accept-Language: en-US,en;q=0.9',
      '-H', 'Referer: https://finance.yahoo.com'
    ].concat(extraArgs || []).concat([url]);
    execFile('curl', args, { maxBuffer: 4 * 1024 * 1024, timeout: 12000 }, function(err, stdout, stderr) {
      /* Split off the status trailer we appended */
      var raw    = stdout || '';
      var marker = raw.lastIndexOf('\n__STATUS__:');
      var body   = marker >= 0 ? raw.slice(0, marker) : raw;
      var status = marker >= 0 ? raw.slice(marker + '\n__STATUS__:'.length).trim() : '?';

      if (err) {
        console.error('[curl] ERROR url=' + url.slice(0, 120) +
                      ' code=' + err.code + ' killed=' + err.killed +
                      (stderr ? ' stderr=' + stderr.slice(0, 200) : ''));
        resolve(null); return;
      }
      if (!body || !body.trim()) {
        console.warn('[curl] EMPTY body url=' + url.slice(0, 120) + ' http=' + status);
        resolve(null); return;
      }
      try {
        resolve(JSON.parse(body));
      } catch(e) {
        console.warn('[curl] JSON parse failed url=' + url.slice(0, 120) +
                     ' http=' + status + ' body=' + body.slice(0, 200));
        resolve(null);
      }
    });
  });
}

/* Node.js https.get — direct internet, no proxy needed (used on Render) */
function nodeGet(url, extraHeaders) {
  return new Promise(function(resolve) {
    var opts = url_mod.parse(url);
    opts.headers = Object.assign({
      'User-Agent': _BROWSER_UA,
      'Accept': 'application/json,*/*',
      'Accept-Language': 'en-US,en;q=0.9'
    }, extraHeaders || {});
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

/* Plain fetch without cookies (Alpha Vantage, other non-Yahoo APIs) */
function smartGet(url) {
  return curlJSON(url).then(function(d) { return d !== null ? d : nodeGet(url); });
}

/* ─── Yahoo Finance cookie + crumb session ────────────────────────────── */
/* Since 2024 Yahoo Finance requires a valid A3 cookie and crumb token for  */
/* server-side API calls.  We obtain them by:                               */
/*   1. GET https://fc.yahoo.com  → saves A3/A1 cookies                    */
/*   2. GET /v1/test/getcrumb     → returns the crumb string                */
/* Both are cached for 4 hours and refreshed automatically.                  */
var _COOKIE_JAR  = path.join(os.tmpdir(), 'yf_cookies_' + process.pid + '.txt');
var _yahooCrumb  = { value: null, ts: 0 };
var CRUMB_TTL    = 4 * 60 * 60 * 1000;  /* 4 hours */

/* ── Yahoo 429 circuit-breaker ──────────────────────────────────────────
   When Yahoo returns 429 we back off for YAHOO_429_COOLDOWN ms before
   sending any more requests.  This prevents the "crumb=Too%20Many%20Requests"
   cascade where every symbol URL carries a poisoned crumb and burns the AV
   quota trying to cover the resulting failures.                           */
var YAHOO_429_COOLDOWN  = 10 * 60 * 1000; /* 10 minutes */
var _yahoo429Until      = 0;
var STOOQ_429_COOLDOWN  =  5 * 60 * 1000; /* 5 minutes */
var _stooq429Until      = 0;
var _cg429Until         = 0;
var _cg429Count         = 0;  /* consecutive 429s — drives exponential backoff */

function yahooIsBlocked() {
  if (_yahoo429Until && Date.now() < _yahoo429Until) {
    return Math.ceil((_yahoo429Until - Date.now()) / 1000);  /* seconds remaining */
  }
  _yahoo429Until = 0;
  return 0;
}

function yahooSet429() {
  _yahoo429Until = Date.now() + YAHOO_429_COOLDOWN;
  _yahooCrumb.value = null;
  console.error('[yahoo] 429 detected — circuit open for ' + (YAHOO_429_COOLDOWN / 60000) + ' min until ' +
                new Date(_yahoo429Until).toISOString());
}

function stooqIsBlocked() {
  if (_stooq429Until && Date.now() < _stooq429Until) {
    return Math.ceil((_stooq429Until - Date.now()) / 1000);
  }
  _stooq429Until = 0;
  return 0;
}
function stooqSet429() {
  _stooq429Until = Date.now() + STOOQ_429_COOLDOWN;
  console.error('[stooq] 429 detected — circuit open for ' + (STOOQ_429_COOLDOWN / 60000) + ' min until ' +
                new Date(_stooq429Until).toISOString());
}

function cgIsBlocked() {
  if (_cg429Until && Date.now() < _cg429Until) {
    return Math.ceil((_cg429Until - Date.now()) / 1000);
  }
  _cg429Until = 0;
  return 0;
}
function cgSet429() {
  _cg429Count++;
  /* Exponential backoff: 5 → 10 → 20 → 30 min cap.
     Without this, a single request per cycle keeps resetting the timer and
     crypto data stays dark indefinitely on a rate-limited IP. */
  var cooldownMs = Math.min(5 * Math.pow(2, _cg429Count - 1), 30) * 60 * 1000;
  _cg429Until = Date.now() + cooldownMs;
  console.error('[coingecko] 429 #' + _cg429Count + ' — circuit open for ' +
                Math.round(cooldownMs / 60000) + ' min (backoff x' + _cg429Count + ') until ' +
                new Date(_cg429Until).toISOString());
}
function cgReset429() {
  /* Call this when a CoinGecko request succeeds so the backoff counter resets */
  if (_cg429Count > 0) {
    console.log('[coingecko] circuit closed after ' + _cg429Count + ' consecutive 429s');
    _cg429Count = 0;
  }
  _cg429Until = 0;
}

function refreshYahooCrumb() {
  return new Promise(function(resolve) {
    /* Step 1 — visit finance.yahoo.com to collect session cookies on .yahoo.com domain.
       Use -o /dev/null to discard the large HTML body; without this, execFile's default
       maxBuffer (1 MB) is exceeded and curl is killed before it can write the cookie jar. */
    execFile('curl', [
      '-s', '--max-time', '15', '-L',
      '-c', _COOKIE_JAR,
      '-o', '/dev/null',
      '-w', '%{http_code}',
      '-H', 'User-Agent: ' + _BROWSER_UA,
      '-H', 'Accept: text/html,application/xhtml+xml,*/*',
      '-H', 'Accept-Language: en-US,en;q=0.9',
      'https://finance.yahoo.com'
    ], { timeout: 16000 }, function(err1, status1, stderr1) {
      var httpStatus = (status1 || '').trim();
      if (err1) {
        console.error('[yahoo] cookie step FAILED err=' + err1.message +
                      (stderr1 ? ' stderr=' + stderr1.slice(0, 200) : ''));
      } else {
        /* Count cookies saved so we know if jar is empty */
        var cookieCount = 0;
        try {
          var jar = fs.readFileSync(_COOKIE_JAR, 'utf8');
          cookieCount = jar.split('\n').filter(function(l) {
            return l && !l.startsWith('#');
          }).length;
        } catch(e) {}
        console.log('[yahoo] cookie step http=' + httpStatus + ' jar=' + _COOKIE_JAR +
                    ' cookies=' + cookieCount);
      }

      /* Step 2 — exchange cookies for a crumb.
         Append HTTP status so we can detect 429 before poisoning _yahooCrumb. */
      execFile('curl', [
        '-s', '--max-time', '10',
        '-b', _COOKIE_JAR, '-c', _COOKIE_JAR,
        '-H', 'User-Agent: ' + _BROWSER_UA,
        '-H', 'Accept: */*',
        '-H', 'Referer: https://finance.yahoo.com',
        '-w', '\n__STATUS__:%{http_code}',
        'https://query1.finance.yahoo.com/v1/test/getcrumb'
      ], { timeout: 12000 }, function(err, stdout, stderr) {
        var raw    = stdout || '';
        var marker = raw.lastIndexOf('\n__STATUS__:');
        var body   = (marker >= 0 ? raw.slice(0, marker) : raw).trim();
        var status = marker >= 0 ? raw.slice(marker + '\n__STATUS__:'.length).trim() : '?';

        /* A valid crumb is a short token with no whitespace — never an HTTP error message */
        var isValidCrumb = !err &&
                           body.length > 0 &&
                           body.length < 64 &&
                           !/\s/.test(body) &&        /* no spaces → rejects "Too Many Requests" */
                           body[0] !== '<' &&
                           body[0] !== '{';

        if (status === '429' || body.toLowerCase().includes('too many')) {
          console.error('[yahoo] crumb endpoint 429 — triggering circuit breaker');
          yahooSet429();
          resolve(null);
        } else if (isValidCrumb) {
          _yahooCrumb.value = body;
          _yahooCrumb.ts    = Date.now();
          console.log('[yahoo] crumb ok (' + body.length + ' chars) http=' + status);
          resolve(body);
        } else {
          console.error('[yahoo] crumb FAILED http=' + status +
                        ' err=' + (err ? err.message : 'none') +
                        ' body=' + JSON.stringify(body.slice(0, 120)) +
                        (stderr ? ' stderr=' + stderr.slice(0, 200) : ''));
          resolve(null);
        }
      });
    });
  });
}

function getYahooCrumb() {
  if (_yahooCrumb.value && (Date.now() - _yahooCrumb.ts) < CRUMB_TTL) {
    return Promise.resolve(_yahooCrumb.value);
  }
  return refreshYahooCrumb();
}

/* ─── Yahoo Finance chart endpoint (per-symbol) ───────────────────────── */
/* Uses cookie jar + crumb for authenticated requests (required since 2024) */
function yahooChartFetch(symbol) {
  /* Check circuit-breaker before even attempting a request */
  var blocked = yahooIsBlocked();
  if (blocked) {
    console.warn('[yahoo] circuit open for ' + blocked + 's — skipping ' + symbol);
    return Promise.resolve(null);
  }
  return getYahooCrumb().then(function(crumb) {
    var qs   = '?interval=1d&range=1d' + (crumb ? '&crumb=' + encodeURIComponent(crumb) : '');
    var path = '/v8/finance/chart/' + encodeURIComponent(symbol) + qs;
    /* Build cookie args — include jar only if it was written successfully */
    var cookieArgs = [];
    try {
      if (_yahooCrumb.value && fs.existsSync(_COOKIE_JAR)) {
        cookieArgs = ['-b', _COOKIE_JAR];
      }
    } catch(e) {}
    /* Try query1, fall back to query2.
       If either returns 429 trip the circuit-breaker immediately — no point
       sending query2 (same IP, same rate-limit) or touching the other symbols. */
    var q1url = 'https://query1.finance.yahoo.com' + path;
    var q2url = 'https://query2.finance.yahoo.com' + path;

    /* Wrap curlJSON to intercept 429 bodies before they reach the JSON parser */
    function chartFetch(url) {
      /* We rely on curlJSON's built-in status trailer to spot 429s */
      return new Promise(function(resolve) {
        var args = [
          '-s', '--max-time', '10', '-L',
          '-w', '\n__STATUS__:%{http_code}',
          '-H', 'User-Agent: ' + _BROWSER_UA,
          '-H', 'Accept: application/json,*/*',
          '-H', 'Accept-Language: en-US,en;q=0.9',
          '-H', 'Referer: https://finance.yahoo.com'
        ].concat(cookieArgs).concat([url]);
        execFile('curl', args, { maxBuffer: 4 * 1024 * 1024, timeout: 12000 }, function(err, stdout, stderr) {
          var raw    = stdout || '';
          var marker = raw.lastIndexOf('\n__STATUS__:');
          var body   = marker >= 0 ? raw.slice(0, marker) : raw;
          var status = marker >= 0 ? raw.slice(marker + '\n__STATUS__:'.length).trim() : '?';

          if (status === '429' || (!err && body.trim() === 'Too Many Requests')) {
            console.error('[yahoo] 429 on chart url=' + url.slice(0, 100) + ' — tripping circuit');
            yahooSet429();
            resolve(null); return;
          }
          if (err) {
            console.error('[yahoo] curl error url=' + url.slice(0, 100) + ' ' + err.message +
                          (stderr ? ' stderr=' + stderr.slice(0, 150) : ''));
            resolve(null); return;
          }
          if (!body || !body.trim()) {
            console.warn('[yahoo] empty body url=' + url.slice(0, 100) + ' http=' + status);
            resolve(null); return;
          }
          try { resolve(JSON.parse(body)); }
          catch(e) {
            console.warn('[yahoo] JSON parse failed url=' + url.slice(0, 100) +
                         ' http=' + status + ' body=' + body.slice(0, 120));
            resolve(null);
          }
        });
      });
    }

    return chartFetch(q1url)
      .then(function(d) {
        if (d && d.chart && d.chart.result) return d;
        if (yahooIsBlocked()) return null;  /* 429 tripped mid-flight — abort */
        /* Log why query1 failed before falling back */
        if (d && d.chart && d.chart.error) {
          console.warn('[yahoo] query1 chart error sym=' + symbol +
                       ' code=' + (d.chart.error.code || '?') +
                       ' desc=' + (d.chart.error.description || '').slice(0, 100));
        } else {
          console.warn('[yahoo] query1 returned no result for ' + symbol + ', trying query2');
        }
        return chartFetch(q2url);
      })
      .then(function(d) {
        /* If crumb is stale Yahoo returns { chart: { error: { code: 'Unauthorized' } } } */
        if (d && d.chart && d.chart.error) {
          var code = String(d.chart.error.code || '').toLowerCase();
          if (code.includes('unauthorized') || code.includes('invalid')) {
            console.error('[yahoo] crumb rejected for ' + symbol +
                          ' (code=' + d.chart.error.code + ') — forcing refresh');
            _yahooCrumb.value = null;  /* force refresh on next call */
            return null;
          }
          console.warn('[yahoo] chart error sym=' + symbol + ' code=' + d.chart.error.code);
          return null;
        }
        return d;
      });
  }).then(function(data) {
    if (!data || !data.chart || !data.chart.result || !data.chart.result[0]) {
      console.warn('[yahoo] no chart data for ' + symbol + ' (null result)');
      return null;
    }
    var meta  = data.chart.result[0].meta;
    var price = meta.regularMarketPrice;
    var prev  = meta.chartPreviousClose;
    if (!price || price <= 0) {
      console.warn('[yahoo] price zero/missing for ' + symbol + ' meta=' + JSON.stringify(meta).slice(0, 200));
      return null;
    }
    var chg    = (prev && prev > 0) ? ((price - prev) / prev * 100) : 0;
    var chgAbs = (prev && prev > 0) ? (price - prev) : 0;
    return {
      symbol:                     symbol,
      regularMarketPrice:         price,
      regularMarketChange:        parseFloat(chgAbs.toFixed(4)),
      regularMarketChangePercent: parseFloat(chg.toFixed(4)),
      regularMarketTime:          meta.regularMarketTime || Math.floor(Date.now() / 1000),
      shortName:           meta.longName  || meta.shortName  || symbol,
      regularMarketVolume: meta.regularMarketVolume || null,
      regularMarketOpen:   meta.regularMarketOpen   || null,
      regularMarketDayHigh:meta.regularMarketDayHigh || null,
      regularMarketDayLow: meta.regularMarketDayLow  || null,
      fiftyTwoWeekHigh:    meta.fiftyTwoWeekHigh     || null,
      fiftyTwoWeekLow:     meta.fiftyTwoWeekLow      || null
    };
  }).catch(function(e) {
    console.error('[yahoo] yahooChartFetch exception sym=' + symbol + ' err=' + e.message);
    return null;
  });
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
    if (!data) {
      console.warn('[av] null response for ' + symbol);
      return null;
    }
    if (data['Note']) {
      console.error('[av] RATE LIMIT for ' + symbol + ': ' + data['Note'].slice(0, 120));
      return null;
    }
    if (data['Information']) {
      console.error('[av] KEY ERROR for ' + symbol + ': ' + data['Information'].slice(0, 120));
      return null;
    }
    var gq = data['Global Quote'];
    if (!gq || !gq['05. price']) {
      console.warn('[av] no Global Quote for ' + symbol + ' response=' + JSON.stringify(data).slice(0, 200));
      return null;
    }
    var price  = parseFloat(gq['05. price']);
    var chg    = parseFloat((gq['10. change percent'] || '0%').replace('%', ''));
    var dayStr = gq['07. latest trading day'] || '';
    if (!price || price <= 0) {
      console.warn('[av] zero price for ' + symbol);
      return null;
    }
    var ts = dayStr ? new Date(dayStr + 'T21:00:00Z') : new Date(0);
    return { price: price, chg: chg, ts: ts };
  }).catch(function(e) {
    console.error('[av] exception for ' + symbol + ': ' + e.message);
    return null;
  });
}

/* ─── Layer 3: Stooq (no-auth, free — stocks + indices) ─────────────── */
/* Converts Yahoo Finance symbol format to Stooq format.                   */
/* Returns null for symbols Stooq cannot serve (crypto, forex).            */
var STOOQ_INDEX = {
  '^GSPC':'^spx',  '^SP500':'^spx',  '^IXIC':'^ndq',   '^DJI':'^dji',
  '^RUT':'^rut',   '^N225':'^nkx',   '^GDAXI':'^dax',
  '^FCHI':'^cac',  '^HSI':'^hsi',    '^STOXX50E':'^sx5e',
  'GC=F':'gc.f',   'SI=F':'si.f',    'CL=F':'cl.f',    'NG=F':'ng.f',
  'ZC=F':'zc.f',   'ZS=F':'zs.f',
  /* UK-primary stocks that Stooq carries under .uk, not .us */
  'BP':'bp.uk',    'SHEL':'shel.uk', 'AZN':'azn.uk',
  'GSK':'gsk.uk',  'RIO':'rio.uk',   'AAL':'aal.uk'
  /* ^VIX intentionally omitted — Stooq returns N/D for VIX */
};

/* Symbols that consistently return N/D on Stooq — skip immediately to save time */
var STOOQ_NO_DATA = new Set([
  'MC.PA', 'AIR.PA', 'OR.PA', 'BNP.PA', 'SAN.PA',   /* Euronext Paris — N/D on Stooq */
  'GLEN.L',                                           /* Glencore — N/D on Stooq */
  '^FTSE',                                            /* FTSE 100 — confirmed N/D via live test */
  '^VIX'                                              /* CBOE VIX — not available on Stooq */
]);

function toStooqSymbol(yahooSym) {
  var s = yahooSym.toUpperCase();
  if (STOOQ_NO_DATA.has(s))         return null; /* known N/D — skip */
  if (STOOQ_INDEX[s])               return STOOQ_INDEX[s];
  if (s.endsWith('-USD'))            return null; /* crypto -> CoinGecko */
  if (s.endsWith('=X'))             return null; /* forex  -> forexFetch */
  if (s.endsWith('.L'))             return s.slice(0, -2).toLowerCase() + '.uk';
  if (s.endsWith('.DE'))            return s.slice(0, -3).toLowerCase() + '.de';
  if (s.endsWith('.HK'))            return s.slice(0, -3).toLowerCase() + '.hk';
  if (s.endsWith('.PA'))            return null; /* Euronext Paris unreliable on Stooq */
  if (s.endsWith('.AS'))            return s.slice(0, -3).toLowerCase() + '.nl';
  if (/^[A-Z]{1,5}$/.test(s))      return s.toLowerCase() + '.us';
  return null;
}

/* ─── Layer 5: Frankfurter.app (forex only, no auth, truly free) ─────── */
/* Handles Yahoo =X pairs: GBPUSD=X, EURUSD=X, etc.                        */
/* API: https://api.frankfurter.app/latest?from=GBP returns {rates:{...}}  */
var _fxCache = {}; /* base → {rates, ts} — avoid repeated calls per request */

function forexFetch(symbol) {
  var m = symbol.toUpperCase().match(/^([A-Z]{3})([A-Z]{3})=X$/);
  if (!m) return Promise.resolve(null);
  var base  = m[1];
  var quote = m[2];

  /* Use in-memory cache to avoid calling the API once per forex pair per cycle */
  var cached = _fxCache[base];
  if (cached && Date.now() - cached.ts < 60000) { /* 1-min in-memory cache */
    var rate = cached.rates[quote];
    if (!rate) return Promise.resolve(null);
    return Promise.resolve({ price: rate, chg: 0, ts: new Date(), _src: 'frankfurter' });
  }

  var url = 'https://api.frankfurter.app/latest?from=' + encodeURIComponent(base);
  return curlJSON(url).then(function(data) {
    if (!data || !data.rates) {
      console.warn('[forex] null/bad response for ' + symbol + ' url=' + url);
      return null;
    }
    _fxCache[base] = { rates: data.rates, ts: Date.now() };
    var rate = data.rates[quote];
    if (!rate) {
      console.warn('[forex] no rate for ' + quote + ' in response (base=' + base + ')');
      return null;
    }
    console.log('[forex] ' + symbol + ' = ' + rate + ' (frankfurter.app)');
    return { price: rate, chg: 0, ts: new Date(), _src: 'frankfurter' };
  }).catch(function(e) {
    console.error('[forex] exception for ' + symbol + ': ' + e.message);
    return null;
  });
}

function stooqFetch(symbol) {
  if (stooqIsBlocked()) {
    console.warn('[stooq] circuit open for ' + stooqIsBlocked() + 's — skipping ' + symbol);
    return Promise.resolve(null);
  }
  var stooqSym = toStooqSymbol(symbol);
  if (!stooqSym) return Promise.resolve(null);
  var url = 'https://stooq.com/q/l/?s=' + encodeURIComponent(stooqSym) + '&f=sd2t2ohlcv&h&e=csv';
  return new Promise(function(resolve) {
    execFile('curl', [
      '-s', '--max-time', '10', '-L',
      '-w', '\n__STATUS__:%{http_code}',
      '-H', 'User-Agent: ' + _BROWSER_UA,
      url
    ], { maxBuffer: 64 * 1024, timeout: 12000 }, function(err, stdout, stderr) {
      /* Split off HTTP status trailer */
      var raw    = stdout || '';
      var marker = raw.lastIndexOf('\n__STATUS__:');
      var body   = (marker >= 0 ? raw.slice(0, marker) : raw);
      var status = marker >= 0 ? raw.slice(marker + '\n__STATUS__:'.length).trim() : '?';

      if (err) {
        console.warn('[stooq] curl error sym=' + symbol + ' stooqSym=' + stooqSym +
                     ' http=' + status + ' err=' + err.message +
                     (stderr ? ' stderr=' + stderr.slice(0, 100) : ''));
        resolve(null); return;
      }
      if (status === '429') {
        stooqSet429();
        resolve(null); return;
      }
      if (!body || !body.trim()) {
        console.warn('[stooq] empty response sym=' + symbol + ' stooqSym=' + stooqSym + ' http=' + status);
        resolve(null); return;
      }
      var lines = body.trim().split('\n');
      if (lines.length < 2) {
        console.warn('[stooq] only header line for sym=' + symbol + ' http=' + status + ' body=' + body.slice(0, 100));
        resolve(null); return;
      }
      var parts = lines[1].split(',');
      /* CSV: Symbol,Date,Time,Open,High,Low,Close,Volume */
      if (parts.length < 7 || parts[1] === 'N/D') {
        console.warn('[stooq] N/D or short row sym=' + symbol + ' stooqSym=' + stooqSym + ' row=' + lines[1]);
        resolve(null); return;
      }
      var close = parseFloat(parts[6]);
      var open  = parseFloat(parts[3]);
      if (!close || close <= 0) {
        console.warn('[stooq] zero close for sym=' + symbol + ' row=' + lines[1]);
        resolve(null); return;
      }
      var chg = (open > 0) ? ((close - open) / open * 100) : 0;
      resolve({ price: close, chg: chg, ts: new Date(), _src: 'stooq' });
    });
  });
}

/* ─── Layer 4: CoinGecko (no-auth, free — crypto only) ──────────────── */
var COINGECKO_IDS = {
  'BTC-USD':'bitcoin',   'ETH-USD':'ethereum', 'BNB-USD':'binancecoin',
  'SOL-USD':'solana',    'XRP-USD':'ripple',   'ADA-USD':'cardano',
  'DOGE-USD':'dogecoin', 'AVAX-USD':'avalanche-2',
  'DOT-USD':'polkadot',  'LTC-USD':'litecoin', 'MATIC-USD':'matic-network'
};

/* Single-symbol fetch (used by getAccurateQuote) */
function coingeckoFetch(symbol) {
  if (cgIsBlocked()) {
    console.warn('[coingecko] circuit open for ' + cgIsBlocked() + 's — skipping ' + symbol);
    return Promise.resolve(null);
  }
  var id = COINGECKO_IDS[symbol.toUpperCase()];
  if (!id) return Promise.resolve(null);
  var url = 'https://api.coingecko.com/api/v3/simple/price' +
            '?ids=' + encodeURIComponent(id) +
            '&vs_currencies=usd&include_24hr_change=true';
  return curlJSON(url).then(function(data) {
    if (!data) {
      console.warn('[coingecko] null response for ' + symbol + ' (id=' + id + ')');
      return null;
    }
    /* 429 is returned as a JSON status object from CoinGecko */
    if (data.status && data.status.error_code === 429) {
      cgSet429();
      return null;
    }
    if (!data[id] || !data[id].usd) {
      console.warn('[coingecko] missing price for ' + symbol + ' (id=' + id + ') response=' + JSON.stringify(data).slice(0, 150));
      return null;
    }
    cgReset429();
    return {
      price: data[id].usd,
      chg:   data[id].usd_24h_change || 0,
      ts:    new Date(),
      _src:  'coingecko'
    };
  }).catch(function(e) {
    console.error('[coingecko] exception for ' + symbol + ': ' + e.message);
    return null;
  });
}

/* Batch fetch — resolves {SYM: result} for all matchable symbols in one HTTP call */
async function coingeckoBatch(symbols) {
  if (cgIsBlocked()) {
    console.warn('[coingecko] circuit open for ' + cgIsBlocked() + 's — skipping batch');
    return {};
  }
  /* Map each symbol to its CoinGecko id, keep only known ones */
  var idToSym = {};
  symbols.forEach(function(sym) {
    var id = COINGECKO_IDS[sym.toUpperCase()];
    if (id) idToSym[id] = sym;
  });
  var ids = Object.keys(idToSym);
  if (ids.length === 0) return {};

  var url = 'https://api.coingecko.com/api/v3/simple/price' +
            '?ids=' + encodeURIComponent(ids.join(',')) +
            '&vs_currencies=usd&include_24hr_change=true';
  var data = await curlJSON(url).catch(function() { return null; });

  if (!data) {
    console.warn('[coingecko] null batch response for ' + ids.join(','));
    return {};
  }
  if (data.status && data.status.error_code === 429) {
    cgSet429();
    return {};
  }

  cgReset429();
  var result = {};
  ids.forEach(function(id) {
    var sym = idToSym[id];
    if (data[id] && data[id].usd) {
      result[sym] = { price: data[id].usd, chg: data[id].usd_24h_change || 0,
                      ts: new Date(), _src: 'coingecko' };
    } else {
      console.warn('[coingecko] missing price for ' + sym + ' (id=' + id + ') in batch response');
    }
  });
  console.log('[coingecko] batch: ' + Object.keys(result).length + '/' + ids.length + ' symbols ok');
  return result;
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

/* ─── Batch-route raw cache ──────────────────────────────────────────
   Stores the raw Yahoo-shaped result objects from handleQuotes so that
   repeated batch calls skip live fetches for symbols whose data is
   still fresh.  Keyed by uppercase symbol, TTL mirrors _cacheTTL().   */
var BATCH_CACHE = {};   /* { [SYM]: { raw: object, cachedAt: number, marketStatus: string } } */

function batchCacheGet(sym) {
  var e = BATCH_CACHE[sym];
  if (!e) return null;
  if (Date.now() - e.cachedAt > _cacheTTL(e.marketStatus)) {
    delete BATCH_CACHE[sym];
    return null;
  }
  return e.raw;
}

function batchCacheSet(sym, raw, marketStatus) {
  BATCH_CACHE[sym] = { raw: raw, cachedAt: Date.now(), marketStatus: marketStatus || 'closed' };
}

/* When all live sources fail, serve the last known value for up to this long */
var STALE_EMERGENCY_TTL = 4 * 60 * 60 * 1000; /* 4 hours */

function _cacheTTL(marketStatus) {
  if (marketStatus === 'open')                     return 120  * 1000; // was 30s — reduce Yahoo request frequency
  if (marketStatus === 'pre' || marketStatus === 'post') return 300  * 1000; // was 60s
  return 1800 * 1000; // was 300s (5min) — market closed, no need to poll frequently
}

function quoteCacheGet(sym) {
  var entry = QUOTE_CACHE[sym];
  if (!entry) return null;
  /* Fresh enough — return without stale flag */
  if (Date.now() - entry.cachedAt <= _cacheTTL(entry.data.marketStatus)) {
    var out = Object.assign({}, entry.data);
    out.fromCache   = true;
    out.cacheAgeSec = Math.round((Date.now() - entry.cachedAt) / 1000);
    return out;
  }
  return null; /* expired — caller must fetch live; stale copy stays in QUOTE_CACHE for emergency use */
}

/* Last-resort: return the cached value even if expired, marked clearly as stale.
   Called only when every live source has failed for a symbol.                */
function quoteCacheGetStale(sym) {
  var entry = QUOTE_CACHE[sym];
  if (!entry) return null;
  var ageMs = Date.now() - entry.cachedAt;
  if (ageMs > STALE_EMERGENCY_TTL) return null; /* too old to be useful */
  var out = Object.assign({}, entry.data);
  out.fromCache     = true;
  out.staleFallback = true;
  out.isStale       = true;
  out.confidence    = 'low';
  out.cacheAgeSec   = Math.round(ageMs / 1000);
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

  console.log('[quote] → fetching ' + sym + ' market=' + marketStatus);

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

  if (yfResult) {
    console.log('[quote] ' + sym + ': Yahoo ok price=' + yfResult.price);
  } else {
    var blocked429 = yahooIsBlocked();
    if (blocked429) {
      console.warn('[quote] ' + sym + ': Yahoo circuit open (' + blocked429 + 's remain) — skipping AV, going to Stooq/CoinGecko');
    } else {
      console.warn('[quote] ' + sym + ': Yahoo returned nothing — trying Alpha Vantage');
    }
  }

  /* ── Layer 2: Alpha Vantage — only when Yahoo fails AND circuit is closed ── */
  if (!yfResult && !yahooIsBlocked()) {
    avResult = await retryFetch(function() {
      return alphaVantageFetch(sym);
    }, 2, 1000);
    if (avResult) {
      console.log('[quote] ' + sym + ': Alpha Vantage ok price=' + avResult.price);
    } else {
      console.warn('[quote] ' + sym + ': Alpha Vantage returned nothing — trying Stooq/CoinGecko');
    }
  }

  /* ── Layer 3: Stooq / CoinGecko / Forex — only when both Layer 1+2 fail ── */
  var altResult = null;
  if (!yfResult && !avResult) {
    altResult = await stooqFetch(sym).then(function(r) {
      if (r) { console.log('[quote] ' + sym + ': stooq fallback ok price=' + r.price); }
      return r;
    }).catch(function() { return null; });

    if (!altResult) {
      altResult = await coingeckoFetch(sym).then(function(r) {
        if (r) { console.log('[quote] ' + sym + ': coingecko fallback ok price=' + r.price); }
        return r;
      }).catch(function() { return null; });
    }

    if (!altResult && sym.endsWith('=X')) {
      altResult = await forexFetch(sym).catch(function() { return null; });
    }
  }

  /* ── Pick best source (comparison only when both Layer 1+2 exist) ── */
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

  } else if (altResult) {
    /* Layer 3/4: Stooq or CoinGecko */
    finalPrice  = altResult.price; finalChange = null;
    finalChgPct = altResult.chg;   finalTs     = altResult.ts;
    finalSource = altResult._src || 'stooq';
    confidence  = 'medium';

  } else {
    /* All live sources exhausted — try stale cache before returning an error */
    var staleHit = quoteCacheGetStale(sym);
    if (staleHit) {
      console.warn('[quote] ' + sym + ': all sources failed — serving stale cache (age=' +
                   staleHit.cacheAgeSec + 's src=' + (staleHit.source || '?') + ')');
      return staleHit;
    }
    console.warn('[quote] ' + sym + ': all sources exhausted, no stale cache available');
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

  /* ── Layer 0: BATCH_CACHE — skip live fetch for fresh symbols ── */
  var batchCachedMap = {};
  var liveList = symbolList.filter(function(sym) {
    var hit = batchCacheGet(sym);
    if (hit) { batchCachedMap[sym] = hit; return false; }
    return true;
  });

  /* Fully cached — short-circuit without touching any upstream source */
  if (liveList.length === 0) {
    var allCached = symbolList.map(function(s) { return batchCachedMap[s]; }).filter(Boolean);
    return sendJSON(res, 200, {
      quoteResponse: { result: allCached, error: null },
      _meta: { cooldownSec: yahooIsBlocked() || 0, fromCache: allCached.length, live: 0 }
    });
  }

  /* ── Layer 1: Yahoo Finance (batch, only for uncached symbols) ── */
  var liveSymbols = liveList.join(',');
  var yfData = await yahooFetch(liveSymbols, fields);
  var yfMap  = {};
  if (yfData && yfData.quoteResponse && yfData.quoteResponse.result) {
    yfData.quoteResponse.result.forEach(function(q) {
      if (q.symbol) yfMap[q.symbol] = q;
    });
  }

  /* Identify symbols Yahoo missed or returned a zero price for (only among live symbols) */
  var needBackup = liveList.filter(function(s) {
    var q = yfMap[s];
    return !q || !(q.regularMarketPrice > 0);
  });

  /* ── Layer 2: Alpha Vantage for symbols Yahoo missed ── */
  /* Hard cap at 3 per request — the free tier is 25 req/DAY (not per minute).
     When Yahoo is rate-limiting (circuit open), skip AV entirely to preserve
     the daily quota for genuine single-symbol lookups.                    */
  var avMap = {};
  var avSkipped = 0;
  if (needBackup.length > 0 && !yahooIsBlocked()) {
    var avKey = (process.env.ALPHA_VANTAGE_API_KEY || '').trim();
    if (avKey) {
      var avBatch   = needBackup.slice(0, 3);
      avSkipped     = needBackup.length - avBatch.length;
      if (avSkipped > 0) {
        console.warn('[quotes] AV: capping at 3/' + needBackup.length +
                     ' symbols to preserve daily quota — skipping: ' +
                     needBackup.slice(3).join(', '));
      }
      var avResults = await Promise.all(avBatch.map(alphaVantageFetch));
      avBatch.forEach(function(sym, i) {
        if (avResults[i]) avMap[sym] = avResults[i];
      });
    }
  } else if (yahooIsBlocked()) {
    console.warn('[quotes] Yahoo circuit open — skipping Alpha Vantage to preserve daily quota');
  }

  /* Symbols still missing after Layer 1+2 */
  var needAlt = needBackup.filter(function(s) { return !avMap[s]; });

  /* ── Layer 3: Stooq (stocks/indices, no auth) ── */
  /* Batches of 3, 500 ms between batches.  Smaller batches avoid the connection-
     drop rate-limit that was cutting off symbols at positions 15+ in the list.
     Stop early if 2 consecutive batches return zero results (Stooq is blocking). */
  var stooqMap = {};
  if (needAlt.length > 0 && !stooqIsBlocked()) {
    var STOOQ_BATCH      = 3;
    var stooqEmptyBatches = 0;
    for (var si = 0; si < needAlt.length; si += STOOQ_BATCH) {
      if (si > 0) await new Promise(function(r) { setTimeout(r, 500); });
      if (stooqIsBlocked()) {
        console.warn('[quotes] Stooq circuit tripped mid-batch — stopping at ' + si + '/' + needAlt.length);
        break;
      }
      var chunk   = needAlt.slice(si, si + STOOQ_BATCH);
      var sResult = await Promise.all(chunk.map(stooqFetch));
      var batchHits = 0;
      /* Count only symbols that would have made an HTTP request (not pre-filtered) */
      var batchAttempts = chunk.filter(function(sym) { return !!toStooqSymbol(sym); }).length;
      chunk.forEach(function(sym, i) {
        if (sResult[i]) { stooqMap[sym] = sResult[i]; batchHits++; }
      });
      /* Only increment the empty-batch counter if real requests were attempted.
         Pre-filtered symbols (STOOQ_NO_DATA, crypto, forex) returning null should
         not be mistaken for Stooq rate-limiting. */
      if (batchHits === 0 && batchAttempts > 0) {
        stooqEmptyBatches++;
        if (stooqEmptyBatches >= 2) {
          console.warn('[quotes] Stooq: 2 consecutive zero-result batches — stopping early at ' +
                       si + '/' + needAlt.length + ' (likely rate-limiting)');
          break;
        }
      } else if (batchHits > 0) {
        stooqEmptyBatches = 0; /* reset on any success */
      }
    }
  } else if (stooqIsBlocked()) {
    console.warn('[quotes] Stooq circuit open (' + stooqIsBlocked() + 's) — skipping');
  }

  /* ── Layer 4: CoinGecko (crypto, no auth) — single batched request ── */
  var cgMap  = {};
  var needCG = needAlt.filter(function(s) { return !stooqMap[s]; });
  if (needCG.length > 0) {
    cgMap = await coingeckoBatch(needCG);
  }

  /* ── Layer 5: Frankfurter.app — forex pairs (=X), no auth needed ── */
  var fxMap   = {};
  var needFX  = needAlt.filter(function(s) { return !stooqMap[s] && !cgMap[s] && s.endsWith('=X'); });
  if (needFX.length > 0) {
    /* forexFetch shares an in-memory fx cache so repeated pairs hitting the same base
       currency collapse into one real HTTP call */
    var fxResults = await Promise.all(needFX.map(forexFetch));
    needFX.forEach(function(sym, i) { if (fxResults[i]) fxMap[sym] = fxResults[i]; });
  }

  /* ── Build the final result array (live symbols only) ── */
  var finalResults = [];
  liveList.forEach(function(sym) {
    var yfQ = yfMap[sym];
    var avR = avMap[sym];
    var sqR = stooqMap[sym];
    var cgR = cgMap[sym];
    var fxR = fxMap[sym];

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
      console.log('[quotes] ' + sym + ': Yahoo unavailable, using Alpha Vantage');
      finalResults.push({
        symbol:                     sym,
        regularMarketPrice:         avR.price,
        regularMarketChangePercent: avR.chg,
        regularMarketTime:          Math.floor(avR.ts.getTime() / 1000),
        _dataSource:                'alphavantage'
      });
    } else if (sqR) {
      console.log('[quotes] ' + sym + ': Yahoo+AV unavailable, using Stooq');
      finalResults.push({
        symbol:                     sym,
        regularMarketPrice:         sqR.price,
        regularMarketChangePercent: sqR.chg,
        regularMarketTime:          Math.floor(sqR.ts.getTime() / 1000),
        _dataSource:                'stooq'
      });
    } else if (cgR) {
      console.log('[quotes] ' + sym + ': Yahoo+AV+Stooq unavailable, using CoinGecko');
      finalResults.push({
        symbol:                     sym,
        regularMarketPrice:         cgR.price,
        regularMarketChangePercent: cgR.chg,
        regularMarketTime:          Math.floor(cgR.ts.getTime() / 1000),
        _dataSource:                'coingecko'
      });
    } else if (fxR) {
      console.log('[quotes] ' + sym + ': using Frankfurter forex rate');
      finalResults.push({
        symbol:                     sym,
        regularMarketPrice:         fxR.price,
        regularMarketChangePercent: 0,
        regularMarketTime:          Math.floor(fxR.ts.getTime() / 1000),
        _dataSource:                'frankfurter'
      });
    } else {
      /* Last resort — serve whatever is still in cache, even if it expired */
      var staleQ = quoteCacheGetStale(sym);
      if (staleQ) {
        console.warn('[quotes] ' + sym + ': all live sources failed — stale cache (age=' +
                     staleQ.cacheAgeSec + 's src=' + (staleQ.source || '?') + ')');
        finalResults.push({
          symbol:                     sym,
          regularMarketPrice:         staleQ.price,
          regularMarketChangePercent: staleQ.changePercent,
          regularMarketTime:          staleQ.timestamp
                                        ? Math.floor(new Date(staleQ.timestamp).getTime() / 1000)
                                        : 0,
          _dataSource:                'stale_cache',
          _staleAgeSec:               staleQ.cacheAgeSec
        });
      } else {
        console.warn('[quotes] ' + sym + ': no data from any source (yahoo, alphavantage, stooq, coingecko)');
      }
    }
  });

  /* Populate BATCH_CACHE for each live result so next request can skip fetching */
  finalResults.forEach(function(r) {
    if (r.symbol && r.regularMarketPrice > 0) {
      batchCacheSet(r.symbol, r, getMarketStatus(r.symbol));
    }
  });

  /* Merge batch-cached symbols back into the response */
  Object.keys(batchCachedMap).forEach(function(sym) {
    finalResults.push(batchCachedMap[sym]);
  });

  var missing = symbolList.length - finalResults.length;
  sendJSON(res, 200, {
    quoteResponse: {
      result: finalResults,
      error:  missing > 0 ? missing + ' symbol(s) unavailable from all sources' : null
    },
    _meta: {
      cooldownSec:   yahooIsBlocked() || 0,
      fromCache:     Object.keys(batchCachedMap).length,
      live:          liveList.length
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
    yahoo: {
      crumbOk:         !!_yahooCrumb.value,
      crumbAgeMinutes: _yahooCrumb.ts ? Math.round((Date.now() - _yahooCrumb.ts) / 60000) : null,
      circuitOpen:     yahooIsBlocked() > 0,
      circuitCooldownSec: yahooIsBlocked() || 0,
      circuitOpenUntil:   _yahoo429Until ? new Date(_yahoo429Until).toISOString() : null,
      note: yahooIsBlocked()
        ? 'RATE LIMITED — circuit open, requests paused for ' + yahooIsBlocked() + 's'
        : (_yahooCrumb.value ? 'authenticated (crumb + cookie session active)' : 'no crumb — Yahoo requests will fail')
    },
    alphaVantage: {
      configured: !!avKey,
      dailyLimit: 25,
      note: avKey ? 'key configured' : 'Not configured — set ALPHA_VANTAGE_API_KEY in Render environment variables'
    },
    stooq: {
      circuitOpen:       stooqIsBlocked() > 0,
      circuitCooldownSec: stooqIsBlocked() || 0,
      circuitOpenUntil:  _stooq429Until ? new Date(_stooq429Until).toISOString() : null
    },
    coingecko: {
      circuitOpen:       cgIsBlocked() > 0,
      circuitCooldownSec: cgIsBlocked() || 0,
      circuitOpenUntil:  _cg429Until ? new Date(_cg429Until).toISOString() : null
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

/* ─── GET /api/diagnose — step-by-step connectivity report ─────────── */
/* Hit this on Render to see exactly which step fails:                     */
/*   https://your-app.onrender.com/api/diagnose                           */
async function handleDiagnose(res) {
  var report = { ts: new Date().toISOString(), steps: {} };

  /* Step 0: curl version */
  report.steps.curl = await new Promise(function(resolve) {
    execFile('curl', ['--version'], { timeout: 5000 }, function(err, stdout) {
      if (err || !stdout) return resolve({ ok: false, error: err ? err.message : 'no output' });
      resolve({ ok: true, version: stdout.split('\n')[0].trim() });
    });
  });

  if (!report.steps.curl.ok) {
    return sendJSON(res, 200, Object.assign(report, { fatal: 'curl not available' }));
  }

  /* Step 1: cookie collection */
  var diagJar = path.join(os.tmpdir(), 'yf_diag_' + Date.now() + '.txt');
  report.steps.cookieCollection = await new Promise(function(resolve) {
    execFile('curl', [
      '-s', '--max-time', '15', '-L',
      '-c', diagJar, '-o', '/dev/null',
      '-w', '%{http_code}',
      '-H', 'User-Agent: ' + _BROWSER_UA,
      '-H', 'Accept: text/html,*/*',
      'https://finance.yahoo.com'
    ], { timeout: 16000 }, function(err, stdout) {
      var status = parseInt(stdout || '0', 10);
      var cookies = [];
      try {
        var jar = fs.readFileSync(diagJar, 'utf8');
        cookies = jar.split('\n').filter(function(l) {
          return l && !l.startsWith('#') && l.includes('yahoo.com');
        });
      } catch(e) {}
      resolve({
        ok:          !err && status >= 200 && status < 400,
        httpStatus:  status,
        cookieCount: cookies.length,
        hasA3:       cookies.some(function(l) { return l.includes('A3'); }),
        error:       err ? err.message : null
      });
    });
  });

  /* Step 2: crumb */
  report.steps.crumb = await new Promise(function(resolve) {
    execFile('curl', [
      '-s', '--max-time', '10',
      '-b', diagJar, '-c', diagJar,
      '-H', 'User-Agent: ' + _BROWSER_UA,
      '-H', 'Accept: */*',
      '-H', 'Referer: https://finance.yahoo.com',
      'https://query1.finance.yahoo.com/v1/test/getcrumb'
    ], { timeout: 12000 }, function(err, stdout) {
      var crumb = (stdout || '').trim();
      var valid = !err && crumb.length > 0 && crumb[0] !== '<' && crumb[0] !== '{';
      resolve({ ok: valid, crumb: valid ? crumb : null, raw: crumb.slice(0, 120), error: err ? err.message : null });
    });
  });

  /* Step 3: Yahoo chart for AAPL */
  var diagCrumb = (report.steps.crumb.ok && report.steps.crumb.crumb)
                  ? report.steps.crumb.crumb
                  : _yahooCrumb.value;
  report.steps.yahooChart = await (async function() {
    if (!diagCrumb) return { ok: false, error: 'no crumb available' };
    var qs  = '?interval=1d&range=1d&crumb=' + encodeURIComponent(diagCrumb);
    var url = 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL' + qs;
    var cookieJar = diagJar || _COOKIE_JAR;
    var d   = await curlJSON(url, ['-b', cookieJar]);
    var price = d && d.chart && d.chart.result && d.chart.result[0] &&
                d.chart.result[0].meta.regularMarketPrice;
    return { ok: !!price, price: price || null, error: d && d.chart && d.chart.error ? d.chart.error : null };
  })();

  /* Step 4: Alpha Vantage */
  var avKey = (process.env.ALPHA_VANTAGE_API_KEY || '').trim();
  report.steps.alphaVantage = await (async function() {
    if (!avKey) return { ok: false, error: 'ALPHA_VANTAGE_API_KEY not set' };
    var d = await curlJSON('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=' + encodeURIComponent(avKey));
    var price = d && d['Global Quote'] && parseFloat(d['Global Quote']['05. price']);
    if (d && d['Note'])        return { ok: false, error: 'rate_limit: ' + d['Note'].slice(0, 80) };
    if (d && d['Information']) return { ok: false, error: 'key_error: ' + d['Information'].slice(0, 80) };
    return { ok: !!price, price: price || null };
  })();

  /* Step 5: Stooq */
  report.steps.stooq = await stooqFetch('AAPL').then(function(r) {
    return r ? { ok: true, price: r.price } : { ok: false, error: 'null response' };
  }).catch(function(e) { return { ok: false, error: e.message }; });

  /* Step 6: CoinGecko */
  report.steps.coingecko = await coingeckoFetch('BTC-USD').then(function(r) {
    return r ? { ok: true, price: r.price } : { ok: false, error: 'null response' };
  }).catch(function(e) { return { ok: false, error: e.message }; });

  try { fs.unlinkSync(diagJar); } catch(e) {}

  report.serverCrumb = {
    active: !!_yahooCrumb.value,
    ageMinutes: _yahooCrumb.ts ? Math.round((Date.now() - _yahooCrumb.ts) / 60000) : null
  };
  report.summary = Object.keys(report.steps).map(function(k) {
    return k + ':' + (report.steps[k].ok ? 'OK' : 'FAIL');
  }).join(' | ');

  sendJSON(res, 200, report);
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
  if (url === '/api/diagnose' && req.method === 'GET') {
    return handleDiagnose(res);
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

  /* ── Startup diagnostics (visible in Render logs) ── */
  var avKey = (process.env.ALPHA_VANTAGE_API_KEY || '').trim();
  var nodeEnv = process.env.NODE_ENV || '(not set)';
  console.log('[startup] node=' + process.version + ' pid=' + process.pid + ' env=' + nodeEnv);
  console.log('[startup] PORT=' + PORT + ' tmpdir=' + os.tmpdir() + ' platform=' + process.platform);
  console.log('[startup] COOKIE_JAR=' + _COOKIE_JAR);
  console.log('[startup] ALPHA_VANTAGE_API_KEY=' + (avKey ? 'SET (' + avKey.length + ' chars)' : 'NOT SET'));
  console.log('[startup] Stooq: no-auth (stocks/indices)');
  console.log('[startup] CoinGecko: no-auth (crypto only)');
  console.log('[startup] Diagnose endpoint: GET /api/diagnose');

  /* Check curl availability and log version */
  execFile('curl', ['--version'], { timeout: 5000 }, function(err, stdout, stderr) {
    if (err) {
      console.error('[startup] CRITICAL: curl not found — all data fetching will fail!',
                    err.message, stderr ? stderr.slice(0, 200) : '');
    } else {
      console.log('[startup] curl: ' + (stdout || '').split('\n')[0].trim());
    }

    /* Probe outbound HTTPS reachability (important on Render free tier) */
    execFile('curl', ['-s', '--max-time', '5', '-o', '/dev/null', '-w', '%{http_code}',
                      'https://finance.yahoo.com'], { timeout: 7000 },
      function(e2, out2) {
        console.log('[startup] outbound HTTPS probe → finance.yahoo.com http=' + (out2 || 'err') +
                    (e2 ? ' error=' + e2.message : ''));
      }
    );
  });

  /* Obtain Yahoo Finance crumb on startup so first data fetch is authenticated */
  refreshYahooCrumb().catch(function() {});
  /* Refresh crumb every 4 hours to prevent expiry */
  setInterval(function() { refreshYahooCrumb().catch(function() {}); }, CRUMB_TTL);
  /* Start server-side scheduler from env (default 60 min) */
  var envInterval = parseInt(process.env.SCHEDULE_INTERVAL || '60', 10);
  startScheduler(isNaN(envInterval) ? 60 : envInterval);
});
