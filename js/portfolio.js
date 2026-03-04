/* ================================================================
   StockSense AI — Portfolio Manager
   Handles investment portfolio tracking, image/manual entry,
   geopolitical risk scoring, and continuous AI monitoring.
   ================================================================ */

var PORTFOLIO = {
  holdings: [],
  alerts:   [],
  lastUpdated: null
};

/* ════════════════════════════════════════
   PORTFOLIO DISPLAY CURRENCY
   Default GBP — user can toggle to USD/EUR.
   All summary totals are converted to this.
════════════════════════════════════════ */
var PORTFOLIO_CURRENCY = 'GBP';

function loadPortfolioCurrency() {
  try { PORTFOLIO_CURRENCY = localStorage.getItem('ss_port_currency') || 'GBP'; } catch(e) {}
}

function setPortfolioCurrency(c) {
  PORTFOLIO_CURRENCY = c;
  try { localStorage.setItem('ss_port_currency', c); } catch(e) {}
  renderPortfolio();
}

function getPortfolioCurrencySymbol() {
  return PORTFOLIO_CURRENCY === 'USD' ? '$' : PORTFOLIO_CURRENCY === 'EUR' ? '€' : '£';
}

/* Detect native price currency from ticker suffix */
function getNativeCurrency(sym) {
  if (!sym) return 'USD';
  var u = sym.toUpperCase();
  if (u.endsWith('.L'))  return 'GBp'; /* LSE stocks quoted in pence */
  if (u.endsWith('.DE') || u.endsWith('.PA') || u.endsWith('.AS') ||
      u.endsWith('.MC') || u.endsWith('.MI') || u.endsWith('.BR') ||
      u.endsWith('.LS') || u.endsWith('.HE')) return 'EUR';
  if (u.endsWith('.SW')) return 'CHF';
  if (u.endsWith('.HK')) return 'HKD'; /* Hong Kong dollars */
  if (u.endsWith('.SS') || u.endsWith('.SZ')) return 'CNY'; /* Chinese yuan */
  return 'USD';
}

/*
  Convert a value from a stock's native currency → GBP → target display currency.
  FX_RATES from api.js: { GBPUSD, GBPEUR, GBPCHF, GBPHKD, GBPCNY }
*/
function toPortfolioBase(value, sym) {
  if (!value || isNaN(value)) return 0;
  var rates  = (typeof FX_RATES !== 'undefined') ? FX_RATES
             : { GBPUSD: 1.27, GBPEUR: 1.17, GBPCHF: 1.14, GBPHKD: 9.87, GBPCNY: 9.25 };
  var native = getNativeCurrency(sym);

  /* Step 1 — convert native → GBP */
  var gbp;
  if      (native === 'GBp') gbp = value / 100;                     /* pence → pounds      */
  else if (native === 'USD') gbp = value / (rates.GBPUSD || 1.27);
  else if (native === 'EUR') gbp = value / (rates.GBPEUR || 1.17);
  else if (native === 'CHF') gbp = value / (rates.GBPCHF || 1.14);
  else if (native === 'HKD') gbp = value / (rates.GBPHKD || 9.87);  /* Hong Kong dollars   */
  else if (native === 'CNY') gbp = value / (rates.GBPCNY || 9.25);  /* Chinese yuan        */
  else                       gbp = value / (rates.GBPUSD || 1.27);  /* assume USD          */

  /* Step 2 — convert GBP → target display currency */
  if (PORTFOLIO_CURRENCY === 'GBP') return gbp;
  if (PORTFOLIO_CURRENCY === 'USD') return gbp * (rates.GBPUSD || 1.27);
  if (PORTFOLIO_CURRENCY === 'EUR') return gbp * (rates.GBPEUR || 1.17);
  return gbp;
}

/* ════════════════════════════════════════
   LOAD / SAVE
════════════════════════════════════════ */
function loadPortfolio() {
  try { PORTFOLIO.holdings = JSON.parse(localStorage.getItem('ss_portfolio') || '[]'); }
  catch(e) { PORTFOLIO.holdings = []; }
  loadPortfolioCurrency();
}

function savePortfolio() {
  try { localStorage.setItem('ss_portfolio', JSON.stringify(PORTFOLIO.holdings)); } catch(e) {}
}

/* ════════════════════════════════════════
   ADD / REMOVE HOLDINGS
════════════════════════════════════════ */
function addHolding(sym, shares, avgCost) {
  sym = (sym || '').toUpperCase().replace(/[^A-Z0-9.]/g, '');
  shares  = parseFloat(shares);
  avgCost = parseFloat(avgCost);
  if (!sym || !(shares > 0) || !(avgCost > 0)) return false;

  var existing = null;
  PORTFOLIO.holdings.forEach(function(h) { if (h.sym === sym) existing = h; });

  if (existing) {
    var totalShares = existing.shares + shares;
    existing.avgCost = ((existing.avgCost * existing.shares) + (avgCost * shares)) / totalShares;
    existing.shares  = totalShares;
  } else {
    PORTFOLIO.holdings.push({
      sym: sym,
      name: (STOCKS && STOCKS[sym] && STOCKS[sym].name) || sym,
      shares:   shares,
      avgCost:  avgCost,
      currentPrice: (STOCKS && STOCKS[sym] && STOCKS[sym].price) || avgCost,
      addedDate: new Date().toISOString()
    });
  }
  savePortfolio();
  return true;
}

function removeHolding(sym) {
  PORTFOLIO.holdings = PORTFOLIO.holdings.filter(function(h) { return h.sym !== sym; });
  savePortfolio();
}

function removeHoldingAndRender(sym) {
  if (!confirm('Remove ' + sym + ' from your portfolio?')) return;
  removeHolding(sym);
  renderPortfolio();
  showToast('Removed ' + sym + ' from portfolio', 'info');
}

function updateHolding(sym, newShares, newAvgCost) {
  newShares  = parseFloat(newShares);
  newAvgCost = parseFloat(newAvgCost);
  if (!(newShares > 0) || !(newAvgCost > 0)) return false;
  PORTFOLIO.holdings.forEach(function(h) {
    if (h.sym === sym) { h.shares = newShares; h.avgCost = newAvgCost; }
  });
  savePortfolio();
  return true;
}

/* ════════════════════════════════════════
   PRICE UPDATES & CALCULATIONS
════════════════════════════════════════ */
function updatePortfolioPrices(prices) {
  PORTFOLIO.holdings.forEach(function(h) {
    if (prices && prices[h.sym] && prices[h.sym].price) {
      h.currentPrice = prices[h.sym].price;
      h.currentChg   = prices[h.sym].chg || 0;
    } else if (STOCKS && STOCKS[h.sym] && STOCKS[h.sym].price) {
      h.currentPrice = STOCKS[h.sym].price;
      h.currentChg   = STOCKS[h.sym].chg || 0;
    }
    h.currentValue = h.shares * (h.currentPrice || h.avgCost);
    h.pnl    = (h.currentPrice - h.avgCost) * h.shares;
    h.pnlPct = ((h.currentPrice - h.avgCost) / h.avgCost) * 100;
  });
  PORTFOLIO.lastUpdated = new Date();
}

function getPortfolioSummary() {
  updatePortfolioPrices({});
  var totalCost = 0, totalValue = 0;
  PORTFOLIO.holdings.forEach(function(h) {
    /* Convert each holding's native-currency values to the display base currency */
    totalCost  += toPortfolioBase(h.avgCost * h.shares, h.sym);
    totalValue += toPortfolioBase(h.currentValue || (h.avgCost * h.shares), h.sym);
  });
  return {
    totalCost:   totalCost,
    totalValue:  totalValue,
    totalPnl:    totalValue - totalCost,
    totalPnlPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0
  };
}

/* ════════════════════════════════════════
   GEOPOLITICAL RISK SCORING (per holding)
   PhD-level political risk analysis
════════════════════════════════════════ */
function getHoldingRisk(sym) {
  var stock = STOCKS && STOCKS[sym];
  var score = 40; // default neutral-low
  var factors = [];

  if (stock) {
    // Base from action
    if (stock.action === 'AVOID') { score = 90; factors.push('Avoid-rated by AI'); }
    else if (stock.action === 'WATCH') { score = 60; factors.push('Watch-rated — uncertainty'); }
    else if (stock.action === 'BUY' && stock.risk === 'Low') { score = 20; factors.push('Blue-chip quality'); }
    else if (stock.action === 'BUY' && stock.risk === 'Medium') { score = 35; }

    // Political exposure
    if (stock.political) {
      if (stock.political.tariffs <= -3)  { score += 25; factors.push('High China/tariff exposure'); }
      else if (stock.political.tariffs <= -1.5) { score += 12; factors.push('Moderate tariff exposure'); }
      if (stock.political.nato >= 2)      { score -= 15; factors.push('NATO spending beneficiary'); }
    }

    // Small cap volatility premium
    if (stock.cap === 'small') { score += 10; factors.push('Small cap volatility'); }
  }

  // Check if cascade events flag this stock
  if (typeof SECTOR_CASCADES !== 'undefined') {
    SECTOR_CASCADES.forEach(function(cascade) {
      cascade.effects.forEach(function(fx) {
        if (fx.stocks.indexOf(sym) !== -1) {
          if (fx.direction === 'positive') { score = Math.max(0, score - 8); }
          if (fx.direction === 'negative') { score = Math.min(100, score + 15); }
        }
      });
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  var label, color;
  if (score < 30)      { label = 'Low Risk';    color = 'green';  }
  else if (score < 65) { label = 'Medium Risk'; color = 'yellow'; }
  else                 { label = 'High Risk';   color = 'red';    }

  return { score: score, label: label, color: color, factors: factors };
}

/* ════════════════════════════════════════
   GENERATE PORTFOLIO-SPECIFIC AI ALERTS
════════════════════════════════════════ */
function generatePortfolioAlerts() {
  var alerts = [];
  if (!PORTFOLIO.holdings || !PORTFOLIO.holdings.length) return alerts;

  var ownedSyms = PORTFOLIO.holdings.map(function(h) { return h.sym; });

  // 1. Check macro events for portfolio impact
  if (typeof MACRO_EVENTS !== 'undefined') {
    MACRO_EVENTS.forEach(function(ev) {
      var hitBull = (ev.affected_bull || []).filter(function(s) { return ownedSyms.indexOf(s) !== -1; });
      var hitBear = (ev.affected_bear || []).filter(function(s) { return ownedSyms.indexOf(s) !== -1; });

      if (hitBull.length) {
        alerts.push({
          type: 'buy', icon: 'fa-arrow-up',
          title: ev.title + ' — POSITIVE for Your Portfolio',
          desc: 'Your holdings ' + hitBull.join(', ') + ' are direct beneficiaries. ' + ev.impact,
          stocks: hitBull, when: 'Current event'
        });
      }
      if (hitBear.length) {
        alerts.push({
          type: 'warn', icon: 'fa-exclamation-triangle',
          title: ev.title + ' — REVIEW Your Holdings',
          desc: 'Your holdings ' + hitBear.join(', ') + ' face headwinds. Consider position sizing. ' + ev.impact,
          stocks: hitBear, when: 'Action may be needed'
        });
      }
    });
  }

  // 2. Check sector cascades for portfolio impact
  if (typeof SECTOR_CASCADES !== 'undefined') {
    SECTOR_CASCADES.forEach(function(cascade) {
      cascade.effects.forEach(function(fx) {
        var hits = fx.stocks.filter(function(s) { return ownedSyms.indexOf(s) !== -1; });
        if (!hits.length) return;
        alerts.push({
          type: fx.direction === 'positive' ? 'ai' : 'warn',
          icon: fx.direction === 'positive' ? 'fa-rocket' : 'fa-exclamation-triangle',
          title: 'Cascade: ' + cascade.trigger_event + ' → ' + fx.sector,
          desc: fx.reason + ' Your holdings affected: ' + hits.join(', '),
          stocks: hits,
          when: 'Macro cascade — ' + (cascade.urgency || 'Ongoing')
        });
      });
    });
  }

  // 3. P&L-based alerts
  updatePortfolioPrices({});
  PORTFOLIO.holdings.forEach(function(h) {
    if (!isNaN(h.pnlPct)) {
      if (h.pnlPct <= -20) {
        alerts.push({
          type: 'warn', icon: 'fa-arrow-down',
          title: h.sym + ' — Down ' + Math.abs(h.pnlPct.toFixed(1)) + '% — Review Thesis',
          desc: 'You hold ' + h.shares + ' shares of ' + (h.name || h.sym) + ' at a significant loss. The AI recommends reviewing whether the original investment thesis still holds given current macro conditions.',
          stocks: [h.sym], when: 'Portfolio alert'
        });
      } else if (h.pnlPct >= 40) {
        alerts.push({
          type: 'buy', icon: 'fa-trophy',
          title: h.sym + ' — Up +' + h.pnlPct.toFixed(1) + '% — Consider Trimming',
          desc: 'Strong gain on ' + (h.name || h.sym) + '. Consider taking partial profits (20-30% of position) to lock in gains and rebalance risk. Let winners run but manage position size.',
          stocks: [h.sym], when: 'Portfolio alert'
        });
      }
    }
  });

  // 4. Concentration risk
  updatePortfolioPrices({});
  var summary = getPortfolioSummary();
  if (summary.totalValue > 0) {
    PORTFOLIO.holdings.forEach(function(h) {
      var weight = (h.currentValue / summary.totalValue) * 100;
      if (weight > 25) {
        alerts.push({
          type: 'warn', icon: 'fa-balance-scale',
          title: h.sym + ' is ' + weight.toFixed(0) + '% of Portfolio — Concentration Risk',
          desc: 'Portfolio theory recommends max 10-15% in any single stock. ' + h.sym + ' exceeds safe limits. Consider trimming and diversifying into other sectors.',
          stocks: [h.sym], when: 'Risk management'
        });
      }
    });
  }

  PORTFOLIO.alerts = alerts;
  return alerts;
}

/* ════════════════════════════════════════
   RENDER: PORTFOLIO PAGE
════════════════════════════════════════ */
function renderPortfolio() {
  renderPortfolioSummary();
  renderPortfolioHoldings();
  renderPortfolioAlerts();
}

function renderPortfolioSummary() {
  var el = document.getElementById('port-summary');
  if (!el) return;

  if (!PORTFOLIO.holdings.length) {
    el.innerHTML = '<div class="port-empty-sum"><i class="fas fa-wallet"></i><p>Add your first holding below to see portfolio summary</p></div>';
    return;
  }

  var s      = getPortfolioSummary();
  var isUp   = s.totalPnl >= 0;
  var pnlCls = isUp ? 'up' : 'dn';
  var sign   = isUp ? '+' : '';
  var cs     = getPortfolioCurrencySymbol();

  /* Currency toggle buttons */
  var toggleHtml =
    '<div class="curr-toggle-row">' +
      '<span class="curr-toggle-lbl"><i class="fas fa-globe"></i> Display in:</span>' +
      '<div class="curr-toggle">' +
        '<button onclick="setPortfolioCurrency(\'GBP\')" class="curr-btn' + (PORTFOLIO_CURRENCY==='GBP'?' curr-on':'') + '">£ GBP</button>' +
        '<button onclick="setPortfolioCurrency(\'USD\')" class="curr-btn' + (PORTFOLIO_CURRENCY==='USD'?' curr-on':'') + '">$ USD</button>' +
        '<button onclick="setPortfolioCurrency(\'EUR\')" class="curr-btn' + (PORTFOLIO_CURRENCY==='EUR'?' curr-on':'') + '">€ EUR</button>' +
      '</div>' +
    '</div>';

  el.innerHTML = toggleHtml +
    '<div class="port-sum-grid">' +
      '<div class="port-sum-item">' +
        '<div class="port-sum-lbl"><i class="fas fa-wallet"></i> Total Value</div>' +
        '<div class="port-sum-val">' + cs + fmtNum(s.totalValue, 2) + '</div>' +
      '</div>' +
      '<div class="port-sum-item">' +
        '<div class="port-sum-lbl"><i class="fas fa-coins"></i> Total Cost</div>' +
        '<div class="port-sum-val">' + cs + fmtNum(s.totalCost, 2) + '</div>' +
      '</div>' +
      '<div class="port-sum-item ' + pnlCls + '">' +
        '<div class="port-sum-lbl"><i class="fas fa-chart-line"></i> Total P&L</div>' +
        '<div class="port-sum-val ' + pnlCls + '">' + sign + cs + fmtNum(Math.abs(s.totalPnl), 2) + '</div>' +
      '</div>' +
      '<div class="port-sum-item ' + pnlCls + '">' +
        '<div class="port-sum-lbl"><i class="fas fa-percent"></i> Return</div>' +
        '<div class="port-sum-val ' + pnlCls + '">' + sign + s.totalPnlPct.toFixed(2) + '%</div>' +
      '</div>' +
    '</div>';
}

/* Track which holding is being edited (sym or null) */
var _portEditingSym = null;

function editHolding(sym) {
  _portEditingSym = sym;
  renderPortfolioHoldings();
  /* Focus the first field after render */
  setTimeout(function() {
    var f = document.getElementById('pedit-shares-' + sym);
    if (f) f.focus();
  }, 60);
}

function cancelHoldingEdit() {
  _portEditingSym = null;
  renderPortfolioHoldings();
}

function saveHoldingEdit(sym) {
  var sharesEl = document.getElementById('pedit-shares-' + sym);
  var costEl   = document.getElementById('pedit-cost-'   + sym);
  if (!sharesEl || !costEl) return;
  if (updateHolding(sym, sharesEl.value, costEl.value)) {
    _portEditingSym = null;
    renderPortfolio();
    showToast(sym + ' updated', 'ok');
  } else {
    showToast('Invalid — shares and price must be positive numbers', 'err');
  }
}

function renderPortfolioHoldings() {
  var el    = document.getElementById('port-holdings');
  var empty = document.getElementById('port-empty');
  if (!el) return;

  if (!PORTFOLIO.holdings.length) {
    if (empty) empty.style.display = 'flex';
    el.innerHTML = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  updatePortfolioPrices({});

  var cs = getPortfolioCurrencySymbol(); /* display base currency symbol */

  el.innerHTML = PORTFOLIO.holdings.map(function(h) {
    var risk    = getHoldingRisk(h.sym);
    var stock   = STOCKS && STOCKS[h.sym];
    var action  = stock ? (stock.action || 'HOLD').toLowerCase() : 'hold';
    var pnl     = h.pnl || 0;
    var pnlPct  = h.pnlPct || 0;
    var isUp    = pnl >= 0;
    var cv      = h.currentValue || (h.avgCost * h.shares);
    var actIcon = { buy:'fa-arrow-up', hold:'fa-minus', watch:'fa-eye', avoid:'fa-ban' };
    var nativeSym = getCurrencySymbol(h.sym); /* native price symbol */

    /* Values converted to the user's chosen display currency */
    var cvBase  = toPortfolioBase(cv,  h.sym);
    var pnlBase = toPortfolioBase(Math.abs(pnl), h.sym);

    /* ── EDIT MODE ── */
    if (_portEditingSym === h.sym) {
      return '<div class="port-item ' + action + ' port-item-editing">' +
        '<div class="port-edit-header">' +
          '<div class="sc-ico ' + action + '-ico">' + h.sym.slice(0,3) + '</div>' +
          '<div><div class="sc-sym">' + h.sym + '</div><div class="sc-name">' + (h.name || h.sym) + '</div></div>' +
        '</div>' +
        '<div class="port-edit-fields">' +
          '<label class="port-edit-lbl">Shares</label>' +
          '<input id="pedit-shares-' + h.sym + '" class="port-edit-inp" type="number" min="0.000001" step="any" value="' + h.shares + '">' +
          '<label class="port-edit-lbl">Avg Cost (' + nativeSym + ' native)</label>' +
          '<input id="pedit-cost-' + h.sym + '" class="port-edit-inp" type="number" min="0.000001" step="any" value="' + h.avgCost.toFixed(4) + '">' +
        '</div>' +
        '<div class="port-edit-actions">' +
          '<button class="port-edit-save" onclick="saveHoldingEdit(\'' + h.sym + '\')"><i class="fas fa-check"></i> Save</button>' +
          '<button class="port-edit-cancel" onclick="cancelHoldingEdit()"><i class="fas fa-times"></i> Cancel</button>' +
        '</div>' +
      '</div>';
    }

    /* ── NORMAL VIEW ── */
    return '<div class="port-item ' + action + '">' +
      '<div class="port-item-top">' +
        '<div class="port-item-left" onclick="openStockDetail(\'' + h.sym + '\')">' +
          '<div class="sc-ico ' + action + '-ico">' + h.sym.slice(0,3) + '</div>' +
          '<div>' +
            '<div class="sc-sym">' + h.sym + '</div>' +
            '<div class="sc-name">' + (h.name || h.sym) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="port-item-right">' +
          '<div class="sc-price">' + nativeSym + fmtNum(h.currentPrice || h.avgCost, 2) + '</div>' +
          '<div class="sc-chg ' + (isUp ? 'up' : 'dn') + '">' + (isUp ? '+' : '') + pnlPct.toFixed(2) + '%</div>' +
        '</div>' +
      '</div>' +
      '<div class="port-stats-row">' +
        '<div class="port-stat"><span class="port-sl">Shares</span><span class="port-sv">' + h.shares + '</span></div>' +
        '<div class="port-stat"><span class="port-sl">Avg Cost</span><span class="port-sv">' + nativeSym + h.avgCost.toFixed(2) + '</span></div>' +
        '<div class="port-stat"><span class="port-sl">Mkt Value (' + PORTFOLIO_CURRENCY + ')</span><span class="port-sv">' + cs + fmtNum(cvBase, 2) + '</span></div>' +
        '<div class="port-stat"><span class="port-sl">P&L (' + PORTFOLIO_CURRENCY + ')</span><span class="port-sv ' + (isUp?'up':'dn') + '">' + (isUp?'+':'') + cs + fmtNum(pnlBase, 2) + '</span></div>' +
      '</div>' +
      '<div class="port-risk-row">' +
        '<span class="port-risk-lbl"><i class="fas fa-globe"></i> Geo-Risk</span>' +
        '<div class="port-risk-bar"><div class="port-risk-fill" style="width:' + risk.score + '%;background:var(--' + risk.color + ')"></div></div>' +
        '<span class="port-risk-val" style="color:var(--' + risk.color + ')">' + risk.label + '</span>' +
      '</div>' +
      (stock ? '<span class="pill ' + action + '"><i class="fas ' + (actIcon[action] || 'fa-minus') + '"></i> AI: ' + (stock.action || 'HOLD') + '</span>' : '') +
      '<div class="port-action-btns">' +
        '<button class="port-edit-btn" onclick="editHolding(\'' + h.sym + '\')" title="Edit holding"><i class="fas fa-pencil-alt"></i> Edit</button>' +
        '<button class="port-remove-btn" onclick="removeHoldingAndRender(\'' + h.sym + '\')" title="Delete holding"><i class="fas fa-trash-alt"></i></button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderPortfolioAlerts() {
  var el = document.getElementById('port-alerts-list');
  if (!el) return;

  var alerts = generatePortfolioAlerts();

  if (!alerts.length) {
    el.innerHTML = '<div class="empty"><i class="fas fa-shield-alt"></i><h3>Portfolio Clear</h3><p>No macro alerts for your current holdings. Stay alert — the AI monitors continuously.</p></div>';
    return;
  }

  el.innerHTML = alerts.map(function(a) {
    var stockTags = (a.stocks || []).map(function(s) {
      return '<span class="nc-stock">' + s + '</span>';
    }).join('');
    return '<div class="alert-item">' +
      '<div class="al-ico ' + a.type + '"><i class="fas ' + a.icon + '"></i></div>' +
      '<div class="al-body">' +
        '<div class="al-title">' + a.title + '</div>' +
        '<div class="al-desc">' + a.desc + '</div>' +
        (stockTags ? '<div class="nc-stocks" style="margin-top:6px">' + stockTags + '</div>' : '') +
        '<div class="al-when">' + a.when + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* ════════════════════════════════════════
   IMAGE UPLOAD — OCR PIPELINE
════════════════════════════════════════ */
function handlePortfolioImageUpload(input) {
  var file = input.files && input.files[0];
  if (!file) return;

  var preview = document.getElementById('port-img-preview');
  var status  = document.getElementById('port-ocr-status');
  var ocrBtn  = document.getElementById('port-ocr-btn');

  var reader = new FileReader();
  reader.onload = function(e) {
    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    if (status)  status.innerHTML = '<i class="fas fa-check-circle" style="color:var(--green)"></i> Image loaded. Click <strong>Extract Holdings</strong> to run AI scan, or enter manually below.';
    if (ocrBtn)  ocrBtn.style.display = 'inline-flex';
  };
  reader.readAsDataURL(file);
}

function attemptOCR() {
  var preview = document.getElementById('port-img-preview');
  var status  = document.getElementById('port-ocr-status');

  if (!preview || !preview.src || preview.style.display === 'none') {
    showToast('Upload an image first', 'info'); return;
  }
  if (status) status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading OCR engine...';

  if (typeof Tesseract === 'undefined') {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload  = function() { runOCR(preview, status); };
    s.onerror = function() {
      if (status) status.innerHTML = '<i class="fas fa-times-circle" style="color:var(--red)"></i> OCR engine failed to load. Please enter holdings manually below.';
    };
    document.head.appendChild(s);
  } else {
    runOCR(preview, status);
  }
}

function runOCR(imgEl, statusEl) {
  if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning image for stock symbols and prices...';

  Tesseract.recognize(imgEl.src, 'eng', {
    logger: function(m) {
      if (m.status === 'recognizing text' && statusEl) {
        statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> OCR: ' + Math.round(m.progress * 100) + '% complete...';
      }
    }
  }).then(function(result) {
    parseOCRText(result.data.text, statusEl);
  }).catch(function() {
    if (statusEl) statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:var(--red)"></i> OCR failed — please enter holdings manually below.';
  });
}

function parseOCRText(text, statusEl) {
  var lines    = text.split('\n').filter(function(l) { return l.trim(); });
  var found    = [];
  var knownSyms = Object.keys(STOCKS || {});
  var textarea = document.getElementById('port-ocr-result');

  lines.forEach(function(line) {
    var upper = line.toUpperCase();
    knownSyms.forEach(function(sym) {
      if (upper.indexOf(sym) !== -1 && found.findIndex(function(f) { return f.sym === sym; }) === -1) {
        var nums = line.match(/\d+\.?\d*/g) || [];
        if (nums.length >= 2) {
          found.push({ sym: sym, shares: parseFloat(nums[0]), price: parseFloat(nums[1]) });
        }
      }
    });
  });

  if (found.length) {
    if (textarea) textarea.value = found.map(function(f) { return f.sym + ',' + f.shares + ',' + f.price; }).join('\n');
    if (statusEl) statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:var(--green)"></i> Found <strong>' + found.length + ' holdings</strong>! Review the text below, then click Import.';
    showToast('Found ' + found.length + ' holdings from image', 'ok');
  } else {
    if (statusEl) statusEl.innerHTML = '<i class="fas fa-info-circle" style="color:var(--yellow)"></i> Could not auto-detect holdings. Please enter manually: <strong>SYMBOL, SHARES, AVG_PRICE</strong> (one per line).';
    showToast('Enter holdings manually', 'info');
  }
}

/* ════════════════════════════════════════
   IMPORT FROM TEXT
════════════════════════════════════════ */
function importHoldingsFromText() {
  var textarea = document.getElementById('port-ocr-result');
  if (!textarea || !textarea.value.trim()) { showToast('Enter holdings data first', 'info'); return; }

  var lines = textarea.value.trim().split('\n');
  var added = 0, failed = 0;

  lines.forEach(function(line) {
    line = line.trim();
    if (!line || line.charAt(0) === '#') return;
    var parts = line.split(/[,\s\t]+/);
    if (parts.length >= 3) {
      if (addHolding(parts[0], parts[1], parts[2])) added++;
      else failed++;
    }
  });

  if (added > 0) {
    textarea.value = '';
    renderPortfolio();
    showToast('Imported ' + added + ' holding' + (added > 1 ? 's' : '') + '!', 'ok');
    switchPortfolioTab('holdings');
  } else {
    showToast('Import failed — use: SYMBOL, SHARES, AVG_PRICE', 'err');
  }
}

/* ════════════════════════════════════════
   MANUAL ENTRY FORM
════════════════════════════════════════ */
function addSingleHolding() {
  var sym    = (document.getElementById('ph-sym')    || {}).value || '';
  var shares = (document.getElementById('ph-shares') || {}).value || '';
  var cost   = (document.getElementById('ph-cost')   || {}).value || '';

  if (!sym || !shares || !cost) { showToast('Fill in symbol, shares, and price', 'info'); return; }

  var upperSym = sym.toUpperCase();
  if (addHolding(upperSym, shares, cost)) {
    document.getElementById('ph-sym').value    = '';
    document.getElementById('ph-shares').value = '';
    document.getElementById('ph-cost').value   = '';
    renderPortfolio();
    showToast('Added ' + upperSym + ' to portfolio — fetching live price…', 'ok');
    switchPortfolioTab('holdings');
    /* Immediately fetch live price for the newly added stock */
    try {
      fetchStockPrices([upperSym]).then(function(prices) {
        if (prices && prices[upperSym]) {
          updatePortfolioPrices(prices);
          renderPortfolioSummary();
          renderPortfolioHoldings();
          showToast(upperSym + ' live price: ' + (typeof getCurrencySymbol === 'function' ? getCurrencySymbol(upperSym) : '$') + prices[upperSym].price.toFixed(2), 'ok');
        }
      });
    } catch(e) {}
  } else {
    showToast('Invalid — check symbol, shares & price', 'err');
  }
}

/* ════════════════════════════════════════
   PORTFOLIO TAB SWITCHER
════════════════════════════════════════ */
function switchPortfolioTab(tab) {
  document.querySelectorAll('.port-tab-btn').forEach(function(b)   { b.classList.remove('on'); });
  document.querySelectorAll('.port-tab-panel').forEach(function(p) { p.classList.remove('on'); });
  var btn   = document.querySelector('.port-tab-btn[data-tab="' + tab + '"]');
  var panel = document.getElementById('port-tab-' + tab);
  if (btn)   btn.classList.add('on');
  if (panel) panel.classList.add('on');
}

/* ── Helper: format number ── */
function fmtNum(n, dec) {
  return (n || 0).toLocaleString('en', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
