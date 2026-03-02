'use strict';

require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');

const { fetchLatestNews } = require('./newsMonitor');
const { analyzeNews }     = require('./stockNewsAnalyzer');
const { Resend }          = require('resend');

const PORT = process.env.PORT || 3000;

/* ─── 15-minute in-memory cache ─────────────────────────────────── */
var _cache   = null;
var _cacheTs = 0;
const CACHE_TTL = 15 * 60 * 1000;

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

  sendJSON(res, 200, Object.assign({}, analysis, { email: emailResult }));
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
  if (url === '/api/analyze') {
    return handleAnalyze(res);
  }
  if (url === '/api/check-news' && req.method === 'POST') {
    return handleCheckNews(req, res);
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
});
