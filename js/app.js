/* ══════════════════════════════════════════════════════════════
   StockSense AI — Main App Controller
   ══════════════════════════════════════════════════════════════ */

/* ─── APP STATE ─── */
const APP = {
  currentPage: 'dashboard',
  currentTab: 'short-term',
  settings: {},
  watchlist: [],
  alerts: [],
  marketData: {},
  recommendations: {},
  priceData: {},
  newsData: [],
  refreshTimer: null,
  gaugeChart: null,
  newsFilter: 'all'
};

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadWatchlist();
  API.loadSettings();
  updateMarketStatus();

  // Render immediately with fallback/curated data so the page shows instantly
  APP.recommendations = ANALYSIS.generateRecommendations({}, APP.settings);
  APP.newsData = API._getCuratedNews();
  loadFallbackMarketData();
  renderDashboard();
  renderRecommendations();
  renderNews();
  renderAlerts();

  // Then fetch live data in the background (no await — non-blocking)
  refreshAll();
  startAutoRefresh();
});

function loadFallbackMarketData() {
  APP.marketData = {
    indices: {
      SP500:  API._fallbackIndex('SP500'),
      NASDAQ: API._fallbackIndex('NASDAQ'),
      DOW:    API._fallbackIndex('DOW'),
      FTSE:   API._fallbackIndex('FTSE'),
      GOLD:   API._fallbackIndex('GOLD'),
      OIL:    API._fallbackIndex('OIL'),
      VIX:    API._fallbackIndex('VIX'),
      BTC:    API._fallbackIndex('BTC')
    },
    sectors: [
      { name:'Technology', emoji:'💻', changePct: 1.2 },
      { name:'Energy',     emoji:'⚡', changePct: -0.8 },
      { name:'Financials', emoji:'🏦', changePct: 0.4 },
      { name:'Healthcare', emoji:'🏥', changePct: 0.9 },
      { name:'Industrials',emoji:'🏭', changePct: 0.3 },
      { name:'Consumer',   emoji:'🛒', changePct: -0.1 },
      { name:'Defence',    emoji:'🛡️', changePct: 1.5 },
      { name:'Utilities',  emoji:'💡', changePct: -0.5 },
      { name:'Materials',  emoji:'⛏️', changePct: 0.6 }
    ],
    sentiment: { score: 54, label: 'Neutral' }
  };
}

/* ─── SETTINGS ─── */
function loadSettings() {
  try {
    APP.settings = JSON.parse(localStorage.getItem('stocksense_settings') || '{}');
  } catch(e) { APP.settings = {}; }

  // Apply saved settings to UI
  if (APP.settings.riskLevel) document.getElementById('risk-level').value = APP.settings.riskLevel;
  if (APP.settings.currency) document.getElementById('currency').value = APP.settings.currency;
  if (APP.settings.exchangeFocus) document.getElementById('exchange-focus').value = APP.settings.exchangeFocus;
  if (APP.settings.finnhub) document.getElementById('key-finnhub').value = APP.settings.finnhub;
  if (APP.settings.alphavantage) document.getElementById('key-alphavantage').value = APP.settings.alphavantage;
  if (APP.settings.newsapi) document.getElementById('key-newsapi').value = APP.settings.newsapi;
  if (APP.settings.autoRefresh === false) document.getElementById('tog-autorefresh').checked = false;
}

function saveSettings() {
  APP.settings = {
    riskLevel: document.getElementById('risk-level').value,
    currency: document.getElementById('currency').value,
    exchangeFocus: document.getElementById('exchange-focus').value,
    finnhub: document.getElementById('key-finnhub').value.trim(),
    alphavantage: document.getElementById('key-alphavantage').value.trim(),
    newsapi: document.getElementById('key-newsapi').value.trim(),
    autoRefresh: document.getElementById('tog-autorefresh').checked,
    showT212: document.getElementById('tog-t212').checked
  };
  localStorage.setItem('stocksense_settings', JSON.stringify(APP.settings));
  API.loadSettings();
  closeModal('settings-modal');
  showToast('Settings saved!', 'ok');
  refreshAll();
}

/* ─── WATCHLIST ─── */
function loadWatchlist() {
  try {
    APP.watchlist = JSON.parse(localStorage.getItem('stocksense_watchlist') || '[]');
  } catch(e) { APP.watchlist = []; }
}

function saveWatchlist() {
  localStorage.setItem('stocksense_watchlist', JSON.stringify(APP.watchlist));
}

async function addToWatchlist() {
  const input = document.getElementById('stock-search');
  const symbol = input.value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');
  if (!symbol) return;
  if (APP.watchlist.includes(symbol)) { showToast(`${symbol} already in watchlist`, 'info'); return; }
  APP.watchlist.push(symbol);
  saveWatchlist();
  input.value = '';
  showToast(`Added ${symbol} to watchlist`, 'ok');
  renderWatchlist();
}

function removeFromWatchlist(symbol) {
  APP.watchlist = APP.watchlist.filter(s => s !== symbol);
  saveWatchlist();
  renderWatchlist();
  showToast(`Removed ${symbol}`, 'info');
}

async function renderWatchlist() {
  const container = document.getElementById('watchlist-items');
  const empty = document.getElementById('wl-empty');

  if (APP.watchlist.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  // Fetch prices for watchlist
  let prices = {};
  if (APP.watchlist.length > 0) {
    const data = await API.getStockPrices(APP.watchlist);
    if (data) prices = data;
  }

  // Remove old watchlist items (not the empty state)
  container.querySelectorAll('.wl-item').forEach(el => el.remove());

  APP.watchlist.forEach(symbol => {
    const q = prices[symbol] || {};
    const price = q.price || '--';
    const chgPct = q.changePct || 0;
    const chgStr = chgPct !== 0 ? `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%` : '--';
    const cls = chgPct >= 0 ? 'up' : 'dn';
    const known = ANALYSIS.stocks[symbol];

    const div = document.createElement('div');
    div.className = 'wl-item';
    div.onclick = () => openStockDetail(symbol);
    div.innerHTML = `
      <div class="wl-sym">${symbol}</div>
      <div class="wl-name">${known?.name || q.name || symbol}</div>
      <div class="wl-right">
        <div class="wl-price">${typeof price === 'number' ? '$' + price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}) : price}</div>
        <div class="wl-chg ${cls}">${chgStr}</div>
      </div>
      <button class="wl-remove" onclick="event.stopPropagation();removeFromWatchlist('${symbol}')">
        <i class="fas fa-times"></i>
      </button>`;
    container.appendChild(div);
  });
}

/* ═══════════════════════════════════════
   MAIN REFRESH
═══════════════════════════════════════ */
async function refreshAll() {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');

  try {
    await Promise.all([
      loadMarketData(),
      loadNews(),
    ]);
    await loadRecommendations();
    renderDashboard();
    renderRecommendations();
    renderNews();
    renderAlerts();
    if (APP.currentPage === 'watchlist') renderWatchlist();

    document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  } catch(e) {
    console.error('Refresh error:', e);
  }

  btn.classList.remove('spinning');
}

async function loadMarketData() {
  const [indices, sectors, sentiment] = await Promise.all([
    API.getMarketIndices(),
    API.getSectorPerformance(),
    API.getFearGreedIndex()
  ]);
  APP.marketData = { indices, sectors, sentiment };
}

async function loadRecommendations() {
  // Fetch prices for all tracked stocks
  const symbols = Object.keys(ANALYSIS.stocks);
  const priceData = await API.getStockPrices(symbols);
  APP.priceData = priceData || {};
  APP.recommendations = ANALYSIS.generateRecommendations(APP.priceData, APP.settings);
}

async function loadNews() {
  APP.newsData = await API.getMarketNews();
}

function startAutoRefresh() {
  if (APP.refreshTimer) clearInterval(APP.refreshTimer);
  if (APP.settings.autoRefresh !== false) {
    APP.refreshTimer = setInterval(refreshAll, 5 * 60 * 1000);
  }
}

/* ═══════════════════════════════════════
   MARKET STATUS
═══════════════════════════════════════ */
function updateMarketStatus() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const utcDay = now.getUTCDay();
  const totalMin = utcHour * 60 + utcMin;
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');

  if (utcDay === 0 || utcDay === 6) {
    dot.className = 'status-dot closed';
    txt.textContent = 'Weekend';
  } else if (totalMin >= 840 && totalMin < 1260) { // 14:00-21:00 UTC = 9:30-16:00 ET
    dot.className = 'status-dot open';
    txt.textContent = 'US Market Open';
  } else if (totalMin >= 720 && totalMin < 840) {
    dot.className = 'status-dot pre';
    txt.textContent = 'Pre-Market';
  } else if (totalMin >= 1260 && totalMin < 1440) {
    dot.className = 'status-dot pre';
    txt.textContent = 'After-Hours';
  } else {
    dot.className = 'status-dot closed';
    txt.textContent = 'US Closed';
  }
}

/* ═══════════════════════════════════════
   RENDER DASHBOARD
═══════════════════════════════════════ */
function renderDashboard() {
  renderMarketCards();
  renderTicker();
  renderSectors();
  renderSentiment();
  renderTopPicks();
  renderEventAlerts();
  updateAIBanner();
}

function renderMarketCards() {
  const idx = APP.marketData.indices || {};
  const map = {
    'sp500': { data: idx.SP500,  fmt: v => '$' + v.toLocaleString('en', {maximumFractionDigits:0}) },
    'nasdaq': { data: idx.NASDAQ, fmt: v => '$' + v.toLocaleString('en', {maximumFractionDigits:0}) },
    'dow':   { data: idx.DOW,    fmt: v => '$' + v.toLocaleString('en', {maximumFractionDigits:0}) },
    'ftse':  { data: idx.FTSE,   fmt: v => v.toLocaleString('en', {maximumFractionDigits:0}) },
    'gold':  { data: idx.GOLD,   fmt: v => '$' + v.toLocaleString('en', {minimumFractionDigits:0, maximumFractionDigits:0}) },
    'oil':   { data: idx.OIL,    fmt: v => '$' + v.toFixed(2) },
    'vix':   { data: idx.VIX,    fmt: v => v.toFixed(2) },
    'btc':   { data: idx.BTC,    fmt: v => '$' + Math.round(v).toLocaleString('en') }
  };

  Object.entries(map).forEach(([id, { data, fmt }]) => {
    if (!data) return;
    const valEl = document.getElementById(`${id}-val`);
    const chgEl = document.getElementById(`${id}-chg`);
    if (!valEl || !chgEl) return;

    const isVix = id === 'vix';
    valEl.textContent = fmt(data.price);
    const pct = data.changePct || 0;
    const upForVix = pct < 0; // VIX down = market up = good
    const isUp = isVix ? (pct < 0) : (pct >= 0);
    chgEl.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
    chgEl.className = `mkt-chg ${pct === 0 ? 'neutral' : isUp ? 'up' : 'dn'}`;
  });
}

function renderTicker() {
  const idx = APP.marketData.indices || {};
  const items = [
    { sym: 'S&P 500', d: idx.SP500 },
    { sym: 'NASDAQ', d: idx.NASDAQ },
    { sym: 'DOW', d: idx.DOW },
    { sym: 'FTSE 100', d: idx.FTSE },
    { sym: 'GOLD', d: idx.GOLD },
    { sym: 'OIL', d: idx.OIL },
    { sym: 'VIX', d: idx.VIX },
    { sym: 'BTC', d: idx.BTC },
    // Add top stocks
    ...Object.entries(APP.priceData || {}).slice(0, 8).map(([sym, q]) => ({
      sym, d: { price: q.price, changePct: q.changePct }
    }))
  ];

  const content = items.filter(i => i.d && i.d.price).map(({ sym, d }) => {
    const cls = d.changePct >= 0 ? 'tick-up' : 'tick-dn';
    const arrow = d.changePct >= 0 ? '▲' : '▼';
    return `<span class="tick"><span class="tick-sym">${sym}</span> ${d.price > 1000 ? Math.round(d.price).toLocaleString('en') : d.price.toFixed(2)} <span class="${cls}">${arrow}${Math.abs(d.changePct || 0).toFixed(2)}%</span></span>`;
  }).join('');

  const track = document.getElementById('ticker-track');
  if (track && content) track.innerHTML = content + content; // double for seamless loop
}

function renderSectors() {
  const sectors = APP.marketData.sectors || [];
  const grid = document.getElementById('sector-grid');
  if (!grid) return;
  grid.innerHTML = sectors.map(s => `
    <div class="sector-tile">
      <div class="sector-emoji">${s.emoji}</div>
      <div class="sector-name">${s.name}</div>
      <div class="sector-perf ${s.changePct >= 0 ? 'up' : 'dn'}">${s.changePct >= 0 ? '+' : ''}${s.changePct}%</div>
    </div>`).join('');
}

function renderSentiment() {
  const s = APP.marketData.sentiment || { score: 50, label: 'Neutral' };
  document.getElementById('gauge-num').textContent = s.score;
  document.getElementById('gauge-lbl').textContent = s.label;

  // Sentiment bars
  const score = s.score;
  const isGreed = score > 55;
  const isFear = score < 45;

  const momentum = isGreed ? Math.min(95, score + 10) : Math.max(15, score - 15);
  const safehaven = isFear ? Math.min(90, 100 - score + 20) : Math.max(10, 100 - score - 10);
  const volatility = isFear ? Math.min(85, 100 - score) : Math.max(15, 60 - score * 0.5);
  const breadth = isGreed ? Math.min(90, score + 5) : Math.max(20, score - 5);

  setBar('bar-momentum', momentum);
  setBar('bar-safehaven', safehaven);
  setBar('bar-volatility', volatility);
  setBar('bar-breadth', breadth);

  drawGauge(s.score);
}

function setBar(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = pct + '%';
}

function drawGauge(score) {
  const canvas = document.getElementById('gauge-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H - 10;
  const R = Math.min(W, H * 2) / 2 - 10;

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI, 0);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#2a2a42';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Gradient arc
  const angle = Math.PI + (Math.PI * score / 100);
  const grad = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
  grad.addColorStop(0, '#ff4444');
  grad.addColorStop(0.5, '#ffcc00');
  grad.addColorStop(1, '#00e676');

  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI, angle);
  ctx.lineWidth = 14;
  ctx.strokeStyle = grad;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function renderTopPicks() {
  const container = document.getElementById('top-picks-container');
  if (!container) return;
  const top = [...(APP.recommendations.short || [])].slice(0, 3);
  if (top.length === 0) {
    container.innerHTML = '<div class="skeleton"></div>';
    return;
  }
  container.innerHTML = top.map(r => buildStockCard(r, 'compact')).join('');
}

function renderEventAlerts() {
  const container = document.getElementById('event-alerts-container');
  if (!container) return;
  const news = APP.newsData.slice(0, 4);
  if (news.length === 0) {
    container.innerHTML = '<div class="skeleton"></div>';
    return;
  }
  container.innerHTML = news.map(n => buildNewsCard(ANALYSIS.categoriseNews(n))).join('');
}

function updateAIBanner() {
  const headline = ANALYSIS.getAIHeadline(APP.recommendations, APP.marketData);
  const el = document.getElementById('ai-subtitle');
  if (el) el.textContent = headline;
}

/* ═══════════════════════════════════════
   RENDER RECOMMENDATIONS
═══════════════════════════════════════ */
function renderRecommendations() {
  const { short = [], long = [], avoid = [] } = APP.recommendations;

  document.getElementById('short-term-list').innerHTML = short.length
    ? short.map(r => buildStockCard(r, 'full')).join('')
    : '<p style="color:var(--text3);text-align:center;padding:30px">Analysing market data...</p>';

  document.getElementById('long-term-list').innerHTML = long.length
    ? long.map(r => buildStockCard(r, 'full')).join('')
    : '<p style="color:var(--text3);text-align:center;padding:30px">Analysing fundamentals...</p>';

  document.getElementById('avoid-list').innerHTML = avoid.length
    ? avoid.map(r => buildStockCard(r, 'avoid')).join('')
    : '<p style="color:var(--text3);text-align:center;padding:30px">No stocks to avoid right now.</p>';
}

/* ─── BUILD STOCK CARD ─── */
function buildStockCard(r, mode) {
  const priceStr = r.price ? '$' + Number(r.price).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
  const chgStr = r.changePct ? `${r.changePct >= 0 ? '+' : ''}${r.changePct.toFixed(2)}%` : '--';
  const chgCls = (r.changePct || 0) >= 0 ? 'up' : 'dn';
  const action = r.action || 'watch';
  const riskCls = r.riskLevel || 'medium';

  const actionIcons = { buy: 'fa-arrow-up', sell: 'fa-arrow-down', hold: 'fa-minus', watch: 'fa-eye', avoid: 'fa-ban' };
  const actionLabels = { buy: 'BUY', sell: 'SELL', hold: 'HOLD', watch: 'WATCH', avoid: 'AVOID / SELL' };

  const isAvoid = mode === 'avoid' || action === 'avoid' || action === 'sell';
  const thesis = isAvoid ? (r.thesis?.risk || '') : (mode === 'full' ? r.thesis?.short : r.thesis?.short?.split('.')[0]);

  const showT212 = APP.settings.showT212 !== false;
  const t212Link = showT212 && r.t212 ? `<a class="t212-link" href="https://www.trading212.com/search?query=${r.symbol}" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Open in Trading 212</a>` : '';

  const catalysts = mode === 'full' && !isAvoid && r.catalysts?.length
    ? `<div style="margin-top:10px;font-size:11px;color:var(--text2)"><strong style="color:var(--green)">Key Catalysts:</strong> ${r.catalysts.slice(0, 2).join(' • ')}</div>` : '';

  const risks = mode === 'full' && r.risks?.length
    ? `<div style="margin-top:4px;font-size:11px;color:var(--text2)"><strong style="color:var(--red)">Risks:</strong> ${r.risks.slice(0, 2).join(' • ')}</div>` : '';

  const targets = !isAvoid && r.target12m
    ? `<div class="sc-meta">
        <div class="sc-metric"><span class="sc-metric-label">12M Target</span><span class="sc-metric-val" style="color:var(--green)">${r.target12m}</span></div>
        <div class="sc-metric"><span class="sc-metric-label">Sector</span><span class="sc-metric-val">${r.sector}</span></div>
        <div class="sc-metric"><span class="sc-metric-label">P/E</span><span class="sc-metric-val">${r.pe || '--'}</span></div>
        <div class="sc-metric"><span class="sc-metric-label">Growth</span><span class="sc-metric-val">${r.growth || '--'}</span></div>
      </div>` : '';

  const confidence = !isAvoid
    ? `<div class="confidence-row">
        <div class="confidence-labels"><span>AI Confidence</span><span>${r.confidence}%</span></div>
        <div class="confidence-bar"><div class="confidence-fill" style="width:${r.confidence}%"></div></div>
      </div>` : '';

  const riskBar = `<div class="risk-row">
    <span class="risk-lbl">Risk:</span>
    <div class="risk-bar"><div class="risk-bar-fill ${riskCls}" style="width:${r.riskWidth}"></div></div>
    <span class="risk-val" style="color:${riskCls === 'low' ? 'var(--green)' : riskCls === 'high' ? 'var(--red)' : 'var(--yellow)'}">${riskCls.charAt(0).toUpperCase() + riskCls.slice(1)}</span>
  </div>`;

  return `
    <div class="stock-card ${action}" onclick="openStockDetail('${r.symbol}')">
      <div class="sc-top">
        <div class="sc-left">
          <div class="sc-icon">${r.symbol.slice(0, 3)}</div>
          <div>
            <div class="sc-sym">${r.symbol}</div>
            <div class="sc-name">${r.name}</div>
          </div>
        </div>
        <div class="sc-right">
          <div class="sc-price">${priceStr}</div>
          <div class="sc-chg ${chgCls}">${chgStr}</div>
        </div>
      </div>
      <div class="action-pill ${action}"><i class="fas ${actionIcons[action]}"></i> ${actionLabels[action]}</div>
      ${thesis ? `<div class="sc-reason">${thesis}</div>` : ''}
      ${targets}
      ${catalysts}
      ${risks}
      ${confidence}
      ${riskBar}
      ${t212Link}
    </div>`;
}

/* ═══════════════════════════════════════
   RENDER NEWS
═══════════════════════════════════════ */
function renderNews() {
  const container = document.getElementById('news-list');
  if (!container) return;
  const filtered = APP.newsFilter === 'all'
    ? APP.newsData
    : APP.newsData.filter(n => ANALYSIS.categoriseNews(n).category === APP.newsFilter);

  container.innerHTML = filtered.length
    ? filtered.map(n => buildNewsCard(ANALYSIS.categoriseNews(n))).join('')
    : '<p style="color:var(--text3);text-align:center;padding:30px">No news in this category right now.</p>';
}

function buildNewsCard(n) {
  const timeAgo = getTimeAgo(n.time);
  const hasImpact = n.direction && n.direction !== 'neutral' && n.impactDetail;
  const impactCls = n.direction === 'bull' ? 'bull' : n.direction === 'bear' ? 'bear' : 'neutral';
  const impactIcon = n.direction === 'bull' ? '▲' : n.direction === 'bear' ? '▼' : '—';

  const stocks = (n.stocks || n.affectedStocks || []).slice(0, 5);
  const stockTags = stocks.length
    ? `<div class="nc-stocks">${stocks.map(s => `<span class="nc-stock">${s}</span>`).join('')}</div>` : '';

  const link = n.url ? `onclick="window.open('${n.url}', '_blank')"` : '';

  return `
    <div class="news-card" ${link}>
      <div class="nc-top">
        <span class="nc-cat ${n.category}">${n.category}</span>
        ${hasImpact ? `<span class="nc-impact-badge ${impactCls}">${impactIcon} ${n.direction === 'bull' ? 'Bullish' : 'Bearish'}</span>` : ''}
        <span class="nc-time">${timeAgo}</span>
      </div>
      <div class="nc-title">${n.title}</div>
      ${n.summary ? `<div class="nc-summary">${n.summary}</div>` : ''}
      ${hasImpact ? `<div class="nc-impact ${impactCls}"><i class="fas ${impactCls === 'bull' ? 'fa-chart-line' : 'fa-chart-line-down'} mr-2"></i> <strong>Market Impact:</strong> ${n.impactDetail}</div>` : ''}
      ${stockTags}
    </div>`;
}

function filterNews(el) {
  document.querySelectorAll('#news-filters .chip').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  APP.newsFilter = el.dataset.filter;
  renderNews();
}

/* ═══════════════════════════════════════
   RENDER ALERTS
═══════════════════════════════════════ */
function renderAlerts() {
  APP.alerts = ANALYSIS.generateAlerts(APP.recommendations, APP.marketData);
  const container = document.getElementById('alerts-feed');
  if (!container) return;

  container.innerHTML = APP.alerts.map(a => `
    <div class="alert-item">
      <div class="alert-ico ${a.cls}"><i class="fas ${a.icon}"></i></div>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-desc">${a.desc}</div>
        <div class="alert-when">${getTimeAgo(a.time)}</div>
      </div>
    </div>`).join('');

  // Badge count
  const badge = document.getElementById('alert-count');
  const count = APP.alerts.length;
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

/* ═══════════════════════════════════════
   STOCK DETAIL MODAL
═══════════════════════════════════════ */
function openStockDetail(symbol) {
  const stock = ANALYSIS.stocks[symbol];
  const priceInfo = APP.priceData[symbol] || {};
  const price = priceInfo.price || ANALYSIS._estimatePrice(symbol);
  const chgPct = priceInfo.changePct || 0;
  const chgCls = chgPct >= 0 ? 'up' : 'dn';
  const chgStr = `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%`;

  document.getElementById('stock-modal-title').textContent = symbol + ' — ' + (stock?.name || symbol);

  const showT212 = APP.settings.showT212 !== false;
  const t212 = showT212 ? `<a class="t212-link" href="https://www.trading212.com/search?query=${symbol}" target="_blank" rel="noopener" style="margin-top:16px;display:inline-flex"><i class="fas fa-external-link-alt"></i> Trade on Trading 212</a>` : '';

  const catalysts = stock?.catalysts?.map(c => `<li style="margin-bottom:4px;color:var(--green)">✓ ${c}</li>`).join('') || '';
  const risks = stock?.risks?.map(r => `<li style="margin-bottom:4px;color:var(--red)">✗ ${r}</li>`).join('') || '';

  const body = `
    <div class="stock-detail-header">
      <div class="stock-detail-icon">${symbol.slice(0,3)}</div>
      <div class="stock-detail-info">
        <h3>${symbol}</h3>
        <p>${stock?.name || symbol} • ${stock?.sector || ''} • ${stock?.exchange || ''}</p>
      </div>
    </div>
    <div class="detail-price-row">
      <div class="detail-price">$${Number(price).toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
      <div class="detail-chg ${chgCls}">${chgStr} today</div>
    </div>
    <div class="detail-stats">
      <div class="detail-stat"><div class="detail-stat-label">12M Target</div><div class="detail-stat-val" style="color:var(--green)">${stock?.target12m || '--'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Long-Term</div><div class="detail-stat-val" style="color:var(--purple)">${stock?.targetLong || '--'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">P/E Ratio</div><div class="detail-stat-val">${stock?.pe || '--'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Revenue Growth</div><div class="detail-stat-val">${stock?.growth || '--'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Risk Level</div><div class="detail-stat-val" style="color:${stock?.riskLevel==='low'?'var(--green)':stock?.riskLevel==='high'?'var(--red)':'var(--yellow)'}">${stock?.riskLevel || '--'}</div></div>
      <div class="detail-stat"><div class="detail-stat-label">Exchange</div><div class="detail-stat-val">${stock?.exchange || '--'}</div></div>
    </div>
    ${stock?.thesis?.short ? `<div class="detail-analysis"><h4><i class="fas fa-bolt"></i> Short-Term Thesis</h4><p>${stock.thesis.short}</p></div>` : ''}
    ${stock?.thesis?.long ? `<div class="detail-analysis"><h4><i class="fas fa-seedling"></i> Long-Term Thesis</h4><p>${stock.thesis.long}</p></div>` : ''}
    ${stock?.thesis?.risk ? `<div class="detail-analysis" style="border-color:rgba(255,68,68,0.3)"><h4 style="color:var(--red)"><i class="fas fa-exclamation-triangle"></i> Key Risks</h4><p>${stock.thesis.risk}</p></div>` : ''}
    ${catalysts ? `<div class="detail-analysis"><h4><i class="fas fa-check-circle"></i> Catalysts</h4><ul style="list-style:none;padding:0;font-size:12px">${catalysts}</ul></div>` : ''}
    ${risks ? `<div class="detail-analysis" style="border-color:rgba(255,68,68,0.3)"><h4 style="color:var(--red)"><i class="fas fa-times-circle"></i> Watch Out For</h4><ul style="list-style:none;padding:0;font-size:12px">${risks}</ul></div>` : ''}
    ${t212}
    <button onclick="addToWatchlist(); document.getElementById('stock-search').value='${symbol}';" class="primary-btn" style="margin-top:12px">
      <i class="fas fa-star"></i> Add to Watchlist
    </button>`;

  document.getElementById('stock-modal-body').innerHTML = body;
  openModal('stock-modal');
}

/* ═══════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════ */
function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  // Show target
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  const navBtn = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  APP.currentPage = page;
  window.scrollTo(0, 0);

  // Load page data
  if (page === 'watchlist') renderWatchlist();
  if (page === 'alerts') renderAlerts();
}

/* ─── TAB SWITCHING ─── */
function switchTab(el) {
  const tab = el.dataset.tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const panel = document.getElementById(tab);
  if (panel) panel.classList.add('active');
}

/* ═══════════════════════════════════════
   MODALS
═══════════════════════════════════════ */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

// Close on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('open');
  }
});

/* ═══════════════════════════════════════
   ALERT BANNER
═══════════════════════════════════════ */
function showAlertBanner(msg) {
  const banner = document.getElementById('alert-banner');
  const text = document.getElementById('alert-text');
  if (banner && text) {
    text.textContent = msg;
    banner.style.display = 'flex';
  }
}

function dismissAlert() {
  const banner = document.getElementById('alert-banner');
  if (banner) banner.style.display = 'none';
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ═══════════════════════════════════════
   UTILITIES
═══════════════════════════════════════ */
function getTimeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmt(n, dp = 2) {
  if (n === null || n === undefined || n === '--') return '--';
  return Number(n).toLocaleString('en', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// Update market status every minute
setInterval(updateMarketStatus, 60000);
