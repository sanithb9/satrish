'use strict';

require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');

const { fetchLatestNews } = require('./newsMonitor');
const { analyzeNews }     = require('./stockNewsAnalyzer');

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

/* ─── HTTP server ───────────────────────────────────────────────── */
var server = http.createServer(function(req, res) {
  var url = req.url.split('?')[0];

  /* API route */
  if (url === '/api/analyze') {
    return handleAnalyze(res);
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
