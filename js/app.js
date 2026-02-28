/* ================================================================
   StockSense AI — Main App Logic
   Rule: render FIRST with static data, then update with live data.
   Every DOM write is wrapped in try/catch.
   ================================================================ */

/* ── APP STATE ── */
var APP = {
  page:       'home',
  newsFilter: 'all',
  watchlist:  [],
  settings:   {},
  recs:       { short: [], long: [], avoid: [] },
  liveTimer:  null
};

/* ── Tooltip state ── */
var _ttTimer = null;

/* ════════════════════════════════════════
   BOOT — runs as soon as DOM is ready
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  try { loadSettings(); }    catch(e) { console.error('loadSettings', e); }
  try { loadWatchlist(); }   catch(e) { console.error('loadWatchlist', e); }
  try { loadPortfolio(); }   catch(e) { console.error('loadPortfolio', e); }
  try { apiLoadKeys(); }     catch(e) {}
  try { updateMarketStatus(); } catch(e) {}
  try { initRecs(); }        catch(e) { console.error('initRecs', e); }
  try { renderHome(); }      catch(e) { console.error('renderHome', e); }
  try { renderPicks(); }     catch(e) { console.error('renderPicks', e); }
  try { renderNews('all'); } catch(e) { console.error('renderNews', e); }
  try { renderAlerts(); }    catch(e) { console.error('renderAlerts', e); }
  try { renderWatchlist(); } catch(e) { console.error('renderWatchlist', e); }
  try { renderPortfolio(); } catch(e) { console.error('renderPortfolio', e); }
  try { drawGauge(54); }     catch(e) {}
  // Cascade engine on home page
  setTimeout(function() {
    try { renderCascades(); } catch(e) {}
    try { liveRefresh(); }    catch(e) {}
  }, 100);
  // Auto-refresh every 5 minutes
  APP.liveTimer = setInterval(function() {
    try { liveRefresh(); } catch(e) {}
  }, 5 * 60 * 1000);
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
  try { if (APP.settings.finnhub)  document.getElementById('setting-finnhub').value = APP.settings.finnhub; } catch(e) {}
  try { if (APP.settings.newsapi)  document.getElementById('setting-newsapi').value = APP.settings.newsapi; } catch(e) {}
  try { if (APP.settings.t212 === false) document.getElementById('setting-t212').checked = false; } catch(e) {}
  try { if (APP.settings.autorefresh === false) document.getElementById('setting-autorefresh').checked = false; } catch(e) {}
}

function saveSettings() {
  try {
    APP.settings = {
      risk:        document.getElementById('setting-risk').value,
      currency:    document.getElementById('setting-currency').value,
      finnhub:     document.getElementById('setting-finnhub').value.trim(),
      newsapi:     document.getElementById('setting-newsapi').value.trim(),
      t212:        document.getElementById('setting-t212').checked,
      autorefresh: document.getElementById('setting-autorefresh').checked
    };
    localStorage.setItem('ss_settings', JSON.stringify(APP.settings));
    apiLoadKeys();
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

function liveRefresh() {
  return Promise.all([
    fetchIndices().then(function(data) {
      if (data) updateMarketCards(data);
      updateTimestamp();
      updateTicker(data);
    }).catch(function() {}),
    fetchFearGreed().then(function(fg) {
      if (fg) updateGauge(fg.score, fg.label);
    }).catch(function() {}),
    fetchStockPrices(Object.keys(STOCKS)).then(function(prices) {
      if (prices) {
        updateStockPrices(prices);
        // Also update portfolio with live prices
        try { updatePortfolioPrices(prices); renderPortfolioSummary(); renderPortfolioHoldings(); } catch(e) {}
        try { updateAlertBadge(); } catch(e) {}
      }
    }).catch(function() {})
  ]).catch(function() {});
}

/* ════════════════════════════════════════
   MARKET STATUS (no network needed)
════════════════════════════════════════ */
function updateMarketStatus() {
  var now = new Date();
  var day = now.getUTCDay();
  var h   = now.getUTCHours();
  var m   = now.getUTCMinutes();
  var tot = h * 60 + m;
  var dot = document.getElementById('dot-status');
  var txt = document.getElementById('txt-status');
  if (!dot || !txt) return;
  dot.className = '';
  if (day === 0 || day === 6) {
    dot.classList.add('closed'); txt.textContent = 'Weekend';
  } else if (tot >= 840 && tot < 1260) {
    dot.classList.add('open');   txt.textContent = 'US Market Open';
  } else if (tot >= 720 && tot < 840) {
    dot.classList.add('pre');    txt.textContent = 'Pre-Market';
  } else if (tot >= 1260 && tot < 1380) {
    dot.classList.add('pre');    txt.textContent = 'After-Hours';
  } else {
    dot.classList.add('closed'); txt.textContent = 'US Closed';
  }
}
setInterval(updateMarketStatus, 60000);

function updateTimestamp() {
  var el = document.getElementById('txt-updated');
  if (el) el.textContent = 'Updated ' + new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

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
      if (prEl && p.price) prEl.textContent = '$' + p.price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2});
      if (chEl) {
        chEl.textContent = (p.chg >= 0 ? '+' : '') + p.chg.toFixed(2) + '%';
        chEl.className = 'sc-chg ' + (p.chg >= 0 ? 'up' : 'dn');
      }
    } catch(e) {}
  });
}

/* ════════════════════════════════════════
   RENDER PICKS
════════════════════════════════════════ */
function renderPicks() {
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
  var prStr  = price ? '$' + price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—';
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
════════════════════════════════════════ */
function renderWatchlist(prices) {
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
      var live  = (prices && prices[sym]) || {};
      var known = STOCKS[sym] || {};
      var price = live.price || known.price || null;
      var chg   = live.chg   !== undefined ? live.chg : (known.chg || 0);
      var prStr = price ? '$' + price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—';
      var chStr = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
      var div = document.createElement('div');
      div.className = 'wl-item';
      div.onclick = function() { openStockDetail(sym); };
      div.innerHTML =
        '<div class="wl-sym">' + sym + '</div>' +
        '<div class="wl-name">' + (known.name || sym) + '</div>' +
        '<div style="text-align:right">' +
          '<div class="wl-pr">' + prStr + '</div>' +
          '<div class="wl-ch ' + (chg >= 0 ? 'up' : 'dn') + '">' + chStr + '</div>' +
        '</div>' +
        '<button class="wl-rm" onclick="event.stopPropagation();removeWatchlist(\'' + sym + '\')"><i class="fas fa-times"></i></button>';
      items.appendChild(div);
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
      '<div class="sd-price">' + (price ? '$' + price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}) : '—') + '</div>' +
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
