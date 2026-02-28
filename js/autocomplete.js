/* ================================================================
   StockSense AI — Autocomplete & Live Stock Lookup
   Provides real-time stock symbol/name suggestions + live price fetch
   ================================================================ */

/* ── Comprehensive stock lookup table (200+ stocks) ── */
var STOCK_LOOKUP = [
  /* ── Mega Cap Tech ── */
  { sym:'AAPL',  name:'Apple Inc',                    ex:'NASDAQ' },
  { sym:'MSFT',  name:'Microsoft Corporation',         ex:'NASDAQ' },
  { sym:'NVDA',  name:'NVIDIA Corporation',            ex:'NASDAQ' },
  { sym:'GOOGL', name:'Alphabet Inc (Google) Class A', ex:'NASDAQ' },
  { sym:'GOOG',  name:'Alphabet Inc (Google) Class C', ex:'NASDAQ' },
  { sym:'META',  name:'Meta Platforms Inc',            ex:'NASDAQ' },
  { sym:'AMZN',  name:'Amazon.com Inc',                ex:'NASDAQ' },
  { sym:'TSLA',  name:'Tesla Inc',                     ex:'NASDAQ' },
  { sym:'ORCL',  name:'Oracle Corporation',            ex:'NYSE'   },
  { sym:'ADBE',  name:'Adobe Inc',                     ex:'NASDAQ' },
  { sym:'CRM',   name:'Salesforce Inc',                ex:'NYSE'   },
  { sym:'NFLX',  name:'Netflix Inc',                   ex:'NASDAQ' },
  { sym:'SPOT',  name:'Spotify Technology',            ex:'NYSE'   },
  { sym:'SNAP',  name:'Snap Inc',                      ex:'NYSE'   },
  { sym:'PINS',  name:'Pinterest Inc',                 ex:'NYSE'   },
  { sym:'UBER',  name:'Uber Technologies',             ex:'NYSE'   },
  { sym:'LYFT',  name:'Lyft Inc',                      ex:'NASDAQ' },
  { sym:'ABNB',  name:'Airbnb Inc',                    ex:'NASDAQ' },
  { sym:'DASH',  name:'DoorDash Inc',                  ex:'NYSE'   },

  /* ── Semiconductors & AI Hardware ── */
  { sym:'AMD',   name:'Advanced Micro Devices',        ex:'NASDAQ' },
  { sym:'INTC',  name:'Intel Corporation',             ex:'NASDAQ' },
  { sym:'QCOM',  name:'Qualcomm Inc',                  ex:'NASDAQ' },
  { sym:'AVGO',  name:'Broadcom Inc',                  ex:'NASDAQ' },
  { sym:'TXN',   name:'Texas Instruments',             ex:'NASDAQ' },
  { sym:'AMAT',  name:'Applied Materials',             ex:'NASDAQ' },
  { sym:'LRCX',  name:'Lam Research Corporation',      ex:'NASDAQ' },
  { sym:'KLAC',  name:'KLA Corporation',               ex:'NASDAQ' },
  { sym:'MRVL',  name:'Marvell Technology',            ex:'NASDAQ' },
  { sym:'SMCI',  name:'Super Micro Computer',          ex:'NASDAQ' },
  { sym:'ARM',   name:'ARM Holdings',                  ex:'NASDAQ' },
  { sym:'ASML',  name:'ASML Holding NV',               ex:'NASDAQ' },
  { sym:'TSM',   name:'Taiwan Semiconductor (ADR)',    ex:'NYSE'   },
  { sym:'MU',    name:'Micron Technology',             ex:'NASDAQ' },
  { sym:'ON',    name:'ON Semiconductor',              ex:'NASDAQ' },
  { sym:'WOLF',  name:'Wolfspeed Inc',                 ex:'NYSE'   },

  /* ── Defence & Aerospace ── */
  { sym:'LMT',   name:'Lockheed Martin',               ex:'NYSE'   },
  { sym:'RTX',   name:'RTX Corporation (Raytheon)',    ex:'NYSE'   },
  { sym:'NOC',   name:'Northrop Grumman',              ex:'NYSE'   },
  { sym:'GD',    name:'General Dynamics',              ex:'NYSE'   },
  { sym:'BA',    name:'Boeing Company',                ex:'NYSE'   },
  { sym:'HII',   name:'Huntington Ingalls Industries', ex:'NYSE'   },
  { sym:'LHX',   name:'L3Harris Technologies',         ex:'NYSE'   },
  { sym:'TDG',   name:'TransDigm Group',               ex:'NYSE'   },
  { sym:'HWM',   name:'Howmet Aerospace',              ex:'NYSE'   },

  /* ── Cybersecurity ── */
  { sym:'CRWD',  name:'CrowdStrike Holdings',          ex:'NASDAQ' },
  { sym:'PANW',  name:'Palo Alto Networks',            ex:'NASDAQ' },
  { sym:'ZS',    name:'Zscaler Inc',                   ex:'NASDAQ' },
  { sym:'FTNT',  name:'Fortinet Inc',                  ex:'NASDAQ' },
  { sym:'S',     name:'SentinelOne Inc',               ex:'NYSE'   },
  { sym:'CYBR',  name:'CyberArk Software',             ex:'NASDAQ' },
  { sym:'NET',   name:'Cloudflare Inc',                ex:'NYSE'   },

  /* ── AI & Data ── */
  { sym:'PLTR',  name:'Palantir Technologies',         ex:'NYSE'   },
  { sym:'AI',    name:'C3.ai Inc',                     ex:'NYSE'   },
  { sym:'SNOW',  name:'Snowflake Inc',                 ex:'NYSE'   },
  { sym:'MDB',   name:'MongoDB Inc',                   ex:'NASDAQ' },
  { sym:'DDOG',  name:'Datadog Inc',                   ex:'NASDAQ' },
  { sym:'PATH',  name:'UiPath Inc',                    ex:'NYSE'   },
  { sym:'BBAI',  name:'BigBear.ai Holdings',           ex:'NYSE'   },
  { sym:'SOUN',  name:'SoundHound AI',                 ex:'NASDAQ' },

  /* ── Healthcare & Pharma ── */
  { sym:'LLY',   name:'Eli Lilly and Company',         ex:'NYSE'   },
  { sym:'NVO',   name:'Novo Nordisk A/S (ADR)',         ex:'NYSE'   },
  { sym:'JNJ',   name:'Johnson & Johnson',             ex:'NYSE'   },
  { sym:'UNH',   name:'UnitedHealth Group',            ex:'NYSE'   },
  { sym:'PFE',   name:'Pfizer Inc',                    ex:'NYSE'   },
  { sym:'ABBV',  name:'AbbVie Inc',                    ex:'NYSE'   },
  { sym:'MRK',   name:'Merck & Co Inc',                ex:'NYSE'   },
  { sym:'BMY',   name:'Bristol-Myers Squibb',          ex:'NYSE'   },
  { sym:'AMGN',  name:'Amgen Inc',                     ex:'NASDAQ' },
  { sym:'GILD',  name:'Gilead Sciences',               ex:'NASDAQ' },
  { sym:'BIIB',  name:'Biogen Inc',                    ex:'NASDAQ' },
  { sym:'VRTX',  name:'Vertex Pharmaceuticals',        ex:'NASDAQ' },
  { sym:'REGN',  name:'Regeneron Pharmaceuticals',     ex:'NASDAQ' },
  { sym:'RXRX',  name:'Recursion Pharmaceuticals',     ex:'NASDAQ' },
  { sym:'ISRG',  name:'Intuitive Surgical',            ex:'NASDAQ' },
  { sym:'MDT',   name:'Medtronic plc',                 ex:'NYSE'   },
  { sym:'ELV',   name:'Elevance Health',               ex:'NYSE'   },
  { sym:'CVS',   name:'CVS Health Corporation',        ex:'NYSE'   },

  /* ── Financials ── */
  { sym:'JPM',   name:'JPMorgan Chase & Co',           ex:'NYSE'   },
  { sym:'GS',    name:'Goldman Sachs Group',           ex:'NYSE'   },
  { sym:'MS',    name:'Morgan Stanley',                ex:'NYSE'   },
  { sym:'BAC',   name:'Bank of America',               ex:'NYSE'   },
  { sym:'WFC',   name:'Wells Fargo & Company',         ex:'NYSE'   },
  { sym:'C',     name:'Citigroup Inc',                 ex:'NYSE'   },
  { sym:'BLK',   name:'BlackRock Inc',                 ex:'NYSE'   },
  { sym:'SCHW',  name:'Charles Schwab Corporation',    ex:'NYSE'   },
  { sym:'AXP',   name:'American Express Company',      ex:'NYSE'   },
  { sym:'V',     name:'Visa Inc',                      ex:'NYSE'   },
  { sym:'MA',    name:'Mastercard Inc',                ex:'NYSE'   },
  { sym:'PYPL',  name:'PayPal Holdings',               ex:'NASDAQ' },
  { sym:'SQ',    name:'Block Inc (Square)',             ex:'NYSE'   },
  { sym:'AFRM',  name:'Affirm Holdings',               ex:'NASDAQ' },
  { sym:'COIN',  name:'Coinbase Global',               ex:'NASDAQ' },
  { sym:'NU',    name:'Nu Holdings (Nubank)',           ex:'NYSE'   },

  /* ── Energy & Utilities ── */
  { sym:'XOM',   name:'Exxon Mobil Corporation',       ex:'NYSE'   },
  { sym:'CVX',   name:'Chevron Corporation',           ex:'NYSE'   },
  { sym:'COP',   name:'ConocoPhillips',                ex:'NYSE'   },
  { sym:'SLB',   name:'SLB (Schlumberger)',             ex:'NYSE'   },
  { sym:'NEE',   name:'NextEra Energy Inc',            ex:'NYSE'   },
  { sym:'VST',   name:'Vistra Energy Corp',            ex:'NYSE'   },
  { sym:'CEG',   name:'Constellation Energy',          ex:'NASDAQ' },
  { sym:'SO',    name:'Southern Company',              ex:'NYSE'   },
  { sym:'DUK',   name:'Duke Energy Corporation',       ex:'NYSE'   },
  { sym:'AES',   name:'AES Corporation',               ex:'NYSE'   },
  { sym:'ENPH',  name:'Enphase Energy',                ex:'NASDAQ' },
  { sym:'FSLR',  name:'First Solar Inc',               ex:'NASDAQ' },
  { sym:'RUN',   name:'Sunrun Inc',                    ex:'NASDAQ' },
  { sym:'BE',    name:'Bloom Energy Corporation',      ex:'NYSE'   },

  /* ── Materials & Rare Earth ── */
  { sym:'MP',    name:'MP Materials Corp',             ex:'NYSE'   },
  { sym:'ALB',   name:'Albemarle Corporation',         ex:'NYSE'   },
  { sym:'SQM',   name:'Sociedad Quimica y Minera ADR', ex:'NYSE'   },
  { sym:'LTHM',  name:'Livent Corporation',            ex:'NYSE'   },
  { sym:'NEM',   name:'Newmont Corporation',           ex:'NYSE'   },
  { sym:'GOLD',  name:'Barrick Gold Corporation',      ex:'NYSE'   },
  { sym:'FCX',   name:'Freeport-McMoRan Inc',          ex:'NYSE'   },
  { sym:'CLF',   name:'Cleveland-Cliffs Inc',          ex:'NYSE'   },
  { sym:'VALE',  name:'Vale S.A. ADR',                 ex:'NYSE'   },
  { sym:'RIO',   name:'Rio Tinto Group ADR',           ex:'NYSE'   },

  /* ── Consumer & Retail ── */
  { sym:'WMT',   name:'Walmart Inc',                   ex:'NYSE'   },
  { sym:'COST',  name:'Costco Wholesale',              ex:'NASDAQ' },
  { sym:'TGT',   name:'Target Corporation',            ex:'NYSE'   },
  { sym:'HD',    name:'Home Depot Inc',                ex:'NYSE'   },
  { sym:'LOW',   name:'Lowe\'s Companies',             ex:'NYSE'   },
  { sym:'AMZN',  name:'Amazon.com Inc',                ex:'NASDAQ' },
  { sym:'EBAY',  name:'eBay Inc',                      ex:'NASDAQ' },
  { sym:'ETSY',  name:'Etsy Inc',                      ex:'NASDAQ' },
  { sym:'SHOP',  name:'Shopify Inc',                   ex:'NYSE'   },
  { sym:'MELI',  name:'MercadoLibre Inc',              ex:'NASDAQ' },
  { sym:'BABA',  name:'Alibaba Group ADR',             ex:'NYSE'   },
  { sym:'JD',    name:'JD.com Inc ADR',                ex:'NASDAQ' },
  { sym:'PDD',   name:'PDD Holdings (Temu/Pinduoduo)', ex:'NASDAQ' },
  { sym:'NKE',   name:'Nike Inc',                      ex:'NYSE'   },
  { sym:'SBUX',  name:'Starbucks Corporation',         ex:'NASDAQ' },
  { sym:'MCD',   name:'McDonald\'s Corporation',       ex:'NYSE'   },

  /* ── Industrials ── */
  { sym:'GE',    name:'GE Aerospace',                  ex:'NYSE'   },
  { sym:'HON',   name:'Honeywell International',       ex:'NASDAQ' },
  { sym:'CAT',   name:'Caterpillar Inc',               ex:'NYSE'   },
  { sym:'DE',    name:'Deere & Company',               ex:'NYSE'   },
  { sym:'UPS',   name:'United Parcel Service',         ex:'NYSE'   },
  { sym:'FDX',   name:'FedEx Corporation',             ex:'NYSE'   },
  { sym:'DAL',   name:'Delta Air Lines',               ex:'NYSE'   },
  { sym:'AAL',   name:'American Airlines Group',       ex:'NASDAQ' },
  { sym:'UAL',   name:'United Airlines Holdings',      ex:'NASDAQ' },

  /* ── EV & Autonomous ── */
  { sym:'RIVN',  name:'Rivian Automotive',             ex:'NASDAQ' },
  { sym:'LCID',  name:'Lucid Group Inc',               ex:'NASDAQ' },
  { sym:'NIO',   name:'NIO Inc ADR',                   ex:'NYSE'   },
  { sym:'XPEV',  name:'XPeng Inc ADR',                 ex:'NYSE'   },
  { sym:'LI',    name:'Li Auto Inc ADR',               ex:'NASDAQ' },
  { sym:'GM',    name:'General Motors Company',        ex:'NYSE'   },
  { sym:'F',     name:'Ford Motor Company',            ex:'NYSE'   },

  /* ── Biotech & AI Drug ── */
  { sym:'MRNA',  name:'Moderna Inc',                   ex:'NASDAQ' },
  { sym:'BNTX',  name:'BioNTech SE ADR',               ex:'NASDAQ' },
  { sym:'CRSP',  name:'CRISPR Therapeutics AG',        ex:'NASDAQ' },
  { sym:'EDIT',  name:'Editas Medicine',               ex:'NASDAQ' },
  { sym:'NTLA',  name:'Intellia Therapeutics',         ex:'NASDAQ' },

  /* ── Real Estate / REITs / Data Centre ── */
  { sym:'EQIX',  name:'Equinix Inc (Data Centre REIT)', ex:'NASDAQ' },
  { sym:'DLR',   name:'Digital Realty Trust',          ex:'NYSE'   },
  { sym:'AMT',   name:'American Tower Corporation',    ex:'NYSE'   },
  { sym:'CCI',   name:'Crown Castle Inc',              ex:'NYSE'   },

  /* ── Emerging Market ── */
  { sym:'GRAB',  name:'Grab Holdings (SE Asia)',       ex:'NASDAQ' },
  { sym:'SE',    name:'Sea Limited (Shopee/Garena)',   ex:'NYSE'   },
  { sym:'MELI',  name:'MercadoLibre Inc',              ex:'NASDAQ' },

  /* ── ETFs (for watchlist/portfolio) ── */
  { sym:'SPY',   name:'SPDR S&P 500 ETF',              ex:'NYSE'   },
  { sym:'QQQ',   name:'Invesco Nasdaq 100 ETF',        ex:'NASDAQ' },
  { sym:'VTI',   name:'Vanguard Total Stock Market ETF',ex:'NYSE'  },
  { sym:'IVV',   name:'iShares Core S&P 500 ETF',      ex:'NYSE'   },
  { sym:'GLD',   name:'SPDR Gold Shares ETF',          ex:'NYSE'   },
  { sym:'SLV',   name:'iShares Silver Trust ETF',      ex:'NYSE'   },
  { sym:'XLK',   name:'Technology Select Sector SPDR', ex:'NYSE'   },
  { sym:'XLF',   name:'Financial Select Sector SPDR',  ex:'NYSE'   },
  { sym:'XLE',   name:'Energy Select Sector SPDR',     ex:'NYSE'   },
  { sym:'XLV',   name:'Health Care Select Sector SPDR',ex:'NYSE'   },
  { sym:'ITA',   name:'iShares US Aerospace & Defence', ex:'CBOE'  },
  { sym:'CIBR',  name:'First Trust NASDAQ Cybersecurity',ex:'NASDAQ'},
  { sym:'LIT',   name:'Global X Lithium & Battery ETF', ex:'NYSE'  },
  { sym:'REMX',  name:'VanEck Rare Earth/Strategic Metals', ex:'NYSE'},
  { sym:'ICLN',  name:'iShares Global Clean Energy ETF',ex:'NASDAQ'},
  { sym:'NLR',   name:'VanEck Uranium+Nuclear Energy ETF',ex:'NYSE' }
];

/* De-duplicate by symbol */
(function() {
  var seen = {};
  STOCK_LOOKUP = STOCK_LOOKUP.filter(function(s) {
    if (seen[s.sym]) return false;
    seen[s.sym] = true;
    return true;
  });
})();

/* ════════════════════════════════════════
   LIVE QUOTE FETCH (Yahoo Finance)
   Returns { price, chg, name } or null
════════════════════════════════════════ */
function fetchLiveQuote(sym) {
  return fetchStockPrices([sym.toUpperCase()]).then(function(prices) {
    if (prices && prices[sym.toUpperCase()]) {
      return prices[sym.toUpperCase()];
    }
    return null;
  }).catch(function() { return null; });
}

/* ════════════════════════════════════════
   SEARCH FUNCTION
   Returns up to `limit` matching stocks
════════════════════════════════════════ */
function searchStocks(query, limit) {
  limit = limit || 8;
  if (!query || query.length < 1) return [];
  var q = query.trim().toUpperCase();

  /* First: exact symbol match */
  var exactSym = STOCK_LOOKUP.filter(function(s) { return s.sym === q; });

  /* Then: symbol starts with query */
  var startsSym = STOCK_LOOKUP.filter(function(s) {
    return s.sym !== q && s.sym.indexOf(q) === 0;
  });

  /* Then: name starts with query (case-insensitive) */
  var ql = query.trim().toLowerCase();
  var startsName = STOCK_LOOKUP.filter(function(s) {
    return s.sym.indexOf(q) !== 0 && s.name.toLowerCase().indexOf(ql) === 0;
  });

  /* Then: name contains query */
  var containsName = STOCK_LOOKUP.filter(function(s) {
    var nm = s.name.toLowerCase();
    return nm.indexOf(ql) > 0 && nm.indexOf(ql) !== 0 && s.sym.indexOf(q) === -1;
  });

  return exactSym.concat(startsSym).concat(startsName).concat(containsName).slice(0, limit);
}

/* ════════════════════════════════════════
   AUTOCOMPLETE COMPONENT
   Call initAutocomplete(config) to attach
════════════════════════════════════════ */
var _acActive = null; /* tracks which autocomplete is open */

function initAutocomplete(config) {
  /*
    config = {
      inputEl:     DOM input element to attach to,
      dropdownEl:  DOM div to render suggestions into,
      onSelect:    function(stock, livePrice) called when user picks a stock,
      minChars:    minimum chars before showing (default 1),
      showPrice:   fetch + show live price in dropdown (default true)
    }
  */
  var input      = config.inputEl;
  var dropdown   = config.dropdownEl;
  var onSelect   = config.onSelect || function() {};
  var minChars   = config.minChars || 1;
  var showPrice  = config.showPrice !== false;
  var _debounce  = null;
  var _prices    = {}; /* cache of fetched prices */
  var _results   = [];
  var _selIdx    = -1;

  function show(results) {
    _results = results;
    _selIdx  = -1;
    if (!results.length) { hide(); return; }

    dropdown.innerHTML = results.map(function(s, i) {
      var priceHtml = '';
      if (showPrice && _prices[s.sym]) {
        var p = _prices[s.sym];
        var isUp = p.chg >= 0;
        priceHtml = '<span class="ac-price">' +
          '$' + p.price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}) +
          ' <span class="' + (isUp?'ac-up':'ac-dn') + '">' + (isUp?'+':'') + p.chg.toFixed(2) + '%</span>' +
          '</span>';
      } else if (showPrice) {
        priceHtml = '<span class="ac-price ac-loading"><i class="fas fa-spinner fa-spin" style="font-size:9px"></i></span>';
      }
      return '<div class="ac-item" data-idx="' + i + '">' +
        '<div class="ac-left">' +
          '<span class="ac-sym">' + s.sym + '</span>' +
          '<span class="ac-exchange">' + s.ex + '</span>' +
        '</div>' +
        '<div class="ac-name">' + s.name + '</div>' +
        priceHtml +
      '</div>';
    }).join('');

    /* Attach click handlers */
    dropdown.querySelectorAll('.ac-item').forEach(function(el) {
      el.addEventListener('mousedown', function(e) {
        e.preventDefault(); /* prevent input blur */
        var idx = parseInt(el.dataset.idx);
        selectResult(idx);
      });
    });

    dropdown.style.display = 'block';
    _acActive = { dropdown: dropdown, hide: hide };

    /* Fetch live prices for visible results if enabled */
    if (showPrice) {
      var toFetch = results.filter(function(s) { return !_prices[s.sym]; }).map(function(s) { return s.sym; });
      if (toFetch.length) {
        fetchStockPrices(toFetch).then(function(prices) {
          if (!prices) return;
          Object.keys(prices).forEach(function(sym) { _prices[sym] = prices[sym]; });
          /* Re-render with prices */
          if (dropdown.style.display === 'block') show(_results);
        }).catch(function() {});
      }
    }
  }

  function hide() {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    _results = [];
    _selIdx  = -1;
    if (_acActive && _acActive.dropdown === dropdown) _acActive = null;
  }

  function selectResult(idx) {
    var stock = _results[idx];
    if (!stock) return;
    input.value = stock.sym;
    hide();
    var livePrice = _prices[stock.sym] || null;
    onSelect(stock, livePrice);
    /* If price not cached yet, fetch it */
    if (!livePrice) {
      fetchLiveQuote(stock.sym).then(function(p) {
        onSelect(stock, p);
      }).catch(function() {});
    }
  }

  /* Keyboard navigation */
  input.addEventListener('keydown', function(e) {
    if (dropdown.style.display === 'none') return;
    var items = dropdown.querySelectorAll('.ac-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _selIdx = Math.min(_selIdx + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _selIdx = Math.max(_selIdx - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (_selIdx >= 0) selectResult(_selIdx);
      else if (_results.length === 1) selectResult(0);
      return;
    } else if (e.key === 'Escape') {
      hide(); return;
    }
    items.forEach(function(el, i) { el.classList.toggle('ac-sel', i === _selIdx); });
    if (_selIdx >= 0 && items[_selIdx]) items[_selIdx].scrollIntoView({ block: 'nearest' });
  });

  /* Input handler with debounce */
  input.addEventListener('input', function() {
    clearTimeout(_debounce);
    var val = input.value.trim();
    if (val.length < minChars) { hide(); return; }
    _debounce = setTimeout(function() {
      var results = searchStocks(val);
      show(results);
    }, 120);
  });

  input.addEventListener('focus', function() {
    if (input.value.trim().length >= minChars) {
      var results = searchStocks(input.value.trim());
      if (results.length) show(results);
    }
  });

  input.addEventListener('blur', function() {
    /* Delay hide so mousedown on item fires first */
    setTimeout(function() { hide(); }, 180);
  });

  /* Close other dropdowns when this one opens */
  dropdown.hide = hide;
  return { hide: hide, prices: _prices };
}

/* ════════════════════════════════════════
   PORTFOLIO AUTOCOMPLETE INIT
   Attaches to the portfolio add form
════════════════════════════════════════ */
function initPortfolioAutocomplete() {
  var input    = document.getElementById('ph-sym');
  var dropdown = document.getElementById('ph-sym-dropdown');
  var priceDisp= document.getElementById('ph-live-price');
  var priceInp = document.getElementById('ph-cost');

  if (!input || !dropdown) return;

  initAutocomplete({
    inputEl:    input,
    dropdownEl: dropdown,
    showPrice:  true,
    onSelect: function(stock, livePrice) {
      input.value = stock.sym;
      /* Update live price display */
      if (priceDisp) {
        if (livePrice && livePrice.price) {
          var isUp = livePrice.chg >= 0;
          priceDisp.innerHTML =
            '<i class="fas fa-circle" style="color:var(--green);font-size:7px"></i> Live: ' +
            '<strong>$' + livePrice.price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</strong>' +
            ' <span class="' + (isUp?'up':'dn') + '">' + (isUp?'+':'') + livePrice.chg.toFixed(2) + '%</span>' +
            ' — <em style="color:var(--t3)">Enter avg price you paid below</em>';
          priceDisp.style.display = 'flex';
          /* Pre-fill avg cost with current price as default */
          if (priceInp && !priceInp.value) {
            priceInp.value = livePrice.price.toFixed(2);
          }
        } else {
          priceDisp.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:9px"></i> Fetching live price...';
          priceDisp.style.display = 'flex';
        }
      }
      /* Focus shares */
      var sharesEl = document.getElementById('ph-shares');
      if (sharesEl) sharesEl.focus();
    }
  });
}

/* ════════════════════════════════════════
   WATCHLIST AUTOCOMPLETE INIT
   Attaches to the watchlist search input
════════════════════════════════════════ */
function initWatchlistAutocomplete() {
  var input    = document.getElementById('wl-search');
  var dropdown = document.getElementById('wl-dropdown');

  if (!input || !dropdown) return;

  initAutocomplete({
    inputEl:    input,
    dropdownEl: dropdown,
    showPrice:  true,
    onSelect: function(stock, livePrice) {
      input.value = stock.sym;
      /* Auto-add to watchlist immediately */
      if (typeof addWatchlistFromAC === 'function') {
        addWatchlistFromAC(stock.sym, livePrice);
      }
    }
  });
}

/* ════════════════════════════════════════
   PORTFOLIO IMAGE — IMPROVED OCR
   Better image parsing with fallback
════════════════════════════════════════ */
function handlePortfolioImageUpload(input) {
  var file = input.files && input.files[0];
  if (!file) return;

  var preview  = document.getElementById('port-img-preview');
  var status   = document.getElementById('port-ocr-status');
  var ocrBtn   = document.getElementById('port-ocr-btn');
  var helpTxt  = document.getElementById('port-ocr-help');

  var reader = new FileReader();
  reader.onload = function(e) {
    if (preview) {
      preview.src = e.target.result;
      preview.style.display = 'block';
    }
    if (status) {
      status.innerHTML =
        '<i class="fas fa-check-circle" style="color:var(--green)"></i>&nbsp;' +
        'Image loaded. Click <strong>Extract Holdings</strong> to run AI scan.';
    }
    if (ocrBtn)  ocrBtn.style.display = 'inline-flex';
    if (helpTxt) helpTxt.style.display = 'block';
  };
  reader.onerror = function() {
    if (status) status.innerHTML = '<i class="fas fa-times-circle" style="color:var(--red)"></i>&nbsp;Failed to read image.';
  };
  reader.readAsDataURL(file);
}

function attemptOCR() {
  var preview = document.getElementById('port-img-preview');
  var status  = document.getElementById('port-ocr-status');

  if (!preview || !preview.src || preview.src === window.location.href) {
    showToast('Upload a portfolio screenshot first', 'info'); return;
  }
  if (status) status.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;Loading OCR engine (first time may take 15s)...';

  if (typeof Tesseract === 'undefined') {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload  = function() { runOCR(preview, status); };
    s.onerror = function() {
      if (status) status.innerHTML =
        '<i class="fas fa-times-circle" style="color:var(--red)"></i>&nbsp;OCR engine blocked (network). Use manual entry below.';
    };
    document.head.appendChild(s);
  } else {
    runOCR(preview, status);
  }
}

function runOCR(imgEl, statusEl) {
  if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;Scanning image for stock data...';
  Tesseract.recognize(imgEl.src, 'eng', {
    logger: function(m) {
      if (m.status === 'recognizing text' && statusEl) {
        statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;OCR ' + Math.round(m.progress * 100) + '% — reading text...';
      }
    }
  }).then(function(r) {
    parseOCRText(r.data.text, statusEl);
  }).catch(function(err) {
    console.error('OCR error:', err);
    if (statusEl) statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:var(--red)"></i>&nbsp;OCR failed. Please use the manual entry form below.';
  });
}

function parseOCRText(text, statusEl) {
  var knownSyms = STOCK_LOOKUP.map(function(s) { return s.sym; });
  var textarea  = document.getElementById('port-ocr-result');
  var found     = [];
  var seenSyms  = {};

  var lines = text.split('\n');
  lines.forEach(function(line) {
    var upper = line.toUpperCase().replace(/[^A-Z0-9.\s,$%()-]/g, ' ');
    knownSyms.forEach(function(sym) {
      /* Symbol must appear as a whole word */
      var re = new RegExp('\\b' + sym + '\\b');
      if (re.test(upper) && !seenSyms[sym]) {
        /* Extract numbers from the line */
        var nums = line.match(/[\d,]+\.?\d*/g) || [];
        nums = nums.map(function(n) { return parseFloat(n.replace(/,/g,'')); }).filter(function(n) { return !isNaN(n) && n > 0; });
        if (nums.length >= 1) {
          seenSyms[sym] = true;
          /* Heuristic: smallest number = shares, largest near $value = price */
          var shares = nums[0];
          var price  = nums.length >= 2 ? nums[nums.length - 1] : null;
          found.push({ sym: sym, shares: shares, price: price });
        }
      }
    });
  });

  if (found.length) {
    if (textarea) {
      textarea.value = found.map(function(f) {
        return f.sym + ',' + f.shares + (f.price ? ',' + f.price : '');
      }).join('\n');
    }
    if (statusEl) statusEl.innerHTML =
      '<i class="fas fa-check-circle" style="color:var(--green)"></i>&nbsp;<strong>' + found.length + ' holdings detected!</strong> Review below, then click Import.';
    showToast('Found ' + found.length + ' holdings from image', 'ok');
  } else {
    if (statusEl) statusEl.innerHTML =
      '<i class="fas fa-info-circle" style="color:var(--yellow)"></i>&nbsp;No holdings auto-detected. Please use the manual entry form or type in the text area: <em>SYMBOL, SHARES, AVG_PRICE</em>';
    showToast('No holdings detected — enter manually', 'info');
  }
}
