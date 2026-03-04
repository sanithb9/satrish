'use strict';

require('dotenv').config();
const http     = require('http');
const https    = require('https');
const url_mod  = require('url');
const fs       = require('fs');
const path     = require('path');

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
function yahooFetch(symbols, fields) {
  var endpoints = [
    'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' +
      encodeURIComponent(symbols) + '&fields=' + encodeURIComponent(fields),
    'https://query2.finance.yahoo.com/v7/finance/quote?symbols=' +
      encodeURIComponent(symbols) + '&fields=' + encodeURIComponent(fields)
  ];
  return new Promise(function(resolve) {
    function tryEndpoint(idx) {
      if (idx >= endpoints.length) { resolve(null); return; }
      var req = https.get(endpoints[idx], {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StockSenseAI/1.0)',
          'Accept': 'application/json'
        }
      }, function(r) {
        var raw = '';
        r.on('data', function(c) { raw += c; });
        r.on('end', function() {
          try {
            var data = JSON.parse(raw);
            if (data && data.quoteResponse) { resolve(data); }
            else { tryEndpoint(idx + 1); }
          } catch(e) { tryEndpoint(idx + 1); }
        });
      });
      req.on('error', function() { tryEndpoint(idx + 1); });
      req.setTimeout(9000, function() { req.destroy(); tryEndpoint(idx + 1); });
    }
    tryEndpoint(0);
  });
}

/* ─── Layer 2: Alpha Vantage (backup, single symbol) ────────────── */
/* Free tier: 25 req/day, 5 req/min.  Only called when Yahoo misses a
   symbol or Layer 3 validation triggers a cross-check.
   Get a free key at https://www.alphavantage.co/support/#api-key
   and set ALPHA_VANTAGE_API_KEY in .env.                            */
function alphaVantageFetch(symbol) {
  var avKey = (process.env.ALPHA_VANTAGE_API_KEY || '').trim();
  if (!avKey) return Promise.resolve(null);
  return new Promise(function(resolve) {
    var url = 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE' +
              '&symbol='  + encodeURIComponent(symbol) +
              '&apikey='  + encodeURIComponent(avKey);
    var req = https.get(url, {
      headers: { 'User-Agent': 'StockSenseAI/1.0', 'Accept': 'application/json' }
    }, function(r) {
      var raw = '';
      r.on('data', function(c) { raw += c; });
      r.on('end', function() {
        try {
          var data   = JSON.parse(raw);
          var gq     = data['Global Quote'];
          if (!gq || !gq['05. price']) { resolve(null); return; }
          var price  = parseFloat(gq['05. price']);
          var chg    = parseFloat((gq['10. change percent'] || '0%').replace('%', ''));
          var dayStr = gq['07. latest trading day'] || '';
          if (!price || price <= 0) { resolve(null); return; }
          /* AV gives a date only; approximate close as 21:00 UTC (4pm ET) */
          var ts = dayStr ? new Date(dayStr + 'T21:00:00Z') : new Date(0);
          resolve({ price: price, chg: chg, ts: ts });
        } catch(e) { resolve(null); }
      });
    });
    req.on('error', function() { resolve(null); });
    req.setTimeout(9000, function() { req.destroy(); resolve(null); });
  });
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
  if (url === '/api/quotes' && req.method === 'GET') {
    return handleQuotes(req, res);
  }
  if (url === '/api/analyze') {
    return handleAnalyze(res);
  }
  if (url === '/api/check-news' && req.method === 'POST') {
    return handleCheckNews(req, res);
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
