/* ================================================================
   StockSense AI — Portfolio Manager
   Simple stock tracker: add symbols you own → AI tells you
   BUY MORE / HOLD / WATCH / SELL NOW based on live analysis.
   ================================================================ */

var PORTFOLIO = {
  holdings:    [],
  alerts:      [],
  lastUpdated: null
};

/* ════════════════════════════════════════
   LOAD / SAVE
════════════════════════════════════════ */
function loadPortfolio() {
  try {
    var raw = JSON.parse(localStorage.getItem('ss_portfolio') || '[]');
    /* Migrate old format (had shares/avgCost) — just keep sym + meta */
    PORTFOLIO.holdings = raw.map(function(h) {
      return {
        sym:          h.sym,
        name:         h.name || (STOCKS && STOCKS[h.sym] && STOCKS[h.sym].name) || h.sym,
        currentPrice: h.currentPrice || 0,
        currentChg:   h.currentChg   || 0,
        addedDate:    h.addedDate    || new Date().toISOString()
      };
    }).filter(function(h) { return !!h.sym; });
  } catch(e) { PORTFOLIO.holdings = []; }
}

function savePortfolio() {
  try { localStorage.setItem('ss_portfolio', JSON.stringify(PORTFOLIO.holdings)); } catch(e) {}
}

/* ════════════════════════════════════════
   ADD / REMOVE HOLDINGS
════════════════════════════════════════ */
function addHolding(sym) {
  sym = (sym || '').toUpperCase().replace(/[^A-Z0-9.]/g, '');
  if (!sym) return false;

  var already = PORTFOLIO.holdings.some(function(h) { return h.sym === sym; });
  if (already) return 'dup';

  PORTFOLIO.holdings.push({
    sym:          sym,
    name:         (STOCKS && STOCKS[sym] && STOCKS[sym].name) || sym,
    currentPrice: (STOCKS && STOCKS[sym] && STOCKS[sym].price) || 0,
    currentChg:   (STOCKS && STOCKS[sym] && STOCKS[sym].chg)   || 0,
    addedDate:    new Date().toISOString()
  });
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

/* ════════════════════════════════════════
   PRICE UPDATES
════════════════════════════════════════ */
function updatePortfolioPrices(prices) {
  PORTFOLIO.holdings.forEach(function(h) {
    if (prices && prices[h.sym] && prices[h.sym].price > 0) {
      h.currentPrice = prices[h.sym].price;
      h.currentChg   = prices[h.sym].chg || 0;
    } else if (STOCKS && STOCKS[h.sym] && STOCKS[h.sym].price > 0) {
      h.currentPrice = STOCKS[h.sym].price;
      h.currentChg   = STOCKS[h.sym].chg || 0;
    }
  });
  PORTFOLIO.lastUpdated = new Date();
}

/* ════════════════════════════════════════
   PHD-LEVEL AI ACTION PER HOLDING
   Combines: base AI action, geopolitical
   risk score, macro events, sector cascades.
   Returns: BUY MORE / HOLD / WATCH / SELL NOW
════════════════════════════════════════ */
function getHoldingAction(sym) {
  var stock = STOCKS && STOCKS[sym];

  if (!stock) {
    return { label: 'HOLD', cls: 'hold', icon: 'fa-minus',
             reason: 'No AI analysis data available for this symbol.' };
  }

  var baseAction  = (stock.action || 'HOLD').toUpperCase();
  var risk        = getHoldingRisk(sym);

  /* Score positive / negative signals from cascades and macro events */
  var cascadeScore = 0;
  if (typeof SECTOR_CASCADES !== 'undefined') {
    SECTOR_CASCADES.forEach(function(cascade) {
      cascade.effects.forEach(function(fx) {
        if (fx.stocks.indexOf(sym) !== -1) {
          var w = fx.magnitude === 'EXTREME' ? 3 : fx.magnitude === 'HIGH' ? 2 : 1;
          cascadeScore += (fx.direction === 'positive') ? w : -w;
        }
      });
    });
  }
  var macroScore = 0;
  if (typeof MACRO_EVENTS !== 'undefined') {
    MACRO_EVENTS.forEach(function(ev) {
      if ((ev.affected_bull || []).indexOf(sym) !== -1) macroScore += 2;
      if ((ev.affected_bear || []).indexOf(sym) !== -1) macroScore -= 2;
    });
  }
  var totalSignal = cascadeScore + macroScore;

  /* ── SELL NOW ── */
  if (baseAction === 'AVOID' || (risk.score >= 75 && totalSignal < -1)) {
    return {
      label:  'SELL NOW', cls: 'avoid', icon: 'fa-hand-paper',
      reason: (stock.risks && stock.risks[0]) ||
              'Risk profile has deteriorated — consider reducing this position immediately.'
    };
  }

  /* ── BUY MORE ── */
  if ((baseAction === 'BUY' && risk.score < 65 && totalSignal >= 0) || totalSignal >= 4) {
    return {
      label:  'BUY MORE', cls: 'buy', icon: 'fa-arrow-up',
      reason: stock.why_now ||
              (stock.thesis_short ? stock.thesis_short.split('.')[0] + '.' :
               'Strong fundamentals with positive catalysts ahead.')
    };
  }

  /* ── WATCH ── */
  if (baseAction === 'WATCH' || (risk.score >= 55 && risk.score < 75) || totalSignal <= -2) {
    return {
      label:  'WATCH', cls: 'watch', icon: 'fa-eye',
      reason: 'Monitor closely — mixed signals or elevated sector uncertainty. No immediate action, but stay alert.'
    };
  }

  /* ── HOLD ── */
  return {
    label:  'HOLD', cls: 'hold', icon: 'fa-minus',
    reason: (stock.thesis_short ? stock.thesis_short.split('.')[0] + '.' :
             'Investment thesis still intact. No immediate action required.')
  };
}

/* ════════════════════════════════════════
   GEOPOLITICAL RISK SCORING
════════════════════════════════════════ */
function getHoldingRisk(sym) {
  var stock = STOCKS && STOCKS[sym];
  var score = 40, factors = [];

  if (stock) {
    if (stock.action === 'AVOID')                               { score = 90; factors.push('Avoid-rated by AI'); }
    else if (stock.action === 'WATCH')                          { score = 60; factors.push('Watch-rated — uncertainty'); }
    else if (stock.action === 'BUY' && stock.risk === 'Low')    { score = 20; factors.push('Blue-chip quality'); }
    else if (stock.action === 'BUY' && stock.risk === 'Medium') { score = 35; }

    if (stock.political) {
      if (stock.political.tariffs <= -3)        { score += 25; factors.push('High China/tariff exposure'); }
      else if (stock.political.tariffs <= -1.5) { score += 12; factors.push('Moderate tariff exposure'); }
      if (stock.political.nato >= 2)            { score -= 15; factors.push('NATO spending beneficiary'); }
    }
    if (stock.cap === 'small') { score += 10; factors.push('Small cap volatility'); }
  }

  if (typeof SECTOR_CASCADES !== 'undefined') {
    SECTOR_CASCADES.forEach(function(cascade) {
      cascade.effects.forEach(function(fx) {
        if (fx.stocks.indexOf(sym) !== -1) {
          if (fx.direction === 'positive') score = Math.max(0,   score - 8);
          if (fx.direction === 'negative') score = Math.min(100, score + 15);
        }
      });
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  var label, color;
  if      (score < 30) { label = 'Low Risk';    color = 'green';  }
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

  if (typeof MACRO_EVENTS !== 'undefined') {
    MACRO_EVENTS.forEach(function(ev) {
      var hitBull = (ev.affected_bull || []).filter(function(s) { return ownedSyms.indexOf(s) !== -1; });
      var hitBear = (ev.affected_bear || []).filter(function(s) { return ownedSyms.indexOf(s) !== -1; });
      if (hitBull.length) {
        alerts.push({ type:'buy', icon:'fa-arrow-up',
          title: ev.title + ' — POSITIVE for Your Portfolio',
          desc:  'Your holdings ' + hitBull.join(', ') + ' are direct beneficiaries. ' + ev.impact,
          stocks: hitBull, when: 'Current event' });
      }
      if (hitBear.length) {
        alerts.push({ type:'warn', icon:'fa-exclamation-triangle',
          title: ev.title + ' — REVIEW Your Holdings',
          desc:  'Your holdings ' + hitBear.join(', ') + ' face headwinds. ' + ev.impact,
          stocks: hitBear, when: 'Action may be needed' });
      }
    });
  }

  if (typeof SECTOR_CASCADES !== 'undefined') {
    SECTOR_CASCADES.forEach(function(cascade) {
      cascade.effects.forEach(function(fx) {
        var hits = fx.stocks.filter(function(s) { return ownedSyms.indexOf(s) !== -1; });
        if (!hits.length) return;
        alerts.push({
          type:  fx.direction === 'positive' ? 'ai' : 'warn',
          icon:  fx.direction === 'positive' ? 'fa-rocket' : 'fa-exclamation-triangle',
          title: 'Cascade: ' + cascade.trigger_event + ' → ' + fx.sector,
          desc:  fx.reason + ' Your holdings affected: ' + hits.join(', '),
          stocks: hits, when: 'Macro cascade — ' + (cascade.urgency || 'Ongoing')
        });
      });
    });
  }

  PORTFOLIO.alerts = alerts;
  return alerts;
}

/* ════════════════════════════════════════
   RENDER
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
    el.innerHTML = '<div class="port-empty-sum"><i class="fas fa-wallet"></i>' +
      '<p>Add your first holding below to see your AI-monitored portfolio</p></div>';
    return;
  }

  var counts = { buy: 0, hold: 0, watch: 0, avoid: 0 };
  PORTFOLIO.holdings.forEach(function(h) {
    var a = getHoldingAction(h.sym);
    counts[a.cls] = (counts[a.cls] || 0) + 1;
  });

  el.innerHTML =
    '<div class="port-ai-summary">' +
      '<div class="pas-title"><i class="fas fa-brain"></i> AI Portfolio Snapshot — ' +
        PORTFOLIO.holdings.length + ' holding' + (PORTFOLIO.holdings.length !== 1 ? 's' : '') +
      '</div>' +
      '<div class="pas-pills">' +
        (counts.buy   ? '<span class="pas-pill buy"  ><i class="fas fa-arrow-up"></i> '   + counts.buy   + ' BUY MORE</span>'  : '') +
        (counts.hold  ? '<span class="pas-pill hold" ><i class="fas fa-minus"></i> '       + counts.hold  + ' HOLD</span>'      : '') +
        (counts.watch ? '<span class="pas-pill watch"><i class="fas fa-eye"></i> '         + counts.watch + ' WATCH</span>'     : '') +
        (counts.avoid ? '<span class="pas-pill avoid"><i class="fas fa-hand-paper"></i> ' + counts.avoid + ' SELL NOW</span>'  : '') +
      '</div>' +
    '</div>';
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

  el.innerHTML = PORTFOLIO.holdings.map(function(h) {
    var ai       = getHoldingAction(h.sym);
    var risk     = getHoldingRisk(h.sym);
    var isLive   = !!(typeof _stockLivePrices !== 'undefined' && _stockLivePrices[h.sym]);
    var priceSym = typeof getCurrencySymbol === 'function' ? getCurrencySymbol(h.sym) : '$';
    var priceNum = h.currentPrice > 0
      ? priceSym + h.currentPrice.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})
      : null;
    var priceHtml = priceNum
      ? (isLive ? priceNum : '<span class="approx">' + priceNum + '</span>')
      : '<span style="color:var(--t3);font-size:11px">fetching…</span>';
    var chgHtml = (isLive && h.currentChg !== undefined && h.currentChg !== 0)
      ? '<span class="' + (h.currentChg >= 0 ? 'up' : 'dn') + '" data-chg-sym="' + h.sym + '">' +
        (h.currentChg >= 0 ? '+' : '') + h.currentChg.toFixed(2) + '%</span>'
      : '<span data-chg-sym="' + h.sym + '"></span>';

    return (
      '<div class="port-item ' + ai.cls + '">' +
        /* Top: icon + name + price */
        '<div class="port-item-top" onclick="openStockDetail(\'' + h.sym + '\')">' +
          '<div class="port-item-left">' +
            '<div class="sc-ico ' + ai.cls + '-ico">' + h.sym.slice(0, 3) + '</div>' +
            '<div>' +
              '<div class="sc-sym">' + h.sym + '</div>' +
              '<div class="sc-name">' + (h.name || h.sym) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="port-item-right">' +
            '<div class="sc-price" data-price-sym="' + h.sym + '">' + priceHtml + '</div>' +
            '<div class="port-chg">' + chgHtml + '</div>' +
          '</div>' +
        '</div>' +
        /* AI action badge */
        '<div class="port-ai-badge ' + ai.cls + '">' +
          '<span class="pab-label"><i class="fas ' + ai.icon + '"></i> ' + ai.label + '</span>' +
          '<span class="pab-reason">' + ai.reason + '</span>' +
        '</div>' +
        /* Risk row */
        '<div class="port-risk-row">' +
          '<span class="port-risk-lbl"><i class="fas fa-globe"></i> Geo-Risk</span>' +
          '<div class="port-risk-bar"><div class="port-risk-fill" style="width:' + risk.score + '%;background:var(--' + risk.color + ')"></div></div>' +
          '<span class="port-risk-val" style="color:var(--' + risk.color + ')">' + risk.label + '</span>' +
        '</div>' +
        /* Remove */
        '<div class="port-action-btns">' +
          '<button class="port-remove-btn" onclick="removeHoldingAndRender(\'' + h.sym + '\')">' +
            '<i class="fas fa-trash-alt"></i> Remove' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

function renderPortfolioAlerts() {
  var el = document.getElementById('port-alerts-list');
  if (!el) return;
  var alerts = generatePortfolioAlerts();

  if (!alerts.length) {
    el.innerHTML = '<div class="empty"><i class="fas fa-shield-alt"></i>' +
      '<h3>Portfolio Clear</h3>' +
      '<p>No macro alerts for your current holdings. The AI monitors continuously.</p></div>';
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
   ADD FORM (symbol-only, no shares/cost)
════════════════════════════════════════ */
function addSingleHolding() {
  var inp = document.getElementById('ph-sym');
  var sym = ((inp && inp.value) || '').toUpperCase().trim();
  if (!sym) { showToast('Search and select a stock first', 'info'); return; }

  var result = addHolding(sym);
  if (result === 'dup') { showToast(sym + ' is already in your portfolio', 'info'); return; }
  if (result) {
    if (inp) inp.value = '';
    var pd = document.getElementById('ph-live-price');
    if (pd) { pd.innerHTML = ''; pd.style.display = 'none'; }
    renderPortfolio();
    showToast('Added ' + sym + ' — fetching live price…', 'ok');
    switchPortfolioTab('holdings');
    try {
      fetchStockPrices([sym]).then(function(prices) {
        if (prices && prices[sym]) {
          updatePortfolioPrices(prices);
          if (typeof _stockLivePrices !== 'undefined') _stockLivePrices[sym] = true;
          renderPortfolioHoldings();
          renderPortfolioSummary();
        }
      });
    } catch(e) {}
  } else {
    showToast('Invalid symbol', 'err');
  }
}

/* ════════════════════════════════════════
   TAB SWITCHER
════════════════════════════════════════ */
function switchPortfolioTab(tab) {
  document.querySelectorAll('.port-tab-btn').forEach(function(b)   { b.classList.remove('on'); });
  document.querySelectorAll('.port-tab-panel').forEach(function(p) { p.classList.remove('on'); });
  var btn   = document.querySelector('.port-tab-btn[data-tab="' + tab + '"]');
  var panel = document.getElementById('port-tab-' + tab);
  if (btn)   btn.classList.add('on');
  if (panel) panel.classList.add('on');
}

function fmtNum(n, dec) {
  return (n || 0).toLocaleString('en', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
