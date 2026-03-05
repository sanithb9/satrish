'use strict';

/* ================================================================
   StockSense AI — Data Pipeline Test Suite
   Run: node test-data-pipeline.js
   Tests the full Yahoo Finance + Alpha Vantage pipeline.
   ================================================================ */

require('dotenv').config();
const https     = require('https');
const http      = require('http');
const { execFile } = require('child_process');
const os        = require('os');
const path      = require('path');
const fs        = require('fs');

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const COOKIE_JAR = path.join(os.tmpdir(), 'yf_test_cookies.txt');
const TEST_SYMS  = ['AAPL', 'MSFT', '^GSPC', 'BTC-USD', 'TSLA'];
const AV_KEY     = (process.env.ALPHA_VANTAGE_API_KEY || '').trim();

var passed = 0;
var failed = 0;
var results = [];

/* ── helpers ── */
function ok(name, detail) {
  passed++;
  results.push({ status: 'PASS', name, detail: detail || '' });
  console.log('  \u2713 PASS  ' + name + (detail ? '  (' + detail + ')' : ''));
}
function fail(name, detail) {
  failed++;
  results.push({ status: 'FAIL', name, detail: detail || '' });
  console.log('  \u2717 FAIL  ' + name + (detail ? '  — ' + detail : ''));
}
function section(title) {
  console.log('\n\u25b6 ' + title);
}

function curlJSON(url, extraArgs) {
  return new Promise(function(resolve) {
    var args = ['-s', '--max-time', '10', '-L',
      '-H', 'User-Agent: ' + BROWSER_UA,
      '-H', 'Accept: application/json,*/*',
      '-H', 'Accept-Language: en-US,en;q=0.9',
      '-H', 'Referer: https://finance.yahoo.com'
    ].concat(extraArgs || []).concat([url]);
    execFile('curl', args, { maxBuffer: 4 * 1024 * 1024, timeout: 12000 }, function(err, stdout) {
      if (err || !stdout || !stdout.trim()) { resolve(null); return; }
      try { resolve(JSON.parse(stdout)); } catch(e) { resolve(null); }
    });
  });
}

function curlRaw(url, extraArgs) {
  return new Promise(function(resolve) {
    var args = ['-s', '--max-time', '15', '-L', '-w', '\n%{http_code}',
      '-H', 'User-Agent: ' + BROWSER_UA,
      '-H', 'Accept: text/html,*/*',
      '-H', 'Accept-Language: en-US,en;q=0.9'
    ].concat(extraArgs || []).concat([url]);
    execFile('curl', args, { maxBuffer: 4 * 1024 * 1024, timeout: 16000 }, function(err, stdout) {
      if (err) { resolve({ body: null, status: 0 }); return; }
      var lines = (stdout || '').split('\n');
      var status = parseInt(lines[lines.length - 1], 10) || 0;
      var body   = lines.slice(0, -1).join('\n');
      resolve({ body, status });
    });
  });
}

/* ── Test 1: curl available ── */
async function testCurlAvailable() {
  section('Test 1: curl availability');
  return new Promise(function(resolve) {
    execFile('curl', ['--version'], function(err, stdout) {
      if (err || !stdout) { fail('curl is installed', err ? err.message : 'no output'); }
      else                { ok('curl is installed', stdout.split('\n')[0].trim()); }
      resolve();
    });
  });
}

/* ── Test 2: outbound HTTPS connectivity ── */
async function testConnectivity() {
  section('Test 2: outbound HTTPS connectivity');
  const urls = [
    'https://httpbin.org/get',
    'https://finance.yahoo.com',
    'https://query1.finance.yahoo.com'
  ];
  for (var u of urls) {
    var r = await curlRaw(u);
    /* Any HTTP response (including 4xx/5xx) means the host is reachable.
       query1.finance.yahoo.com returns 500 without cookies — that's expected. */
    if (r.status > 0) {
      ok('Reachable: ' + u, 'HTTP ' + r.status);
    } else {
      fail('Reachable: ' + u, 'no response (DNS failure or timeout)');
    }
  }
}

/* ── Test 3: Yahoo Finance cookie acquisition ── */
var _crumb = null;
async function testCookieAndCrumb() {
  section('Test 3: Yahoo Finance cookie + crumb');

  /* Step 1: visit finance.yahoo.com */
  var r = await curlRaw('https://finance.yahoo.com', ['-c', COOKIE_JAR]);
  if (r.status >= 200 && r.status < 400) {
    ok('Cookie collection (finance.yahoo.com)', 'HTTP ' + r.status);
  } else {
    fail('Cookie collection (finance.yahoo.com)', 'HTTP ' + r.status);
    return;
  }

  /* Verify A3 cookie present */
  try {
    var cookieContent = fs.readFileSync(COOKIE_JAR, 'utf8');
    if (cookieContent.includes('A3') || cookieContent.includes('A1')) {
      ok('A1/A3 session cookie stored', 'cookie jar written');
    } else {
      fail('A1/A3 session cookie stored', 'jar exists but no A1/A3 found:\n' + cookieContent.slice(0, 300));
    }
  } catch(e) {
    fail('A1/A3 session cookie stored', 'could not read cookie jar: ' + e.message);
  }

  /* Step 2: get crumb */
  await new Promise(function(resolve) {
    execFile('curl', [
      '-s', '--max-time', '10',
      '-b', COOKIE_JAR, '-c', COOKIE_JAR,
      '-H', 'User-Agent: ' + BROWSER_UA,
      '-H', 'Accept: */*',
      '-H', 'Referer: https://finance.yahoo.com',
      'https://query1.finance.yahoo.com/v1/test/getcrumb'
    ], { timeout: 12000 }, function(err, stdout) {
      var crumb = (stdout || '').trim();
      if (!err && crumb && crumb.length > 0 && crumb[0] !== '<' && crumb[0] !== '{') {
        _crumb = crumb;
        ok('Crumb obtained', 'crumb=' + crumb + ' (len=' + crumb.length + ')');
      } else {
        fail('Crumb obtained', err ? err.message : ('response=' + (crumb || 'empty').slice(0, 100)));
      }
      resolve();
    });
  });
}

/* ── Test 4: Yahoo chart endpoint per symbol ── */
async function testYahooChartEndpoint() {
  section('Test 4: Yahoo Finance chart endpoint');
  if (!_crumb) {
    fail('Yahoo chart (skipped — no crumb)', 'crumb acquisition failed in Test 3');
    return;
  }

  for (var sym of TEST_SYMS) {
    var qs   = '?interval=1d&range=1d&crumb=' + encodeURIComponent(_crumb);
    var url  = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + qs;
    var data = await curlJSON(url, ['-b', COOKIE_JAR]);

    if (data && data.chart && data.chart.result && data.chart.result[0]) {
      var price = data.chart.result[0].meta.regularMarketPrice;
      ok('Chart: ' + sym, 'price=' + price);
    } else if (data && data.chart && data.chart.error) {
      fail('Chart: ' + sym, 'error=' + JSON.stringify(data.chart.error));
    } else {
      /* Try query2 fallback */
      var url2  = 'https://query2.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + qs;
      var data2 = await curlJSON(url2, ['-b', COOKIE_JAR]);
      if (data2 && data2.chart && data2.chart.result && data2.chart.result[0]) {
        var price2 = data2.chart.result[0].meta.regularMarketPrice;
        ok('Chart (query2 fallback): ' + sym, 'price=' + price2);
      } else {
        fail('Chart: ' + sym, 'null response from both query1 and query2. raw=' + JSON.stringify(data || data2).slice(0, 200));
      }
    }
  }
}

/* ── Test 5: /api/quotes via local server (integration) ── */
async function testLocalServer() {
  section('Test 5: local /api/quotes integration');
  var syms = TEST_SYMS.slice(0, 3).join(',');
  var url  = 'http://localhost:3000/api/quotes?symbols=' + encodeURIComponent(syms);

  return new Promise(function(resolve) {
    var req = http.get(url, function(res) {
      var raw = '';
      res.on('data', function(c) { raw += c; });
      res.on('end', function() {
        try {
          var d = JSON.parse(raw);
          if (d.quoteResponse && d.quoteResponse.result && d.quoteResponse.result.length > 0) {
            ok('/api/quotes returned data', d.quoteResponse.result.length + '/' + TEST_SYMS.slice(0,3).length + ' symbols ok');
            d.quoteResponse.result.forEach(function(q) {
              ok('  ' + q.symbol, 'price=' + q.regularMarketPrice + ' src=' + (q._dataSource || '?'));
            });
            if (d.quoteResponse.error) {
              fail('  Missing symbols', d.quoteResponse.error);
            }
          } else {
            fail('/api/quotes returned data', 'empty result. raw=' + raw.slice(0, 300));
          }
        } catch(e) {
          fail('/api/quotes returned data', 'parse error: ' + e.message + ' raw=' + raw.slice(0, 200));
        }
        resolve();
      });
    });
    req.on('error', function(e) {
      fail('/api/quotes (server not running?)', e.message + ' — start server with: node server.js');
      resolve();
    });
    req.setTimeout(10000, function() {
      fail('/api/quotes', 'timeout after 10s');
      req.destroy();
      resolve();
    });
  });
}

/* ── Test 6: Alpha Vantage ── */
async function testAlphaVantage() {
  section('Test 6: Alpha Vantage backup');
  if (!AV_KEY) {
    console.log('  - SKIP  Alpha Vantage (ALPHA_VANTAGE_API_KEY not set in .env)');
    return;
  }
  var url  = 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=' + encodeURIComponent(AV_KEY);
  var data = await curlJSON(url);
  if (data && data['Global Quote'] && data['Global Quote']['05. price']) {
    ok('Alpha Vantage AAPL', 'price=' + data['Global Quote']['05. price']);
  } else if (data && data['Note']) {
    fail('Alpha Vantage AAPL', 'rate limit hit: ' + data['Note'].slice(0, 80));
  } else if (data && data['Information']) {
    fail('Alpha Vantage AAPL', 'key issue: ' + data['Information'].slice(0, 80));
  } else {
    fail('Alpha Vantage AAPL', 'null or unexpected response: ' + JSON.stringify(data || {}).slice(0, 200));
  }
}

/* ── Test 6b: Stooq ── */
async function testStooq() {
  section('Test 6b: Stooq fallback (no auth)');
  var cases = [
    { yahoo: 'AAPL',   stooq: 'aapl.us' },
    { yahoo: '^GSPC',  stooq: '^spx' },
    { yahoo: 'MSFT',   stooq: 'msft.us' }
  ];
  for (var c of cases) {
    var url  = 'https://stooq.com/q/l/?s=' + encodeURIComponent(c.stooq) + '&f=sd2t2ohlcv&h&e=csv';
    var data = await curlRaw(url);
    if (data.body && data.body.includes(',') && !data.body.includes('N/D')) {
      var lines = data.body.trim().split('\n');
      var price = lines[1] ? lines[1].split(',')[6] : '?';
      ok('Stooq ' + c.yahoo, 'price=' + price);
    } else {
      fail('Stooq ' + c.yahoo, 'response=' + (data.body || '').slice(0, 100));
    }
  }
}

/* ── Test 6c: CoinGecko ── */
async function testCoinGecko() {
  section('Test 6c: CoinGecko fallback (no auth, crypto)');
  var url  = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';
  var data = await curlJSON(url);
  if (data && data.bitcoin && data.bitcoin.usd) {
    ok('CoinGecko BTC-USD', 'price=' + data.bitcoin.usd);
  } else {
    fail('CoinGecko BTC-USD', JSON.stringify(data || {}).slice(0, 150));
  }
  if (data && data.ethereum && data.ethereum.usd) {
    ok('CoinGecko ETH-USD', 'price=' + data.ethereum.usd);
  } else {
    fail('CoinGecko ETH-USD', JSON.stringify(data || {}).slice(0, 150));
  }
}

/* ── Test 6d: /api/diagnose ── */
async function testDiagnoseEndpoint() {
  section('Test 6d: /api/diagnose endpoint');
  return new Promise(function(resolve) {
    var req = http.get('http://localhost:3000/api/diagnose', function(res) {
      var raw = '';
      res.on('data', function(c) { raw += c; });
      res.on('end', function() {
        try {
          var d = JSON.parse(raw);
          Object.keys(d.steps || {}).forEach(function(step) {
            var s = d.steps[step];
            if (s.ok) {
              ok('/api/diagnose step: ' + step, s.price ? 'price=' + s.price : (s.version || 'ok'));
            } else {
              fail('/api/diagnose step: ' + step, s.error || 'failed');
            }
          });
          console.log('  Summary: ' + (d.summary || 'n/a'));
        } catch(e) {
          fail('/api/diagnose parse', e.message);
        }
        resolve();
      });
    });
    req.on('error', function(e) {
      fail('/api/diagnose (server not running?)', e.message);
      resolve();
    });
    req.setTimeout(60000, function() { req.destroy(); resolve(); });
  });
}

/* ── Test 7: /api/health ── */
async function testHealthEndpoint() {
  section('Test 7: /api/health endpoint');
  return new Promise(function(resolve) {
    var req = http.get('http://localhost:3000/api/health', function(res) {
      var raw = '';
      res.on('data', function(c) { raw += c; });
      res.on('end', function() {
        try {
          var d = JSON.parse(raw);
          if (d.status === 'ok') {
            ok('/api/health status=ok', 'uptime=' + d.uptime + 's');
          } else {
            fail('/api/health status', 'status=' + d.status);
          }
          if (d.yahoo && d.yahoo.crumbOk) {
            ok('Yahoo crumb active on server', 'age=' + d.yahoo.crumbAgeMinutes + 'min');
          } else {
            fail('Yahoo crumb active on server', d.yahoo ? d.yahoo.note : 'no yahoo info');
          }
          if (d.alphaVantage) {
            if (d.alphaVantage.configured) {
              ok('Alpha Vantage configured', 'key present');
            } else {
              console.log('  - INFO  Alpha Vantage not configured (optional backup)');
            }
          }
        } catch(e) {
          fail('/api/health parse', e.message);
        }
        resolve();
      });
    });
    req.on('error', function(e) {
      fail('/api/health (server not running?)', e.message);
      resolve();
    });
  });
}

/* ── Runner ── */
async function run() {
  console.log('========================================');
  console.log(' StockSense AI — Data Pipeline Tests');
  console.log(' ' + new Date().toISOString());
  console.log('========================================');

  await testCurlAvailable();
  await testConnectivity();
  await testCookieAndCrumb();
  await testYahooChartEndpoint();
  await testAlphaVantage();
  await testStooq();
  await testCoinGecko();
  await testDiagnoseEndpoint();
  await testLocalServer();
  await testHealthEndpoint();

  console.log('\n========================================');
  console.log(' Results: ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================');

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(function(r) { return r.status === 'FAIL'; }).forEach(function(r) {
      console.log('  \u2717 ' + r.name + (r.detail ? ': ' + r.detail : ''));
    });
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
    process.exit(0);
  }
}

run().catch(function(e) {
  console.error('Test runner error:', e);
  process.exit(1);
});
