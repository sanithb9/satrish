/* ================================================================
   StockSense AI — Main App Logic
   Rule: render FIRST with static data, then update with live data.
   Every DOM write is wrapped in try/catch.
   ================================================================ */

/* ── APP STATE ── */
var APP = {
  page:          'home',
  newsFilter:    'all',
  watchlist:     [],
  settings:      {},
  recs:          { short: [], long: [], avoid: [] },
  liveTimer:     null,
  notifications: { alerts: [], market_summary: '' },
  scheduleTimer: null,
  lastChecked:   null   /* Date | null */
};

/* ── Tooltip state ── */
var _ttTimer = null;

/* ════════════════════════════════════════
   FETCH STATUS TRACKER
   Each source keeps: last success time,
   last attempt time, last error string,
   running ok/fail counts.
════════════════════════════════════════ */
var FETCH_LOG = {
  indices:    { label:'Market Indices',  lastOk:null, lastTry:null, err:null, ok:0, fail:0 },
  sectors:    { label:'Sector ETFs',     lastOk:null, lastTry:null, err:null, ok:0, fail:0 },
  stocks:     { label:'Stock Prices',    lastOk:null, lastTry:null, err:null, ok:0, fail:0, syms:0 },
  fearGreed:  { label:'Fear & Greed',    lastOk:null, lastTry:null, err:null, ok:0, fail:0 },
  fxRates:    { label:'FX Rates',        lastOk:null, lastTry:null, err:null, ok:0, fail:0 },
  aiAnalysis: { label:'AI News Analysis',lastOk:null, lastTry:null, err:null, ok:0, fail:0 }
};

var ERROR_LOG = [];  /* rolling last-30 errors: { time, source, msg } */

function _logOk(key, extra) {
  var s = FETCH_LOG[key]; if (!s) return;
  s.lastOk  = Date.now();
  s.lastTry = Date.now();
  s.err     = null;
  s.ok++;
  if (extra) { if (extra.syms !== undefined) s.syms = extra.syms; }
  if (APP.page === 'status') renderDiagnostics();
}
function _logErr(key, msg) {
  var s = FETCH_LOG[key]; if (!s) return;
  s.lastTry = Date.now();
  s.err     = String(msg || 'Unknown error');
  s.fail++;
  ERROR_LOG.unshift({ time: Date.now(), source: s.label, msg: s.err });
  if (ERROR_LOG.length > 30) ERROR_LOG.length = 30;
  if (APP.page === 'status') renderDiagnostics();
}

/* ════════════════════════════════════════
   BOOT — runs as soon as DOM is ready
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  try { loadSettings(); }    catch(e) { console.error('loadSettings', e); }
  try { loadWatchlist(); }   catch(e) { console.error('loadWatchlist', e); }
  try { loadPortfolio(); }   catch(e) { console.error('loadPortfolio', e); }
  /* apiLoadKeys() removed — Finnhub/NewsAPI not used client-side */
  try { updateMarketStatus(); } catch(e) {}
  try { initRecs(); }        catch(e) { console.error('initRecs', e); }
  try { renderHome(); }      catch(e) { console.error('renderHome', e); }
  try { renderPicks(); }     catch(e) { console.error('renderPicks', e); }
  try { renderNews('all'); } catch(e) { console.error('renderNews', e); }
  try { renderAlerts(); }    catch(e) { console.error('renderAlerts', e); }
  try { renderWatchlist(); } catch(e) { console.error('renderWatchlist', e); }
  try { renderPortfolio(); } catch(e) { console.error('renderPortfolio', e); }
  try { drawGauge(54); }     catch(e) {}
  // Init autocomplete components
  setTimeout(function() {
    try { initPortfolioAutocomplete(); } catch(e) {}
    try { initWatchlistAutocomplete(); } catch(e) {}
    try { renderCascades(); }            catch(e) {}
    try { liveRefresh(); }               catch(e) {}
    scheduleNextRefresh();
  }, 150);
  // Fetch AI-powered news analysis from the backend (non-blocking)
  setTimeout(function() {
    try { fetchAIAnalysis(); } catch(e) {}
  }, 800);
  // Start client-side auto-check schedule
  setTimeout(function() {
    try { startClientSchedule(APP.settings.interval || 0); } catch(e) {}
    // Sync last-checked time from server
    try {
      fetch('/api/status').then(function(r) { return r.ok ? r.json() : null; }).then(function(s) {
        if (s && s.lastChecked) {
          APP.lastChecked = new Date(s.lastChecked);
          updateLastCheckedDisplay();
        }
      }).catch(function() {});
    } catch(e) {}
    // Refresh the display every minute
    setInterval(function() { try { updateLastCheckedDisplay(); } catch(e) {} }, 60 * 1000);
  }, 1200);
  // Close tooltip on outside click
  document.addEventListener('click', function(e) {
    var popup = document.getElementById('tooltip-popup');
    if (popup && popup.classList.contains('show')) {
      if (!popup.contains(e.target) && !e.target.classList.contains('tooltip-btn') &&
          !e.target.closest('.tooltip-btn')) {
        hideTooltip();
      }
    }
  });
});

/* ── Build recommendations from data.js ── */
function initRecs() {
  APP.recs = buildRecommendations(APP.settings.risk || 'medium');
}

/* ════════════════════════════════════════
   SETTINGS
════════════════════════════════════════ */
function loadSettings() {
  try {
    APP.settings = JSON.parse(localStorage.getItem('ss_settings') || '{}');
  } catch(e) { APP.settings = {}; }
  try { if (APP.settings.risk)    document.getElementById('setting-risk').value = APP.settings.risk; } catch(e) {}
  try { if (APP.settings.currency) document.getElementById('setting-currency').value = APP.settings.currency; } catch(e) {}
  try { if (APP.settings.t212 === false) document.getElementById('setting-t212').checked = false; } catch(e) {}
  try { if (APP.settings.autorefresh === false) document.getElementById('setting-autorefresh').checked = false; } catch(e) {}
  try { if (APP.settings.emailalerts) document.getElementById('setting-emailalerts').checked = true; } catch(e) {}
  try { if (APP.settings.alertemail) document.getElementById('setting-alertemail').value = APP.settings.alertemail; } catch(e) {}
  try {
    var iv = document.getElementById('setting-interval');
    if (iv && APP.settings.interval !== undefined) iv.value = String(APP.settings.interval);
  } catch(e) {}
}

function saveSettings() {
  try {
    APP.settings = {
      risk:        document.getElementById('setting-risk').value,
      currency:    document.getElementById('setting-currency').value,
      t212:        document.getElementById('setting-t212').checked,
      autorefresh: document.getElementById('setting-autorefresh').checked,
      emailalerts: document.getElementById('setting-emailalerts').checked,
      alertemail:  document.getElementById('setting-alertemail').value.trim(),
      interval:    parseInt(document.getElementById('setting-interval').value, 10) || 0
    };
    localStorage.setItem('ss_settings', JSON.stringify(APP.settings));
    /* Restart client-side schedule and notify server */
    startClientSchedule(APP.settings.interval);
    fetch('/api/schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interval: APP.settings.interval })
    }).catch(function() {});
    closeModal('settings-modal');
    showToast('Settings saved!', 'ok');
    initRecs();
    renderPicks();
  } catch(e) { showToast('Error saving settings', 'err'); }
}

/* ════════════════════════════════════════
   WATCHLIST
════════════════════════════════════════ */
function loadWatchlist() {
  try { APP.watchlist = JSON.parse(localStorage.getItem('ss_watchlist') || '[]'); }
  catch(e) { APP.watchlist = []; }
}
function saveWatchlist() {
  localStorage.setItem('ss_watchlist', JSON.stringify(APP.watchlist));
}
function addWatchlist() {
  try {
    var inp = document.getElementById('wl-search');
    var sym = (inp.value || '').trim().toUpperCase().replace(/[^A-Z0-9.]/g, '');
    if (!sym) return;
    if (APP.watchlist.indexOf(sym) !== -1) { showToast(sym + ' already in watchlist', 'info'); return; }
    APP.watchlist.push(sym);
    saveWatchlist();
    inp.value = '';
    renderWatchlist();
    showToast('Added ' + sym, 'ok');
    // Fetch live price immediately
    fetchStockPrices([sym]).then(function(prices) {
      if (prices && prices[sym]) renderWatchlist(prices);
    }).catch(function() {});
  } catch(e) {}
}
function removeWatchlist(sym) {
  APP.watchlist = APP.watchlist.filter(function(s) { return s !== sym; });
  saveWatchlist();
  renderWatchlist();
  showToast('Removed ' + sym, 'info');
}

/* ════════════════════════════════════════
   LIVE DATA REFRESH
════════════════════════════════════════ */
function doRefresh() {
  try {
    var btn = document.getElementById('btn-refresh');
    if (btn) btn.classList.add('spin');
    liveRefresh().then(function() {
      if (btn) btn.classList.remove('spin');
    }).catch(function() {
      if (btn) btn.classList.remove('spin');
    });
  } catch(e) {}
}

/* Adaptive auto-refresh: 30s during NYSE session, 90s outside */
function scheduleNextRefresh() {
  if (APP.liveTimer) clearTimeout(APP.liveTimer);
  if (APP.settings && APP.settings.autorefresh === false) return;
  var now = new Date();
  var day = now.getUTCDay();
  var tot = now.getUTCHours() * 60 + now.getUTCMinutes();
  var marketOpen = day >= 1 && day <= 5 && tot >= 870 && tot < 1260;
  var delay = marketOpen ? 30 * 1000 : 90 * 1000;
  APP.liveTimer = setTimeout(function() {
    try { liveRefresh(); } catch(e) {}
    scheduleNextRefresh();
  }, delay);
}

function liveRefresh() {
  /* Fetch FX rates and sector ETF data alongside everything else */
  if (typeof fetchFXRates === 'function') {
    FETCH_LOG.fxRates.lastTry = Date.now();
    fetchFXRates().then(function(updated) {
      if (updated) _logOk('fxRates');
      else _logErr('fxRates', 'No FX rate data returned from Yahoo Finance');
    }).catch(function(e) { _logErr('fxRates', e ? e.message : 'Network error'); });
  }
  if (typeof fetchSectorData === 'function') {
    FETCH_LOG.sectors.lastTry = Date.now();
    fetchSectorData().then(function(updated) {
      if (updated) { _logOk('sectors'); try { renderSectors(); } catch(e) {} }
      else _logErr('sectors', 'No ETF data returned from /api/quotes');
    }).catch(function(e) { _logErr('sectors', e ? e.message : 'Network error'); });
  }

  return Promise.all([
    (function() {
      FETCH_LOG.indices.lastTry = Date.now();
      return fetchIndices().then(function(data) {
        if (data) {
          _logOk('indices');
          updateMarketCards(data); updateTimestamp(true); updateTicker(data);
        } else {
          _logErr('indices', 'Empty response from Yahoo Finance');
          updateTimestamp(false);
        }
      }).catch(function(e) {
        _logErr('indices', e ? e.message : 'Network error');
        updateTimestamp(false);
      });
    })(),
    (function() {
      FETCH_LOG.fearGreed.lastTry = Date.now();
      return fetchFearGreed().then(function(fg) {
        if (fg) { _logOk('fearGreed'); updateGauge(fg.score, fg.label); }
        else _logErr('fearGreed', 'No data returned');
      }).catch(function(e) { _logErr('fearGreed', e ? e.message : 'Network error'); });
    })(),
    (function() {
      /* Collect all symbols: STOCKS + portfolio holdings + watchlist */
      var syms = Object.keys(STOCKS);
      try {
        if (PORTFOLIO && PORTFOLIO.holdings) {
          PORTFOLIO.holdings.forEach(function(h) {
            if (h.sym && syms.indexOf(h.sym) === -1) syms.push(h.sym);
          });
        }
      } catch(e) {}
      try {
        if (APP && APP.watchlist) {
          APP.watchlist.forEach(function(s) {
            if (s && syms.indexOf(s) === -1) syms.push(s);
          });
        }
      } catch(e) {}
      FETCH_LOG.stocks.lastTry = Date.now();
      return fetchStockPrices(syms).then(function(prices) {
        if (prices) {
          _logOk('stocks', { syms: Object.keys(prices).length });

          /* 1. Push live prices into STOCKS objects so all downstream code uses real data */
          updateStockPrices(prices);

          /* 2. Rebuild recommendations with live price momentum now baked in */
          try { APP.recs = buildRecommendations(APP.settings.risk || 'medium'); } catch(e) {}

          /* 3. Re-render ALL analysis sections with live data */
          try { renderTopPicks(); }        catch(e) {}  /* Home: top 3 picks */
          try { renderPicks(); }           catch(e) {}  /* Picks page: immediate/short/long/avoid */
          try { renderWatchlist(prices); } catch(e) {}  /* Watchlist with live prices */

          /* 4. Re-render portfolio with live prices */
          try { updatePortfolioPrices(prices); renderPortfolioSummary(); renderPortfolioHoldings(); } catch(e) {}

          /* 5. Refresh alert badge (uses generatePortfolioAlerts with live prices) */
          try { updateAlertBadge(); } catch(e) {}
        } else {
          _logErr('stocks', 'No price data returned — Yahoo Finance may be rate-limiting');
        }
      }).catch(function(e) { _logErr('stocks', e ? e.message : 'Network error'); });
    })()
  ]).catch(function() {});
}

/* ════════════════════════════════════════
   MARKET STATUS (no network needed)
════════════════════════════════════════ */
function updateMarketStatus() {
  var now = new Date();
  var day = now.getUTCDay();      /* 0=Sun … 6=Sat */
  var h   = now.getUTCHours();
  var m   = now.getUTCMinutes();
  var tot = h * 60 + m;           /* minutes since UTC midnight */
  var dot = document.getElementById('dot-status');
  var txt = document.getElementById('txt-status');
  if (!dot || !txt) return;
  dot.className = '';
  /* NYSE/NASDAQ regular session: 09:30–16:00 ET = 14:30–21:00 UTC (ignoring DST edge) */
  if (day === 0 || day === 6) {
    dot.classList.add('closed'); txt.textContent = 'Weekend';
  } else if (tot >= 870 && tot < 1260) {   /* 14:30–21:00 UTC */
    dot.classList.add('open');   txt.textContent = 'US Market Open';
  } else if (tot >= 540 && tot < 870) {    /* 09:00–14:30 UTC = 4:00–9:30 AM ET */
    dot.classList.add('pre');    txt.textContent = 'Pre-Market';
  } else if (tot >= 1260 && tot < 1440) {  /* 21:00–24:00 UTC = 4:00–8:00 PM ET */
    dot.classList.add('pre');    txt.textContent = 'After-Hours';
  } else {
    dot.classList.add('closed'); txt.textContent = 'US Closed';
  }
}
setInterval(updateMarketStatus, 60000);

var _lastRefreshTime = null;

function updateTimestamp(isLive) {
  var el = document.getElementById('txt-updated');
  if (!el) return;
  var t = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  if (isLive) {
    _lastRefreshTime = Date.now();
    /* Clearly disclose that Yahoo Finance data is ~15 min delayed */
    el.textContent = '● ' + t + ' · ~15min delayed';
    el.style.color = '#22c55e';
  } else {
    el.textContent = '○ Offline – estimated prices';
    el.style.color = '#f59e0b';
  }
}

/* Update "X seconds ago" counter every 10 seconds */
setInterval(function() {
  if (!_lastRefreshTime) return;
  var el = document.getElementById('txt-updated');
  if (!el || el.style.color !== '#22c55e') return;
  var ago = Math.round((Date.now() - _lastRefreshTime) / 1000);
  var t = new Date(_lastRefreshTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  if (ago < 10) {
    el.textContent = '● just now · ~15min delayed';
  } else if (ago < 90) {
    el.textContent = '● ' + t + ' (' + ago + 's ago) · ~15min delayed';
  } else {
    el.textContent = '○ ' + t + ' (refreshing…)';
    el.style.color = '#f59e0b';
  }
}, 10000);

/* ════════════════════════════════════════
   RENDER HOME
════════════════════════════════════════ */
function renderHome() {
  renderSectors();
  renderTopPicks();
  renderEventAlerts();
  renderCascades();
  updateAIHeadline();
  updateAlertBadge();
}

/* ── Sectors (with color intensity coding) ── */
function renderSectors() {
  var el = document.getElementById('sector-grid');
  if (!el) return;
  el.innerHTML = SECTORS.map(function(s) {
    var cls   = s.chg >= 0 ? 'up' : 'dn';
    var sign  = s.chg >= 0 ? '+' : '';
    var level = s.chg >= 1 ? 'strong-up' : s.chg >= 0.1 ? 'up' : s.chg >= -0.1 ? 'flat' : s.chg >= -1 ? 'down' : 'strong-dn';
    return '<div class="st" data-chg-level="' + level + '">' +
      '<div class="st-em">' + s.emoji + '</div>' +
      '<div class="st-nm">' + s.name + '</div>' +
      '<div class="st-ch ' + cls + '">' + sign + s.chg.toFixed(1) + '%</div>' +
      (s.note ? '<div class="st-note">' + s.note + '</div>' : '') +
      '</div>';
  }).join('');
}

/* ── Macro Cascade Engine renderer ── */
function renderCascades() {
  var el = document.getElementById('cascade-list');
  if (!el || typeof SECTOR_CASCADES === 'undefined') return;

  el.innerHTML = SECTOR_CASCADES.slice(0, 5).map(function(cascade, idx) {
    var effects = cascade.effects.map(function(fx) {
      var dirArrow = fx.direction === 'positive' ? '▲' : '▼';
      var stocks = (fx.stocks || []).map(function(s) {
        return '<span class="nc-stock" onclick="openStockDetail(\'' + s + '\')" style="cursor:pointer">' + s + '</span>';
      }).join('');
      return '<div class="cascade-effect">' +
        '<div class="cascade-effect-top">' +
          '<span class="cascade-dir-arrow ' + fx.direction + '">' + dirArrow + '</span>' +
          '<span class="cascade-effect-sector">' + fx.sector + '</span>' +
          '<span class="cascade-effect-mag ' + fx.magnitude + '">' + fx.magnitude + '</span>' +
        '</div>' +
        '<div class="cascade-effect-reason">' + fx.reason + '</div>' +
        (stocks ? '<div class="cascade-effect-stocks">' + stocks + '</div>' : '') +
      '</div>';
    }).join('');

    var urgencyCls = (cascade.urgency || 'WATCH').replace(/[^A-Z-]/g,'');

    return '<div class="cascade-card">' +
      '<div class="cascade-hdr" onclick="toggleCascade(' + idx + ')">' +
        '<div class="cascade-emoji">' + (cascade.icon || '📊') + '</div>' +
        '<div class="cascade-info">' +
          '<div class="cascade-title">' + cascade.trigger_event + '</div>' +
          '<div class="cascade-sub">' + cascade.trigger_sector + '</div>' +
        '</div>' +
        '<span class="cascade-urgency ' + urgencyCls + '">' + (cascade.urgency || 'WATCH') + '</span>' +
        '<i class="fas fa-chevron-down cascade-chevron" id="cascade-chev-' + idx + '"></i>' +
      '</div>' +
      '<div class="cascade-body" id="cascade-body-' + idx + '">' +
        '<div class="cascade-desc">' + cascade.description + '</div>' +
        '<div class="cascade-effects">' + effects + '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  // Auto-open first cascade
  toggleCascade(0);
}

function toggleCascade(idx) {
  var body  = document.getElementById('cascade-body-' + idx);
  var chev  = document.getElementById('cascade-chev-' + idx);
  if (!body) return;
  var open = body.classList.toggle('open');
  if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
}

/* ════════════════════════════════════════
   TOOLTIP SYSTEM
════════════════════════════════════════ */
function showTooltip(event, key) {
  event.stopPropagation();
  var popup = document.getElementById('tooltip-popup');
  var title = document.getElementById('tt-title');
  var text  = document.getElementById('tt-text');
  if (!popup || !title || !text) return;

  var tt = (typeof TOOLTIPS !== 'undefined' && TOOLTIPS[key]) || { title: key, text: 'Information about this section.' };
  title.textContent = tt.title;
  text.textContent  = tt.text;

  // Position near button
  var rect = event.target.getBoundingClientRect();
  var top  = rect.bottom + 6;
  var left = Math.min(rect.left, window.innerWidth - 316);
  if (left < 6) left = 6;

  popup.style.top  = top  + 'px';
  popup.style.left = left + 'px';
  popup.classList.add('show');

  // Auto-close after 8 seconds
  clearTimeout(_ttTimer);
  _ttTimer = setTimeout(hideTooltip, 8000);
}

function hideTooltip() {
  var popup = document.getElementById('tooltip-popup');
  if (popup) popup.classList.remove('show');
  clearTimeout(_ttTimer);
}

/* ── Top Picks (first 3 short-term buys) ── */
function renderTopPicks() {
  var el = document.getElementById('top-picks');
  if (!el) return;
  var top = APP.recs.short.slice(0, 3);
  if (!top.length) { el.innerHTML = '<p style="color:var(--t3);padding:20px 0">No picks yet</p>'; return; }
  el.innerHTML = top.map(function(r) { return buildStockCard(r, true); }).join('');
}

/* ── Event Alerts (first 4 news items) ── */
function renderEventAlerts() {
  var el = document.getElementById('event-alerts');
  if (!el) return;
  el.innerHTML = NEWS.slice(0, 4).map(buildNewsCard).join('');
}

/* ── AI Headline rotates ── */
var HEADLINES = [
  'Top AI pick: NVDA — Blackwell GPU ramp + sovereign AI demand = explosive upside.',
  'Defence stocks at multi-year highs. NATO 3% GDP mandate = decade of contract wins for LMT, RTX, NOC.',
  'Obesity drug revolution: LLY oral pill Phase 3 positive — game-changer for $150bn GLP-1 market.',
  'WATCH: US-China tariff risk is real. Reduce AAPL, TSLA, BABA exposure until clarity emerges.',
  'AI data centres need massive power. NEE perfectly positioned with renewable energy contracts signed with MSFT, GOOGL.',
  'Goldman Sachs and JPMorgan benefit from high NII and recovering M&A market. Financials look attractive.'
];
var headlineIdx = 0;
function updateAIHeadline() {
  var el = document.getElementById('ai-headline');
  if (!el) return;
  el.textContent = HEADLINES[headlineIdx % HEADLINES.length];
  headlineIdx++;
  setTimeout(updateAIHeadline, 8000);
}

/* ── Market card live update ── */
function updateMarketCards(data) {
  var fmts = {
    SP500:  function(p) { return p.toLocaleString('en', {maximumFractionDigits:0}); },
    NASDAQ: function(p) { return p.toLocaleString('en', {maximumFractionDigits:0}); },
    DOW:    function(p) { return p.toLocaleString('en', {maximumFractionDigits:0}); },
    FTSE:   function(p) { return p.toLocaleString('en', {maximumFractionDigits:0}); },
    GOLD:   function(p) { return '$' + p.toLocaleString('en', {maximumFractionDigits:0}); },
    OIL:    function(p) { return '$' + p.toFixed(2); },
    VIX:    function(p) { return p.toFixed(2); },
    BTC:    function(p) { return '$' + Math.round(p).toLocaleString('en'); }
  };
  Object.keys(data).forEach(function(key) {
    try {
      var d = data[key];
      var valEl = document.getElementById('mkt-val-' + key);
      var chgEl = document.getElementById('mkt-chg-' + key);
      if (!valEl || !chgEl || !d || !d.price) return;
      var fmt = fmts[key] || function(p) { return p.toFixed(2); };
      valEl.textContent = fmt(d.price);
      var pct = (d.chg || 0).toFixed(2);
      var isUp = d.chg >= 0;
      chgEl.textContent = (isUp ? '+' : '') + pct + '%';
      chgEl.className = 'mkt-chg ' + (isUp ? 'up' : 'dn');
    } catch(e) {}
  });
}

function updateTicker(data) {
  var el = document.getElementById('ticker-inner');
  if (!el) return;
  var src = data || {};
  var keys = ['SP500','NASDAQ','DOW','FTSE','GOLD','OIL','VIX','BTC'];
  var names = { SP500:'S&P 500', NASDAQ:'NASDAQ', DOW:'DOW', FTSE:'FTSE 100', GOLD:'Gold', OIL:'Oil', VIX:'VIX', BTC:'Bitcoin' };
  var ticks = keys.map(function(k) {
    var d = src[k] || FALLBACK[k];
    if (!d) return '';
    var isUp = d.chg >= 0;
    var sign = isUp ? '+' : '';
    return '<span class="tick"><span class="tick-s">' + names[k] + '</span> ' +
      (k === 'OIL' ? '$' + d.price.toFixed(2) :
       k === 'VIX' ? d.price.toFixed(2) :
       k === 'BTC' ? '$' + Math.round(d.price).toLocaleString('en') :
       k === 'GOLD' ? '$' + Math.round(d.price).toLocaleString('en') :
       d.price.toLocaleString('en', {maximumFractionDigits:0})) +
      ' <span class="' + (isUp ? 'tick-u' : 'tick-d') + '">' +
      (isUp ? '▲' : '▼') + sign + d.chg.toFixed(2) + '%</span></span>';
  }).filter(Boolean).join('');
  /* Double it for seamless loop */
  el.innerHTML = ticks + ticks;
}

/* ── Gauge ── */
function drawGauge(score) {
  var canvas = document.getElementById('gauge-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = 180, H = 110;
  ctx.clearRect(0, 0, W, H);
  var cx = W / 2, cy = H - 10, R = 78;
  /* track */
  ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 0);
  ctx.lineWidth = 13; ctx.strokeStyle = '#28283f'; ctx.lineCap = 'round'; ctx.stroke();
  /* value arc */
  var angle = Math.PI + (Math.PI * Math.min(100, Math.max(0, score)) / 100);
  var g = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
  g.addColorStop(0, '#ff4455'); g.addColorStop(0.5, '#ffcc00'); g.addColorStop(1, '#00e676');
  ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, angle);
  ctx.lineWidth = 13; ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.stroke();
}

function updateGauge(score, label) {
  try {
    drawGauge(score);
    var s = document.getElementById('gauge-score'); if (s) s.textContent = score;
    var t = document.getElementById('gauge-text');  if (t) t.textContent = label;
    /* sentiment bars */
    var isGreed = score > 55, isFear = score < 45;
    setBar('sbar-momentum',  isGreed ? Math.min(90, score + 10) : Math.max(15, score - 10));
    setBar('sbar-safehaven', isFear  ? Math.min(85, 100 - score + 15) : Math.max(10, 100 - score - 10));
    setBar('sbar-volatility',isFear  ? Math.min(85, 100 - score) : Math.max(15, 60 - score * 0.4));
    setBar('sbar-breadth',   isGreed ? Math.min(88, score + 5)  : Math.max(20, score - 5));
  } catch(e) {}
}
function setBar(id, pct) {
  var el = document.getElementById(id);
  if (el) el.style.width = pct + '%';
}

/* ── Update stock prices on rendered cards ── */
function updateStockPrices(prices) {
  Object.keys(prices).forEach(function(sym) {
    try {
      var p = prices[sym];
      var stock = STOCKS[sym];
      if (stock) {
        stock.price = p.price;
        stock.chg   = p.chg;
      }
      /* Update any currently visible price elements */
      var prEl = document.querySelector('[data-price-sym="' + sym + '"]');
      var chEl = document.querySelector('[data-chg-sym="' + sym + '"]');
      if (prEl && p.price) prEl.textContent = getCurrencySymbol(sym) + p.price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2});
      if (chEl) {
        chEl.textContent = (p.chg >= 0 ? '+' : '') + p.chg.toFixed(2) + '%';
        chEl.className = 'sc-chg ' + (p.chg >= 0 ? 'up' : 'dn');
      }
    } catch(e) {}
  });
}

/* ════════════════════════════════════════
   IMMEDIATE BUY / SELL ENGINE
   PhD-level urgency scoring based on
   real-time cascade triggers + confidence
════════════════════════════════════════ */
function buildImmediatePicks() {
  var immBuy  = [];
  var immSell = [];

  /* Stocks with NOW-urgency cascade exposure */
  var nowCascadePositive = {};
  var nowCascadeNegative = {};

  if (typeof SECTOR_CASCADES !== 'undefined') {
    SECTOR_CASCADES.forEach(function(cascade) {
      if (cascade.urgency !== 'NOW') return;
      cascade.effects.forEach(function(fx) {
        (fx.stocks || []).forEach(function(sym) {
          if (fx.direction === 'positive' && fx.magnitude === 'EXTREME') nowCascadePositive[sym] = cascade.trigger_event;
          if (fx.direction === 'negative' && (fx.magnitude === 'EXTREME' || fx.magnitude === 'HIGH')) nowCascadeNegative[sym] = cascade.trigger_event;
        });
      });
    });
  }

  var allRecs = APP.recs.short.concat(APP.recs.long).concat(APP.recs.avoid);
  var seen = {};

  allRecs.forEach(function(r) {
    if (seen[r.sym]) return;
    seen[r.sym] = true;

    var urgencyBuy  = 0;
    var urgencySell = 0;
    var reason      = '';
    var sellReason  = '';

    /* Immediate BUY criteria */
    if (r.score >= 90 && r.action === 'BUY')                             { urgencyBuy += 40; reason = 'Highest AI conviction — score ' + r.score + '%.'; }
    else if (r.score >= 85 && r.action === 'BUY')                        { urgencyBuy += 25; reason = 'Very high AI confidence — score ' + r.score + '%.'; }
    if (nowCascadePositive[r.sym])                                        { urgencyBuy += 30; reason += ' NOW-level cascade trigger: ' + nowCascadePositive[r.sym] + '.'; }
    if (r.why_now && r.why_now.indexOf('now') !== -1)                    { urgencyBuy += 10; }
    if (r.risk === 'Low' && r.action === 'BUY' && r.score >= 80)         { urgencyBuy += 10; }

    /* Immediate SELL / REDUCE criteria */
    if (r.action === 'AVOID' && r.score <= 30)                           { urgencySell += 50; sellReason = 'AVOID-rated. Score ' + r.score + '% — fundamentals broken.'; }
    else if (r.action === 'AVOID')                                        { urgencySell += 35; sellReason = 'AVOID-rated by AI.'; }
    if (nowCascadeNegative[r.sym])                                        { urgencySell += 25; sellReason += ' NOW cascade headwind: ' + nowCascadeNegative[r.sym] + '.'; }
    if (r.political && r.political.tariffs <= -3)                         { urgencySell += 15; sellReason += ' Extreme tariff / geopolitical exposure.'; }

    var entry = Object.assign({}, r, {
      urgencyBuy:  urgencyBuy,
      urgencySell: urgencySell,
      immediateReason: reason.trim(),
      immediateSellReason: sellReason.trim()
    });

    if (urgencyBuy >= 35)                     immBuy.push(entry);
    if (urgencySell >= 35 && !immBuy.find(function(x) { return x.sym === r.sym; })) immSell.push(entry);
  });

  immBuy.sort(function(a,b)  { return b.urgencyBuy  - a.urgencyBuy;  });
  immSell.sort(function(a,b) { return b.urgencySell - a.urgencySell; });

  return { buy: immBuy.slice(0,6), sell: immSell.slice(0,4) };
}

function renderImmediatePicks() {
  var el = document.getElementById('list-immediate');
  if (!el) return;

  var picks = buildImmediatePicks();
  var html  = '';

  if (picks.buy.length) {
    html += '<div class="imm-section-hdr buy"><i class="fas fa-bolt"></i> IMMEDIATE BUY — Act Now</div>';
    html += '<div class="imm-context">These stocks have the highest combination of AI conviction + NOW-level macro catalysts. Time-sensitive opportunity windows.</div>';
    html += picks.buy.map(function(r) { return buildImmediateCard(r, 'buy'); }).join('');
  }

  if (picks.sell.length) {
    html += '<div class="imm-section-hdr sell" style="margin-top:18px"><i class="fas fa-arrow-down"></i> REDUCE / SELL — Review Positions</div>';
    html += '<div class="imm-context">These stocks face NOW-level headwinds. If you hold them, review immediately. Risk of further downside is elevated.</div>';
    html += picks.sell.map(function(r) { return buildImmediateCard(r, 'sell'); }).join('');
  }

  if (!html) {
    html = '<div class="empty"><i class="fas fa-check-shield" style="font-size:44px;opacity:.2;margin-bottom:12px;display:block"></i>' +
      '<h3>No Immediate Actions</h3><p>No stocks meet the criteria for urgent action right now. The AI is monitoring continuously.</p></div>';
  }

  el.innerHTML = html;
}

function buildImmediateCard(r, type) {
  var isBuy   = type === 'buy';
  var reason  = isBuy ? r.immediateReason : r.immediateSellReason;
  var urgency = isBuy ? r.urgencyBuy : r.urgencySell;
  var urgLabel= urgency >= 60 ? 'CRITICAL' : urgency >= 45 ? 'URGENT' : 'HIGH';
  var urgCls  = urgency >= 60 ? 'critical' : urgency >= 45 ? 'urgent' : 'high';
  var price   = r.price ? getCurrencySymbol(r.sym) + r.price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—';
  var chg     = (r.chg || 0);
  var capBadge= r.cap ? '<span class="cap-badge ' + r.cap + '">' + r.cap + '</span>' : '';
  var showT212 = APP.settings.t212 !== false;

  return '<div class="imm-card ' + type + '" onclick="openStockDetail(\'' + r.sym + '\')">' +
    '<div class="imm-top">' +
      '<div class="sc-left">' +
        '<div class="sc-ico ' + (isBuy ? '' : 'avoid') + '-ico">' + r.sym.slice(0,3) + '</div>' +
        '<div>' +
          '<div class="sc-sym">' + r.sym + capBadge + '</div>' +
          '<div class="sc-name">' + r.name + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="imm-badges">' +
        '<span class="imm-urgency ' + urgCls + '">' + urgLabel + '</span>' +
        '<div style="text-align:right;margin-top:3px">' +
          '<div class="sc-price">' + price + '</div>' +
          '<div class="sc-chg ' + (chg>=0?'up':'dn') + '">' + (chg>=0?'+':'') + chg.toFixed(2) + '%</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="imm-reason ' + (isBuy?'buy':'sell') + '">' +
      '<i class="fas ' + (isBuy?'fa-bolt':'fa-exclamation-triangle') + '"></i> ' + reason +
    '</div>' +
    (r.target12m ? '<div class="imm-target">Target: <strong style="color:var(--' + (isBuy?'green':'red') + ')">' + r.target12m + '</strong> &nbsp;·&nbsp; Risk: <strong>' + (r.risk||'—') + '</strong></div>' : '') +
    '<div class="conf-row">' +
      '<div class="conf-lbl"><span>AI Urgency Score</span><span>' + urgency + '/100</span></div>' +
      '<div class="conf-bar"><div class="conf-fill" style="width:' + urgency + '%;background:var(--' + (isBuy?'green':'red') + ')"></div></div>' +
    '</div>' +
    (showT212 ? '<a class="t212-btn" href="https://www.trading212.com/search?query=' + r.sym + '" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fas fa-external-link-alt"></i> ' + (isBuy?'Buy':'Sell') + ' on Trading 212</a>' : '') +
  '</div>';
}

/* ════════════════════════════════════════
   RENDER PICKS
════════════════════════════════════════ */
function renderPicks() {
  renderImmediatePicks();
  renderPickList('list-short', APP.recs.short);
  renderPickList('list-long',  APP.recs.long);
  renderPickList('list-avoid', APP.recs.avoid);
}
function renderPickList(id, list) {
  var el = document.getElementById(id);
  if (!el) return;
  if (!list || !list.length) {
    el.innerHTML = '<p style="color:var(--t3);text-align:center;padding:30px 0">None right now</p>';
    return;
  }
  el.innerHTML = list.map(function(r) { return buildStockCard(r, false); }).join('');
}

/* ── Build one stock card ── */
function buildStockCard(r, compact) {
  var sym    = r.sym;
  var price  = r.price || 0;
  var chg    = r.chg || 0;
  var act    = (r.action || 'HOLD').toLowerCase();
  var riskW  = r.risk === 'Low' ? '25' : r.risk === 'High' ? '85' : '55';
  var riskCls= (r.risk || 'Medium').toLowerCase();
  var isAvoid= (act === 'avoid');
  var prStr  = price ? getCurrencySymbol(sym) + price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—';
  var chStr  = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
  var showT212 = APP.settings.t212 !== false;

  var actIcon = { buy:'fa-arrow-up', hold:'fa-minus', watch:'fa-eye', avoid:'fa-ban' };
  var actLabel = { buy:'BUY', hold:'HOLD', watch:'WATCH', avoid:'AVOID / SELL' };

  var thesis = compact
    ? (r.thesis_short || '').split('.')[0] + '.'
    : isAvoid ? r.thesis_short : r.thesis_short;

  var catalysts = '';
  if (!compact && !isAvoid && r.catalysts && r.catalysts.length) {
    catalysts = '<div style="margin-top:9px;font-size:11px">' +
      '<strong style="color:var(--green)">Key Catalysts: </strong>' +
      r.catalysts.slice(0, 2).join(' • ') + '</div>';
  }
  var risks = '';
  if (!compact && r.risks && r.risks.length) {
    risks = '<div style="margin-top:4px;font-size:11px">' +
      '<strong style="color:var(--red)">Watch Out: </strong>' +
      r.risks.slice(0, 2).join(' • ') + '</div>';
  }
  var t212 = '';
  if (showT212) {
    t212 = '<a class="t212-btn" href="https://www.trading212.com/search?query=' + sym + '" target="_blank" rel="noopener">' +
      '<i class="fas fa-external-link-alt"></i> Open in Trading 212</a>';
  }
  var meta = '';
  if (!compact) {
    meta = '<div class="sc-meta">' +
      '<div class="sc-m"><span class="sc-ml">12M Target</span><span class="sc-mv" style="color:var(--green)">' + (r.target12m || '—') + '</span></div>' +
      '<div class="sc-m"><span class="sc-ml">Sector</span><span class="sc-mv">' + (r.sector || '—') + '</span></div>' +
      '<div class="sc-m"><span class="sc-ml">P/E</span><span class="sc-mv">' + (r.pe || '—') + '</span></div>' +
      '<div class="sc-m"><span class="sc-ml">Growth</span><span class="sc-mv">' + (r.growth || '—') + '</span></div>' +
      '</div>';
  }
  var conf = isAvoid ? '' : (
    '<div class="conf-row">' +
    '<div class="conf-lbl"><span>AI Confidence</span><span>' + r.score + '%</span></div>' +
    '<div class="conf-bar"><div class="conf-fill" style="width:' + r.score + '%"></div></div>' +
    '</div>'
  );
  var riskBar =
    '<div class="risk-row">' +
    '<span class="risk-lbl">Risk:</span>' +
    '<div class="risk-bar"><div class="risk-fill ' + riskCls + '" style="width:' + riskW + '%"></div></div>' +
    '<span class="risk-val" style="color:var(--' + (riskCls === 'low' ? 'green' : riskCls === 'high' ? 'red' : 'yellow') + ')">' + (r.risk || 'Medium') + '</span>' +
    '</div>';

  var capBadge = r.cap ? '<span class="cap-badge ' + r.cap + '">' + r.cap + '</span>' : '';

  return '<div class="sc ' + act + '" onclick="openStockDetail(\'' + sym + '\')">' +
    '<div class="sc-top">' +
      '<div class="sc-left">' +
        '<div class="sc-ico">' + sym.slice(0, 3) + '</div>' +
        '<div><div class="sc-sym">' + sym + capBadge + '</div><div class="sc-name">' + r.name + '</div></div>' +
      '</div>' +
      '<div class="sc-right">' +
        '<div class="sc-price" data-price-sym="' + sym + '">' + prStr + '</div>' +
        '<div class="sc-chg ' + (chg >= 0 ? 'up' : 'dn') + '" data-chg-sym="' + sym + '">' + chStr + '</div>' +
      '</div>' +
    '</div>' +
    '<span class="pill ' + act + '"><i class="fas ' + (actIcon[act] || 'fa-minus') + '"></i> ' + (actLabel[act] || act.toUpperCase()) + '</span>' +
    (thesis ? '<div class="sc-reason">' + thesis + '</div>' : '') +
    meta + catalysts + risks + conf + riskBar + t212 +
    '</div>';
}

/* ════════════════════════════════════════
   RENDER NEWS
════════════════════════════════════════ */
function renderNews(filter) {
  filter = filter || APP.newsFilter;
  APP.newsFilter = filter;
  var el = document.getElementById('news-list');
  if (!el) return;
  var filtered = NEWS.filter(function(n) {
    return filter === 'all' || n.category === filter;
  });
  if (!filtered.length) {
    el.innerHTML = '<p style="color:var(--t3);text-align:center;padding:30px 0">No news in this category right now.</p>';
    return;
  }
  el.innerHTML = filtered.map(buildNewsCard).join('');
}

function filterNews(btn) {
  document.querySelectorAll('#news-filters .chip').forEach(function(b) { b.classList.remove('on'); });
  btn.classList.add('on');
  renderNews(btn.dataset.filter);
}

function buildNewsCard(n) {
  var dir = n.direction || 'neutral';
  var dirLabel = dir === 'bull' ? 'Bullish' : dir === 'bear' ? 'Bearish' : 'Neutral';
  var dirIcon  = dir === 'bull' ? '▲' : dir === 'bear' ? '▼' : '—';
  var age = timeAgo(n.age_h);
  var stocks = (n.stocks || []).map(function(s) {
    return '<span class="nc-stock">' + s + '</span>';
  }).join('');
  return '<div class="nc" ' + (n.url ? 'onclick="window.open(\'' + n.url + '\',\'_blank\')"' : '') + '>' +
    '<div class="nc-top">' +
      '<span class="nc-cat ' + n.category + '">' + n.category + '</span>' +
      '<span class="nc-imp ' + dir + '">' + dirIcon + ' ' + dirLabel + '</span>' +
      '<span class="nc-age">' + age + '</span>' +
    '</div>' +
    '<div class="nc-title">' + n.title + '</div>' +
    (n.summary ? '<div class="nc-summary">' + n.summary + '</div>' : '') +
    (n.impact ? '<div class="nc-impact ' + dir + '"><strong>Market Impact:</strong> ' + n.impact + '</div>' : '') +
    (stocks ? '<div class="nc-stocks">' + stocks + '</div>' : '') +
    '</div>';
}

function timeAgo(hours) {
  if (!hours && hours !== 0) return '';
  if (hours < 1) return 'Just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

/* ════════════════════════════════════════
   RENDER WATCHLIST
   _wlPrices is a persistent cache so prices
   accumulate across all individual fetches.
════════════════════════════════════════ */
var _wlPrices = {};

function renderWatchlist(prices) {
  /* Merge any new prices into the persistent cache */
  if (prices) {
    Object.keys(prices).forEach(function(k) { _wlPrices[k] = prices[k]; });
  }

  var items = document.getElementById('wl-items');
  var empty = document.getElementById('wl-empty');
  if (!items) return;
  if (!APP.watchlist.length) {
    if (empty) empty.style.display = 'block';
    items.querySelectorAll('.wl-item').forEach(function(e) { e.remove(); });
    return;
  }
  if (empty) empty.style.display = 'none';
  items.querySelectorAll('.wl-item').forEach(function(e) { e.remove(); });
  APP.watchlist.forEach(function(sym) {
    try {
      /* Look up price: live cache first, then STOCKS fallback */
      var cached = _wlPrices[sym] || {};
      var known  = STOCKS[sym] || {};
      var price  = cached.price || known.price || null;
      var chg    = cached.chg !== undefined ? cached.chg : (known.chg || 0);
      var name   = known.name || (STOCK_LOOKUP && STOCK_LOOKUP.filter(function(s){return s.sym===sym;})[0] || {}).name || sym;

      var prStr, chStr;
      if (price) {
        prStr = getCurrencySymbol(sym) + price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2});
      } else {
        prStr = '<span style="color:var(--t3);font-size:11px">fetching…</span>';
      }
      chStr = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';

      var div = document.createElement('div');
      div.className = 'wl-item';
      div.onclick = function() { openStockDetail(sym); };
      div.innerHTML =
        '<div class="wl-sym">' + sym + '</div>' +
        '<div class="wl-name">' + name + '</div>' +
        '<div style="text-align:right">' +
          '<div class="wl-pr">' + prStr + '</div>' +
          '<div class="wl-ch ' + (chg >= 0 ? 'up' : 'dn') + '">' + chStr + '</div>' +
        '</div>' +
        '<button class="wl-rm" onclick="event.stopPropagation();removeWatchlist(\'' + sym + '\')"><i class="fas fa-times"></i></button>';
      items.appendChild(div);

      /* If no price in cache yet, fetch it individually */
      if (!cached.price) {
        fetchStockPrices([sym]).then(function(p) {
          if (p && p[sym]) renderWatchlist(p);
        }).catch(function() {});
      }
    } catch(e) {}
  });
}

/* ════════════════════════════════════════
   RENDER ALERTS
════════════════════════════════════════ */
var ALERTS = [
  { type:'ai',   icon:'fa-robot',             title:'AI Pick: NVDA — Strong BUY',                   desc:'Blackwell GPU ramp ahead of schedule. Every cloud provider buying aggressively. Confidence: 91%.', when:'5m ago' },
  { type:'buy',  icon:'fa-arrow-up',           title:'Defence Sector: Multi-Year Tailwind',           desc:'NATO 3% GDP commitment = record order books for LMT, RTX, NOC. Consider adding on any dip.',     when:'1h ago' },
  { type:'warn', icon:'fa-exclamation-triangle',title:'WARNING: China Tariff Risk — Review Holdings', desc:'New tariffs proposed on Chinese tech imports. Check AAPL, TSLA, BABA exposure.',                   when:'3h ago' },
  { type:'buy',  icon:'fa-seedling',           title:'LLY Oral GLP-1: Phase 3 Positive',             desc:'Oral obesity drug shows 22% weight loss. Game-changer for $150bn market. LLY remains top long-term hold.', when:'5h ago' },
  { type:'news', icon:'fa-newspaper',          title:'Oil Sliding — Airlines Benefit',                desc:'OPEC+ supply increase fears. XOM under pressure. DAL, AAL, FDX benefit from lower fuel costs.',   when:'8h ago' },
  { type:'news', icon:'fa-globe',              title:'Market Status: ' + getMarketStatusText(),       desc:'Check the Markets page for live prices.',                                                           when:'Now' }
];

function getMarketStatusText() {
  var now = new Date();
  var day = now.getUTCDay();
  var h   = now.getUTCHours();
  var m   = now.getUTCMinutes();
  var tot = h * 60 + m;
  if (day === 0 || day === 6) return 'Weekend — markets closed';
  if (tot >= 840 && tot < 1260) return 'US markets are OPEN';
  if (tot >= 720 && tot < 840)  return 'Pre-market trading';
  if (tot >= 1260 && tot < 1380) return 'After-hours trading';
  return 'US markets closed';
}

function renderAlerts() {
  var el = document.getElementById('alerts-list');
  if (!el) return;
  el.innerHTML = ALERTS.map(function(a) {
    return '<div class="alert-item">' +
      '<div class="al-ico ' + a.type + '"><i class="fas ' + a.icon + '"></i></div>' +
      '<div class="al-body">' +
        '<div class="al-title">' + a.title + '</div>' +
        '<div class="al-desc">' + a.desc + '</div>' +
        '<div class="al-when">' + a.when + '</div>' +
      '</div>' +
      '</div>';
  }).join('');
  /* Badge */
  var badge = document.getElementById('alerts-badge');
  if (badge) {
    badge.textContent = ALERTS.length;
    badge.style.display = ALERTS.length ? 'flex' : 'none';
  }
}

/* ════════════════════════════════════════
   STOCK DETAIL MODAL
════════════════════════════════════════ */
function openStockDetail(sym) {
  var s = STOCKS[sym];
  if (!s) { showToast('Stock not in database', 'info'); return; }
  var price = s.price || 0;
  var chg   = s.chg || 0;
  var showT212 = APP.settings.t212 !== false;

  document.getElementById('stock-modal-title').textContent = sym + ' — ' + s.name;

  var cats = (s.catalysts || []).map(function(c) { return '<li>✓ ' + c + '</li>'; }).join('');
  var rsks = (s.risks || []).map(function(r) { return '<li>✗ ' + r + '</li>'; }).join('');

  var html =
    '<div class="sd-top">' +
      '<div class="sd-ico">' + sym.slice(0, 3) + '</div>' +
      '<div class="sd-info">' +
        '<h3>' + sym + '</h3>' +
        '<p>' + s.name + ' • ' + (s.sector || '') + ' • ' + (s.exchange || '') + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="sd-price-row">' +
      '<div class="sd-price">' + (price ? getCurrencySymbol(sym) + price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—') + '</div>' +
      '<div class="sd-chg ' + (chg >= 0 ? 'up' : 'dn') + '">' + (chg >= 0 ? '+' : '') + chg.toFixed(2) + '% today</div>' +
    '</div>' +
    '<div class="sd-stats">' +
      '<div class="sd-stat"><div class="sd-stat-l">12M Target</div><div class="sd-stat-v" style="color:var(--green)">' + (s.target12m || '—') + '</div></div>' +
      '<div class="sd-stat"><div class="sd-stat-l">Long-Term</div><div class="sd-stat-v" style="color:var(--purple)">' + (s.targetLong || '—') + '</div></div>' +
      '<div class="sd-stat"><div class="sd-stat-l">P/E Ratio</div><div class="sd-stat-v">' + (s.pe || '—') + '</div></div>' +
      '<div class="sd-stat"><div class="sd-stat-l">Revenue Growth</div><div class="sd-stat-v">' + (s.growth || '—') + '</div></div>' +
      '<div class="sd-stat"><div class="sd-stat-l">Risk</div><div class="sd-stat-v" style="color:var(--' + (s.risk === 'Low' ? 'green' : s.risk === 'High' ? 'red' : 'yellow') + ')">' + (s.risk || '—') + '</div></div>' +
      '<div class="sd-stat"><div class="sd-stat-l">Action</div><div class="sd-stat-v">' + (s.action || '—') + '</div></div>' +
    '</div>' +
    (s.why_now ? '<div class="sd-box"><h4><i class="fas fa-bolt"></i> Why Now?</h4><p>' + s.why_now + '</p></div>' : '') +
    (s.thesis_short ? '<div class="sd-box"><h4><i class="fas fa-bolt"></i> Short-Term Thesis</h4><p>' + s.thesis_short + '</p></div>' : '') +
    (s.thesis_long ? '<div class="sd-box"><h4><i class="fas fa-seedling"></i> Long-Term Thesis</h4><p>' + s.thesis_long + '</p></div>' : '') +
    (cats ? '<div class="sd-box"><h4><i class="fas fa-check-circle"></i> Key Catalysts</h4><ul style="list-style:none;padding:0">' + cats + '</ul></div>' : '') +
    (rsks ? '<div class="sd-box"><h4 class="red"><i class="fas fa-exclamation-triangle"></i> Risks to Watch</h4><ul style="list-style:none;padding:0">' + rsks + '</ul></div>' : '') +
    (showT212 ? '<a class="t212-btn" href="https://www.trading212.com/search?query=' + sym + '" target="_blank" rel="noopener" style="display:inline-flex;margin-top:4px"><i class="fas fa-external-link-alt"></i> Trade on Trading 212</a>' : '') +
    '<button class="pri-btn" style="margin-top:12px" onclick="addWatchlistFrom(\'' + sym + '\')">' +
    '<i class="fas fa-star"></i> Add to Watchlist</button>';

  document.getElementById('stock-modal-inner').innerHTML = html;
  openModal('stock-modal');
}

/* Called by watchlist autocomplete when user selects a stock from suggestions */
function addWatchlistFromAC(sym, livePrice) {
  try {
    if (!sym) return;
    var inp = document.getElementById('wl-search');
    if (APP.watchlist.indexOf(sym) !== -1) {
      showToast(sym + ' already in watchlist', 'info');
      if (inp) inp.value = '';
      return;
    }
    APP.watchlist.push(sym);
    saveWatchlist();
    if (inp) inp.value = '';
    renderWatchlist();
    showToast('Added ' + sym + (livePrice && livePrice.price ? ' @ ' + getCurrencySymbol(sym) + livePrice.price.toFixed(2) : ''), 'ok');
    /* Re-render with live price if we already have it, otherwise fetch */
    if (livePrice && livePrice.price) {
      var priceMap = {}; priceMap[sym] = livePrice;
      renderWatchlist(priceMap);
    } else {
      fetchStockPrices([sym]).then(function(prices) {
        if (prices && prices[sym]) renderWatchlist(prices);
      }).catch(function() {});
    }
  } catch(e) {}
}

function addWatchlistFrom(sym) {
  if (APP.watchlist.indexOf(sym) === -1) {
    APP.watchlist.push(sym);
    saveWatchlist();
    showToast('Added ' + sym + ' to watchlist', 'ok');
  } else {
    showToast(sym + ' already in watchlist', 'info');
  }
}

/* ════════════════════════════════════════
   DIAGNOSTICS / STATUS PAGE
════════════════════════════════════════ */
function renderDiagnostics() {
  var el = document.getElementById('diag-content');
  if (!el) return;

  var now = Date.now();

  function tStr(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }
  function agoStr(ts) {
    if (!ts) return '';
    var s = Math.round((now - ts) / 1000);
    if (s <  60)   return s + 's ago';
    if (s < 3600)  return Math.round(s / 60)   + 'm ago';
    return               Math.round(s / 3600)  + 'h ago';
  }

  /* ── Source rows ── */
  var sourceRows = Object.keys(FETCH_LOG).map(function(key) {
    var src    = FETCH_LOG[key];
    var hasOk  = !!src.lastOk;
    var hasErr = src.fail > 0 && !src.lastOk;
    var dotCls = hasOk ? 'up' : (src.fail > 0 ? 'dn' : 't3');
    var extraTxt = (key === 'stocks' && src.syms > 0) ? ' · ' + src.syms + ' symbols' : '';
    var neverTxt = !src.lastOk && src.ok === 0 && src.fail === 0
      ? '<span class="diag-never">not yet fetched</span>' : '';
    var lastOkTxt = src.lastOk
      ? '<span style="color:var(--t1)">' + tStr(src.lastOk) + '</span> <span class="diag-ago">' + agoStr(src.lastOk) + '</span>' + extraTxt
      : neverTxt;
    var errTxt = src.err
      ? '<div class="diag-err-inline">' + src.err + '</div>'
      : '';
    return '<div class="diag-row">' +
      '<div class="diag-cell-name">' + src.label + '</div>' +
      '<div class="diag-cell-time"><span class="' + dotCls + '">' +
        (hasOk ? '●' : src.fail > 0 ? '●' : '○') + '</span> ' + lastOkTxt + '</div>' +
      '<div class="diag-cell-counts">' +
        '<span class="diag-ok">' + src.ok + ' ok</span>' +
        '<span class="diag-sep">·</span>' +
        '<span class="' + (src.fail > 0 ? 'diag-fail' : 'diag-ok0') + '">' + src.fail + ' err</span>' +
      '</div>' +
      errTxt +
    '</div>';
  }).join('');

  /* ── Error log ── */
  var errRows = ERROR_LOG.length === 0
    ? '<div class="diag-empty">No errors recorded this session</div>'
    : ERROR_LOG.slice(0, 15).map(function(e) {
        return '<div class="diag-errlog-row">' +
          '<span class="diag-errlog-time">' + tStr(e.time) + '</span>' +
          '<span class="diag-errlog-src">'  + e.source    + '</span>' +
          '<span class="diag-errlog-msg">'  + e.msg       + '</span>' +
        '</div>';
      }).join('');

  el.innerHTML =
    '<div class="diag-section">' +
      '<div class="diag-sh">Data Sources <span class="diag-sh-sub">last refresh per source</span></div>' +
      '<div class="diag-table">' + sourceRows + '</div>' +
    '</div>' +
    '<div class="diag-section" id="diag-server-block">' +
      '<div class="diag-sh">Server Health</div>' +
      '<div class="diag-loading">Fetching from /api/health…</div>' +
    '</div>' +
    '<div class="diag-section">' +
      '<div class="diag-sh">Error Log <span class="diag-sh-sub">last 15 · this session only</span></div>' +
      '<div class="diag-errlog">' + errRows + '</div>' +
    '</div>' +
    '<div style="padding:0 0 16px;text-align:center">' +
      '<button class="pri-btn" onclick="doRefresh()">' +
        '<i class="fas fa-sync-alt"></i> Refresh All Data Now</button>' +
    '</div>';

  /* Async server health panel */
  fetch('/api/health')
    .then(function(r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
    .then(function(h) {
      var sb = document.getElementById('diag-server-block');
      if (!sb) return;
      var uptimeSec = h.uptime || 0;
      var uptimeStr = uptimeSec < 3600
        ? Math.floor(uptimeSec / 60) + 'm ' + (uptimeSec % 60) + 's'
        : Math.floor(uptimeSec / 3600) + 'h ' + Math.floor((uptimeSec % 3600) / 60) + 'm';
      var avCls  = h.alphaVantage.configured ? 'up' : 'dn';
      var avText = h.alphaVantage.configured
        ? '● Configured · 25 req/day limit'
        : '○ Not configured — Yahoo-only mode (set ALPHA_VANTAGE_API_KEY)';
      var aiAge  = h.newsCache.ageMinutes !== null ? h.newsCache.ageMinutes + 'm old · ' + h.newsCache.alertCount + ' alerts' : 'no cache yet';
      /* Quote cache entries (top 10 freshest) */
      var cacheRows = (h.quoteCache.entries || []).slice(0, 10).map(function(c) {
        var ageCls = c.ageS < 60 ? 'up' : c.ageS < 300 ? '' : 'dn';
        return '<span class="diag-cache-chip ' + ageCls + '">' +
          c.symbol + ' <span class="diag-cache-age">' + c.ageS + 's</span></span>';
      }).join('');
      sb.innerHTML =
        '<div class="diag-sh">Server Health</div>' +
        '<div class="diag-table">' +
          _srow('Uptime',          uptimeStr) +
          _srow('Memory',          h.memoryMB + ' MB heap used') +
          _srow('Quote cache',     h.quoteCache.size + ' symbol' + (h.quoteCache.size !== 1 ? 's' : '') + ' cached') +
          _srow('Alpha Vantage',   '<span class="' + avCls + '">' + avText + '</span>') +
          _srow('AI news cache',   aiAge) +
        '</div>' +
        (cacheRows ? '<div class="diag-cache-chips">' + cacheRows + '</div>' : '');
    })
    .catch(function(e) {
      var sb = document.getElementById('diag-server-block');
      if (sb) sb.innerHTML = '<div class="diag-sh">Server Health</div>' +
        '<div class="diag-err-inline">Could not reach /api/health: ' + e + '</div>';
    });
}

function _srow(label, val) {
  return '<div class="diag-row">' +
    '<div class="diag-cell-name">' + label + '</div>' +
    '<div class="diag-cell-time">' + val + '</div>' +
    '<div class="diag-cell-counts"></div>' +
  '</div>';
}

/* ════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════ */
function goPage(page) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nb').forEach(function(b) { b.classList.remove('on'); });
  var pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  var btn = document.querySelector('.nb[data-page="' + page + '"]');
  if (btn) btn.classList.add('on');
  APP.page = page;
  window.scrollTo(0, 0);
  if (page === 'watchlist')  renderWatchlist();
  if (page === 'portfolio')  renderPortfolio();
  if (page === 'alerts')     updateAlertBadge();
  if (page === 'status')     renderDiagnostics();
  /* Picks page: always rebuild recs with latest prices before rendering */
  if (page === 'picks') {
    try { APP.recs = buildRecommendations(APP.settings.risk || 'medium'); } catch(e) {}
    try { renderPicks(); } catch(e) {}
  }
  hideTooltip();
}

function updateAlertBadge() {
  var portAlerts = typeof generatePortfolioAlerts === 'function' ? generatePortfolioAlerts() : [];
  var badge = document.getElementById('portfolio-badge');
  if (badge) {
    badge.style.display = portAlerts.length ? 'flex' : 'none';
  }
}

function switchTab(btn) {
  var tab = btn.dataset.tab;
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('on'); });
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('on'); });
  btn.classList.add('on');
  var panel = document.getElementById('tab-' + tab);
  if (panel) panel.classList.add('on');
  /* Force a live refresh when switching to data-heavy tabs */
  if (tab === 'portfolio' || tab === 'watchlist' || tab === 'news') {
    try { liveRefresh(); } catch(e) {}
  }
}

/* ════════════════════════════════════════
   MODALS
════════════════════════════════════════ */
function openModal(id) {
  var m = document.getElementById(id);
  if (m) m.classList.add('open');
}
function closeModal(id) {
  var m = document.getElementById(id);
  if (m) m.classList.remove('open');
}
/* Close on backdrop tap */
document.addEventListener('click', function(e) {
  if (e.target && e.target.classList && e.target.classList.contains('modal')) {
    e.target.classList.remove('open');
  }
});

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
var toastTimer = null;
function showToast(msg, type) {
  try {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { el.className = ''; }, 3000);
  } catch(e) {}
}

/* ════════════════════════════════════════
   AI NEWS ANALYSIS (fetched from /api/analyze)
════════════════════════════════════════ */

/* Map Claude sentiment/urgency to the card format NEWS uses */
function alertToNewsCard(alert, idx) {
  var dir = alert.sentiment === 'POSITIVE' ? 'bull'
          : alert.sentiment === 'NEGATIVE' ? 'bear'
          : 'neutral';

  /* Derive category from stock_or_sector text */
  var ss  = (alert.stock_or_sector || '').toLowerCase();
  var cat = ss.indexOf('tech') !== -1 || ss.indexOf('semi') !== -1 ? 'tech'
          : ss.indexOf('energy') !== -1 || ss.indexOf('oil') !== -1 ? 'energy'
          : ss.indexOf('earn') !== -1 || ss.indexOf('revenue') !== -1 ? 'earnings'
          : ss.indexOf('polit') !== -1 || ss.indexOf('sanction') !== -1 || ss.indexOf('tariff') !== -1 ? 'political'
          : 'economic';

  /* Extract stock tickers — anything that looks like 1-5 uppercase letters */
  var tickers = (alert.stock_or_sector || '').match(/\b[A-Z]{1,5}\b/g) || [];

  return {
    id:        'ai-' + idx,
    title:     alert.source_headline || alert.stock_or_sector,
    summary:   alert.reason,
    category:  cat,
    direction: dir,
    age_h:     0,
    impact:    alert.action + ': ' + alert.reason,
    stocks:    tickers.slice(0, 5),
    url:       alert.source_url || ''
  };
}

/* Shared helper — updates state, NEWS array, bell badge, and re-renders */
function _applyAnalysis(data) {
  if (!data || !Array.isArray(data.alerts) || data.alerts.length === 0) return;

  /* Persist in app state */
  APP.notifications = data;

  /* Update bell badge with URGENT count */
  var urgentCount = data.alerts.filter(function(a) { return a.urgency === 'URGENT'; }).length;
  updateBellBadge(urgentCount);

  /* Prepend AI-generated cards to the NEWS array, replacing any previous AI cards */
  var aiCards = data.alerts.map(alertToNewsCard);
  var staticNews = NEWS.filter(function(n) {
    return typeof n.id !== 'string' || n.id.indexOf('ai-') !== 0;
  });
  NEWS.length = 0;
  aiCards.concat(staticNews).forEach(function(n) { NEWS.push(n); });

  /* Update the AI headline banner with Claude's market summary */
  if (data.market_summary) {
    var el = document.getElementById('ai-headline');
    if (el) el.textContent = data.market_summary;
  }

  /* Re-render the news sections */
  try { renderEventAlerts(); } catch(e) {}
  try { renderNews(APP.newsFilter); } catch(e) {}
}

function fetchAIAnalysis() {
  FETCH_LOG.aiAnalysis.lastTry = Date.now();
  fetch('/api/analyze')
    .then(function(r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
    .then(function(data) {
      if (data && Array.isArray(data.alerts) && data.alerts.length > 0) {
        _logOk('aiAnalysis');
      } else {
        _logErr('aiAnalysis', 'No alerts returned — set ANTHROPIC_API_KEY in Render environment variables');
      }
      _applyAnalysis(data);
    })
    .catch(function(e) { _logErr('aiAnalysis', String(e || 'Network error')); });
}

/* ════════════════════════════════════════
   NOTIFICATION PANEL
════════════════════════════════════════ */

function updateBellBadge(count) {
  var badge = document.getElementById('bell-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function toggleNotifPanel() {
  var modal = document.getElementById('notif-modal');
  if (!modal) return;
  if (modal.classList.contains('open')) {
    closeModal('notif-modal');
  } else {
    renderNotifPanel(APP.notifications);
    openModal('notif-modal');
  }
}

/* "Check Latest News" button handler */
function checkLatestNews() {
  var btn = document.getElementById('scan-btn');
  var txt = document.getElementById('scan-btn-text');
  if (btn) btn.disabled = true;
  if (txt) txt.innerHTML = '<i class="fas fa-circle-notch" style="animation:spin 1s linear infinite;display:inline-block"></i>&nbsp; Scanning latest news...';

  var emailAlerts = !!(APP.settings.emailalerts && APP.settings.alertemail);
  var alertEmail  = APP.settings.alertemail || '';

  fetch('/api/check-news', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ emailAlerts: emailAlerts, alertEmail: alertEmail })
  })
    .then(function(r) { return r.ok ? r.json() : Promise.reject('HTTP ' + r.status); })
    .then(function(data) {
      if (!data || !Array.isArray(data.alerts)) throw new Error('Invalid response');
      _applyAnalysis(data);
      APP.lastChecked = data.lastChecked ? new Date(data.lastChecked) : new Date();
      updateLastCheckedDisplay();
      renderNotifPanel(data);
      openModal('notif-modal');
      /* Notify if email was sent */
      if (data.email && data.email.sent) {
        showToast('URGENT alert email sent to ' + alertEmail, 'ok');
      }
    })
    .catch(function() {
      showToast('Could not fetch news — try again shortly.');
    })
    .then(function() {
      if (btn) btn.disabled = false;
      if (txt) txt.innerHTML = '<i class="fas fa-satellite-dish"></i> Check Latest News';
    });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

var URGENCY_ORDER = { URGENT: 0, SHORT_TERM: 1, LONG_TERM: 2 };

function renderNotifPanel(data) {
  var body = document.getElementById('notif-panel-body');
  if (!body) return;

  var alerts  = (data && Array.isArray(data.alerts))  ? data.alerts  : [];
  var summary = (data && data.market_summary)          ? data.market_summary : '';

  if (alerts.length === 0) {
    body.innerHTML =
      '<div class="empty">' +
        '<i class="fas fa-satellite-dish"></i>' +
        '<h3>No alerts yet</h3>' +
        '<p>Tap "Check Latest News" on the dashboard to scan for market-moving events.</p>' +
      '</div>';
    return;
  }

  /* Sort: URGENT → SHORT_TERM → LONG_TERM */
  var sorted = alerts.slice().sort(function(a, b) {
    return (URGENCY_ORDER[a.urgency] || 2) - (URGENCY_ORDER[b.urgency] || 2);
  });

  var html = '';

  /* Market summary */
  if (summary) {
    html +=
      '<div class="notif-summary">' +
        '<div class="notif-summary-lbl"><i class="fas fa-brain"></i> Market Summary</div>' +
        '<p>' + escapeHtml(summary) + '</p>' +
      '</div>';
  }

  html += '<div class="notif-count">' + sorted.length + ' alert' + (sorted.length !== 1 ? 's' : '') + ' found</div>';

  sorted.forEach(function(alert) {
    var urgency      = alert.urgency || 'LONG_TERM';
    var urgencyIcon  = urgency === 'URGENT' ? '🔴' : urgency === 'SHORT_TERM' ? '🟡' : '🟢';
    var urgencyLabel = urgency === 'URGENT' ? 'Urgent' : urgency === 'SHORT_TERM' ? 'Short Term' : 'Long Term';
    var action       = (alert.action || 'WATCH').toUpperCase();
    var actionClass  = action === 'BUY' ? 'buy' : action === 'SELL' ? 'sell' : action === 'HOLD' ? 'hold' : 'watch';
    var itemClass    = urgency === 'URGENT' ? 'urgent' : urgency === 'SHORT_TERM' ? 'short-term' : 'long-term';

    html +=
      '<div class="na-item ' + itemClass + '">' +
        '<div class="na-header">' +
          '<span class="na-sector">' + escapeHtml(alert.stock_or_sector) + '</span>' +
          '<span class="na-urgency">' + urgencyIcon + ' ' + urgencyLabel + '</span>' +
        '</div>' +
        '<div class="na-meta"><span class="pill ' + actionClass + '">' + action + '</span></div>' +
        '<p class="na-reason">' + escapeHtml(alert.reason) + '</p>' +
        (alert.source_headline
          ? '<div class="na-source">' +
              (alert.source_url
                ? '<a href="' + escapeHtml(alert.source_url) + '" target="_blank" class="na-link">' +
                    '<i class="fas fa-external-link-alt"></i> ' + escapeHtml(alert.source_headline) +
                  '</a>'
                : '<span class="na-headline">' + escapeHtml(alert.source_headline) + '</span>'
              ) +
            '</div>'
          : ''
        ) +
      '</div>';
  });

  body.innerHTML = html;
}

/* ════════════════════════════════════════
   SCHEDULED AUTO-CHECK
════════════════════════════════════════ */

/* Runs silently in the background — no modal, just toast + state update */
function silentNewsCheck() {
  var emailAlerts = !!(APP.settings.emailalerts && APP.settings.alertemail);
  var alertEmail  = APP.settings.alertemail || '';

  fetch('/api/check-news', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ emailAlerts: emailAlerts, alertEmail: alertEmail })
  })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data || !Array.isArray(data.alerts)) return;
      _applyAnalysis(data);
      APP.lastChecked = data.lastChecked ? new Date(data.lastChecked) : new Date();
      updateLastCheckedDisplay();

      var urgentCount = data.alerts.filter(function(a) { return a.urgency === 'URGENT'; }).length;
      var msg = urgentCount > 0
        ? 'News updated \u2014 ' + urgentCount + ' URGENT alert' + (urgentCount !== 1 ? 's' : '')
        : 'News updated \u2014 no urgent alerts';
      showToast(msg, urgentCount > 0 ? 'warn' : 'ok');

      if (data.email && data.email.sent) {
        showToast('Alert email sent to ' + alertEmail, 'ok');
      }
    })
    .catch(function() {}); /* silent — don't disrupt the user */
}

function startClientSchedule(intervalMinutes) {
  if (APP.scheduleTimer) {
    clearInterval(APP.scheduleTimer);
    APP.scheduleTimer = null;
  }
  if (!intervalMinutes || intervalMinutes <= 0) return;
  APP.scheduleTimer = setInterval(silentNewsCheck, intervalMinutes * 60 * 1000);
}

function updateLastCheckedDisplay() {
  var wrap = document.getElementById('last-checked-wrap');
  var txt  = document.getElementById('last-checked-txt');
  if (!wrap || !txt) return;
  if (!APP.lastChecked) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  var secs = Math.round((Date.now() - APP.lastChecked) / 1000);
  if (secs < 60)        txt.textContent = 'Last checked: just now';
  else if (secs < 3600) txt.textContent = 'Last checked: ' + Math.round(secs / 60) + ' min ago';
  else                  txt.textContent = 'Last checked: ' + Math.round(secs / 3600) + 'h ago';
}
