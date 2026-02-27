/* ══════════════════════════════════════════════════════════════
   StockSense AI — Analysis & Recommendation Engine
   Combines macro analysis, political events, technical signals
   and fundamental data to generate actionable stock picks.
   ══════════════════════════════════════════════════════════════ */

const ANALYSIS = {

  /* ─────────────────────────────────────────
     CURATED STOCK UNIVERSE
     Each stock has fundamentals, sector tags,
     political sensitivity and Trading 212 info
  ───────────────────────────────────────────*/
  stocks: {

    /* ── TECHNOLOGY ── */
    NVDA: {
      name: 'NVIDIA Corp', sector: 'Technology', sub: 'Semiconductors',
      t212: true, exchange: 'NASDAQ',
      thesis: {
        short: 'AI GPU demand remains explosive. Data center revenue growing 100%+ YoY. Every major cloud provider is a key customer.',
        long: 'Dominant AI infrastructure play for the decade. CUDA moat is near-unbreakable. Expanding into automotive, robotics, and sovereign AI.',
        risk: 'Valuation stretched. China export restrictions could dent 20% of revenue. AMD competition growing.'
      },
      signals: { momentum: 85, fundamental: 78, political: 70, sentiment: 90 },
      target12m: '+35%', targetLong: '+180%',
      catalysts: ['AI spending acceleration', 'Blackwell GPU ramp', 'Sovereign AI demand'],
      risks: ['China tariffs', 'Valuation multiple compression', 'Supply constraints'],
      pe: 35, growth: '120% YoY revenue', riskLevel: 'medium',
      politicalSensitivity: { tariffs: -1, defenseSpend: +0.5, aiRegulation: -0.5, greenEnergy: 0 }
    },

    MSFT: {
      name: 'Microsoft Corp', sector: 'Technology', sub: 'Cloud & Software',
      t212: true, exchange: 'NASDAQ',
      thesis: {
        short: 'Azure AI services growing 45%+. Copilot monetisation beginning. Strong free cash flow.',
        long: 'Dominant enterprise cloud + AI platform. Office, Teams, Azure, and OpenAI partnership create unmatched moat. Consistent 15%+ earnings growth.',
        risk: 'Antitrust scrutiny on AI deals. High capex for AI data centers. Slowing PC market.'
      },
      signals: { momentum: 72, fundamental: 88, political: 75, sentiment: 80 },
      target12m: '+22%', targetLong: '+95%',
      catalysts: ['Azure AI growth', 'Copilot enterprise adoption', 'Activision integration'],
      risks: ['Antitrust', 'Capex pressure', 'Competition from Google'],
      pe: 32, growth: '16% YoY revenue', riskLevel: 'low',
      politicalSensitivity: { tariffs: -0.3, defenseSpend: +0.4, aiRegulation: -1, greenEnergy: 0 }
    },

    AAPL: {
      name: 'Apple Inc', sector: 'Technology', sub: 'Consumer Tech',
      t212: true, exchange: 'NASDAQ',
      thesis: {
        short: 'iPhone 16 AI features driving upgrade cycle. Services revenue growing 15%+. Buybacks supporting EPS.',
        long: 'Unmatched ecosystem lock-in. Services margin expansion. Apple Intelligence could unlock new monetisation. $180bn+ annual buybacks.',
        risk: 'China revenue 18% of total — tariff risk is severe. iPhone saturation in developed markets.'
      },
      signals: { momentum: 62, fundamental: 75, political: 45, sentiment: 68 },
      target12m: '+12%', targetLong: '+55%',
      catalysts: ['AI features upgrade cycle', 'India expansion', 'Services growth'],
      risks: ['China tariffs and ban risk', 'Regulatory fines in EU', 'Innovation slowdown'],
      pe: 28, growth: '4% YoY revenue', riskLevel: 'medium',
      politicalSensitivity: { tariffs: -2, defenseSpend: 0, aiRegulation: -0.5, greenEnergy: 0 }
    },

    GOOGL: {
      name: 'Alphabet Inc', sector: 'Technology', sub: 'AI & Search',
      t212: true, exchange: 'NASDAQ',
      thesis: {
        short: 'Gemini AI integration reviving search. YouTube ad revenue robust. Cloud growing 30%+.',
        long: 'Undervalued vs peers on cloud+AI potential. Waymo autonomous vehicle option. YouTube dominates video. Search still monopoly.',
        risk: 'DOJ antitrust case could force structural changes. AI overviews reducing search click-through rates.'
      },
      signals: { momentum: 70, fundamental: 82, political: 55, sentiment: 72 },
      target12m: '+25%', targetLong: '+110%',
      catalysts: ['Gemini AI monetisation', 'Cloud inflection', 'YouTube Premium growth'],
      risks: ['DOJ antitrust breakup', 'Search disruption by AI', 'Regulatory fines in EU'],
      pe: 22, growth: '13% YoY revenue', riskLevel: 'medium',
      politicalSensitivity: { tariffs: -0.2, defenseSpend: +0.3, aiRegulation: -1.5, greenEnergy: 0 }
    },

    META: {
      name: 'Meta Platforms', sector: 'Technology', sub: 'Social Media & AI',
      t212: true, exchange: 'NASDAQ',
      thesis: {
        short: 'Ad revenue and engagement at all-time highs. Llama AI reducing costs. Reels monetisation excelling.',
        long: 'Dominant global social media. AI-powered ad targeting improving ROI. Threads growing. AR/VR long-term optionality.',
        risk: 'Regulatory fragmentation globally. Teen usage restrictions in EU/US. High Reality Labs losses.'
      },
      signals: { momentum: 78, fundamental: 80, political: 50, sentiment: 82 },
      target12m: '+28%', targetLong: '+90%',
      catalysts: ['AI advertising efficiency', 'Llama 4 launch', 'WhatsApp monetisation'],
      risks: ['EU Digital Markets Act', 'US teen safety regulation', 'Reality Labs burn rate'],
      pe: 25, growth: '19% YoY revenue', riskLevel: 'medium',
      politicalSensitivity: { tariffs: 0, defenseSpend: 0, aiRegulation: -1, greenEnergy: 0 }
    },

    TSLA: {
      name: 'Tesla Inc', sector: 'Technology', sub: 'EV & Energy',
      t212: true, exchange: 'NASDAQ',
      thesis: {
        short: 'Robotaxi launch timeline is the near-term catalyst. New affordable Model coming in 2025.',
        long: 'AI + energy + robotics convergence play. FSD revenue potential enormous. Megapack energy storage scaling rapidly.',
        risk: 'Elon Musk political controversy causing brand damage. BYD competition in all key markets. Auto margins remain compressed.'
      },
      signals: { momentum: 55, fundamental: 45, political: 40, sentiment: 65 },
      target12m: '+15%', targetLong: '+120%',
      catalysts: ['Robotaxi commercial launch', 'FSD subscriptions', 'Affordable EV model'],
      risks: ['Brand damage from Musk politics', 'China/BYD competition', 'EV adoption slowdown'],
      pe: 55, growth: '-1% YoY revenue', riskLevel: 'high',
      politicalSensitivity: { tariffs: -1, defenseSpend: 0, aiRegulation: 0, greenEnergy: +1.5 }
    },

    AMD: {
      name: 'Advanced Micro Devices', sector: 'Technology', sub: 'Semiconductors',
      t212: true, exchange: 'NASDAQ',
      thesis: {
        short: 'MI300X gaining AI data center share. PC market recovery boosting CPU sales. Strong execution.',
        long: 'Best positioned alternative to NVIDIA. Instinct GPU road map aggressive. Growing server market share.',
        risk: 'NVIDIA moat is significant. Custom silicon from hyperscalers (Google TPU, Amazon Trainium).'
      },
      signals: { momentum: 68, fundamental: 70, political: 65, sentiment: 72 },
      target12m: '+30%', targetLong: '+130%',
      catalysts: ['MI350 GPU launch', 'AI PC demand', 'Data center share gains'],
      risks: ['NVIDIA dominance', 'Custom silicon competition', 'China export restrictions'],
      pe: 40, growth: '22% YoY revenue', riskLevel: 'medium',
      politicalSensitivity: { tariffs: -1.5, defenseSpend: +0.3, aiRegulation: 0, greenEnergy: 0 }
    },

    /* ── DEFENSE ── */
    LMT: {
      name: 'Lockheed Martin', sector: 'Defense', sub: 'Aerospace & Defense',
      t212: true, exchange: 'NYSE',
      thesis: {
        short: 'NATO 3% GDP target drives massive order book growth. F-35 deliveries resuming. HIMARS demand from Ukraine crisis.',
        long: 'Best-in-class defense prime. Secular tailwind from geopolitical instability. Dividend aristocrat with consistent buybacks.',
        risk: 'Government budget sequestration risk. F-35 cost overruns.'
      },
      signals: { momentum: 75, fundamental: 80, political: 95, sentiment: 78 },
      target12m: '+20%', targetLong: '+70%',
      catalysts: ['NATO spending surge', 'Ukraine/Middle East demand', 'Hypersonic weapons contracts'],
      risks: ['US defence budget cuts', 'F-35 program issues', 'Competition from RTX/NOC'],
      pe: 18, growth: '5% YoY revenue', riskLevel: 'low',
      politicalSensitivity: { tariffs: +0.2, defenseSpend: +3, aiRegulation: 0, greenEnergy: 0 }
    },

    RTX: {
      name: 'RTX Corp (Raytheon)', sector: 'Defense', sub: 'Missiles & Electronics',
      t212: true, exchange: 'NYSE',
      thesis: {
        short: 'Patriot missile system demand surging globally. Commercial aerospace recovering. Pratt & Whitney engine backlog massive.',
        long: 'Dual revenue stream: defence + commercial aviation. Air defence demand structurally higher post-Ukraine.',
        risk: 'GTF engine geared turbofan inspection costs. Supply chain constraints.'
      },
      signals: { momentum: 72, fundamental: 75, political: 90, sentiment: 74 },
      target12m: '+18%', targetLong: '+65%',
      catalysts: ['Patriot system sales', 'Commercial aerospace recovery', 'Hypersonic defence contracts'],
      risks: ['Geared turbofan engine recalls', 'Government payment delays', 'Rate cycle headwind on pension'],
      pe: 20, growth: '7% YoY revenue', riskLevel: 'low',
      politicalSensitivity: { tariffs: +0.2, defenseSpend: +2.8, aiRegulation: 0, greenEnergy: 0 }
    },

    NOC: {
      name: 'Northrop Grumman', sector: 'Defense', sub: 'Space & Cyber',
      t212: true, exchange: 'NYSE',
      thesis: {
        short: 'B-21 Raider bomber entering production. Space segment growing rapidly. Cyber contracts increasing.',
        long: 'Unique nuclear triad and space exposure. GBSD ICBM replacement is $100bn+ program.',
        risk: 'B-21 cost overruns. Space business faces competition from SpaceX.'
      },
      signals: { momentum: 70, fundamental: 76, political: 88, sentiment: 72 },
      target12m: '+15%', targetLong: '+60%',
      catalysts: ['B-21 production ramp', 'GBSD ICBM program', 'Space Force expansion'],
      risks: ['B-21 cost overruns', 'SpaceX competition in space', 'Budget uncertainty'],
      pe: 17, growth: '4% YoY revenue', riskLevel: 'low',
      politicalSensitivity: { tariffs: 0, defenseSpend: +2.5, aiRegulation: 0, greenEnergy: 0 }
    },

    /* ── ENERGY ── */
    XOM: {
      name: 'Exxon Mobil', sector: 'Energy', sub: 'Oil & Gas Major',
      t212: true, exchange: 'NYSE',
      thesis: {
        short: 'Guyana deep-water production ramp adds significant volume. Pioneer acquisition fully integrated.',
        long: 'Best-positioned major for energy transition. Carbon capture, lithium, and hydrogen investments. Dividend reliable.',
        risk: 'Oil price below $70 pressures margins. Energy transition accelerating faster than expected.'
      },
      signals: { momentum: 45, fundamental: 65, political: 50, sentiment: 48 },
      target12m: '+8%', targetLong: '+35%',
      catalysts: ['Guyana production growth', 'Permian efficiency gains', 'LNG export expansion'],
      risks: ['Oil price decline', 'OPEC+ overproduction', 'Carbon transition risk'],
      pe: 14, growth: '-2% YoY revenue', riskLevel: 'medium',
      politicalSensitivity: { tariffs: +0.3, defenseSpend: 0, aiRegulation: 0, greenEnergy: -1.5 }
    },

    /* ── FINANCIALS ── */
    JPM: {
      name: 'JPMorgan Chase', sector: 'Financials', sub: 'Banking',
      t212: true, exchange: 'NYSE',
      thesis: {
        short: 'Net interest income holding up. Investment banking fees recovering. Fortress balance sheet.',
        long: 'Best-run bank globally. Diversified revenue from retail, IB, asset management. Will benefit when rates eventually fall.',
        risk: 'Credit losses rising if recession hits. Commercial real estate exposure. Regulatory capital requirements.'
      },
      signals: { momentum: 65, fundamental: 78, political: 60, sentiment: 68 },
      target12m: '+15%', targetLong: '+55%',
      catalysts: ['M&A and IPO market recovery', 'Net interest income resilience', 'Buyback programme'],
      risks: ['Credit quality deterioration', 'Commercial real estate losses', 'Basel III capital rules'],
      pe: 13, growth: '7% YoY revenue', riskLevel: 'low',
      politicalSensitivity: { tariffs: -0.3, defenseSpend: 0, aiRegulation: 0, greenEnergy: 0 }
    },

    GS: {
      name: 'Goldman Sachs', sector: 'Financials', sub: 'Investment Banking',
      t212: true, exchange: 'NYSE',
      thesis: {
        short: 'Trading revenues strong. M&A pipeline recovering. Asset management growing.',
        long: 'Dominant in high-margin investment banking. Beneficiary of capital markets recovery. Strategic alternatives market expanding.',
        risk: 'Revenue highly cyclical. Consumer banking retreat painful. Regulatory scrutiny.'
      },
      signals: { momentum: 70, fundamental: 72, political: 55, sentiment: 68 },
      target12m: '+18%', targetLong: '+60%',
      catalysts: ['IPO market reopening', 'M&A advisory fees', 'Trading volatility revenue'],
      risks: ['Market slowdown', 'Consumer segment losses', 'Regulatory capital burden'],
      pe: 14, growth: '12% YoY revenue', riskLevel: 'medium',
      politicalSensitivity: { tariffs: -0.5, defenseSpend: 0, aiRegulation: 0, greenEnergy: 0 }
    },

    /* ── HEALTHCARE ── */
    LLY: {
      name: 'Eli Lilly', sector: 'Healthcare', sub: 'Pharmaceuticals',
      t212: true, exchange: 'NYSE',
      thesis: {
        short: 'Mounjaro and Zepbound obesity drugs dominating market. Supply constraints easing. Alzheimer drug Kisunla approved.',
        long: 'Best obesity drug pipeline. GLP-1 market could reach $150bn by 2030. Oral formulation could 10x addressable market.',
        risk: 'Valuation is very high. Medicare price negotiation risk. Competitive pipeline from competitors.'
      },
      signals: { momentum: 80, fundamental: 75, political: 65, sentiment: 85 },
      target12m: '+25%', targetLong: '+100%',
      catalysts: ['Oral GLP-1 approval', 'Obesity drug market expansion', 'Alzheimer therapy growth'],
      risks: ['Medicare price negotiation', 'NVO competition', 'Valuation premium'],
      pe: 50, growth: '45% YoY revenue', riskLevel: 'medium',
      politicalSensitivity: { tariffs: 0, defenseSpend: 0, aiRegulation: 0, greenEnergy: 0 }
    },

    NVO: {
      name: 'Novo Nordisk', sector: 'Healthcare', sub: 'Pharmaceuticals',
      t212: true, exchange: 'NYSE', note: 'ADR (NVO)',
      thesis: {
        short: 'Ozempic and Wegovy demand continues to outpace supply. CagriSema trial results positive.',
        long: 'First mover in GLP-1 with global scale. Supply chain investments to capitalise on demand. Denmark's most valuable company.',
        risk: 'LLY competition. Reimbursement challenges in key markets.'
      },
      signals: { momentum: 72, fundamental: 76, political: 60, sentiment: 78 },
      target12m: '+20%', targetLong: '+85%',
      catalysts: ['CagriSema Phase 3 data', 'US supply ramp', 'Obesity drug label expansion'],
      risks: ['Eli Lilly competition', 'Drug pricing regulation', 'Manufacturing issues'],
      pe: 28, growth: '24% YoY revenue', riskLevel: 'medium',
      politicalSensitivity: { tariffs: 0, defenseSpend: 0, aiRegulation: 0, greenEnergy: 0 }
    },

    /* ── CLEAN ENERGY ── */
    NEE: {
      name: 'NextEra Energy', sector: 'Utilities', sub: 'Clean Energy',
      t212: true, exchange: 'NYSE',
      thesis: {
        short: 'Largest wind and solar operator in the US. AI data center power demand creating massive utility growth.',
        long: 'Best positioned for energy transition. Power demand surge from AI data centers creates decade-long growth.',
        risk: 'Rate sensitive — higher rates hurt valuation. Permitting challenges for new projects.'
      },
      signals: { momentum: 60, fundamental: 72, political: 78, sentiment: 65 },
      target12m: '+18%', targetLong: '+70%',
      catalysts: ['AI data center power contracts', 'IRA tax credits', 'Renewable pipeline'],
      risks: ['Interest rate sensitivity', 'Project permitting delays', 'Hurricane damage'],
      pe: 22, growth: '8% YoY revenue', riskLevel: 'low',
      politicalSensitivity: { tariffs: 0, defenseSpend: 0, aiRegulation: 0, greenEnergy: +2 }
    },

    /* ── CONSUMER ── */
    COST: {
      name: 'Costco Wholesale', sector: 'Consumer', sub: 'Retail',
      t212: true, exchange: 'NASDAQ',
      thesis: {
        short: 'Membership fee revenue highly predictable. Consumers trading down to value. Strong traffic trends.',
        long: 'Irreplaceable value proposition. Expanding globally. E-commerce growing. Membership renewal rate >92%.',
        risk: 'Valuation premium to peers. Thin margins amplify any cost increases.'
      },
      signals: { momentum: 75, fundamental: 80, political: 70, sentiment: 80 },
      target12m: '+15%', targetLong: '+60%',
      catalysts: ['Membership fee increase', 'International expansion', 'Private label growth'],
      risks: ['Economic recession reducing discretionary', 'High valuation', 'Margin compression'],
      pe: 52, growth: '6% YoY revenue', riskLevel: 'low',
      politicalSensitivity: { tariffs: -0.5, defenseSpend: 0, aiRegulation: 0, greenEnergy: 0 }
    },

    WMT: {
      name: 'Walmart Inc', sector: 'Consumer', sub: 'Retail',
      t212: true, exchange: 'NYSE',
      thesis: {
        short: 'Gaining share as consumers trade down. Advertising revenue high-margin and growing fast. Grocery dominance.',
        long: 'Ecosystem company now — advertising, fintech, healthcare, marketplace. Underappreciated by market.',
        risk: 'Amazon competition intensifying. Import tariff impact on China-sourced goods.'
      },
      signals: { momentum: 72, fundamental: 78, political: 60, sentiment: 74 },
      target12m: '+14%', targetLong: '+55%',
      catalysts: ['Ad revenue growth', 'Flipkart India IPO', 'Sam\'s Club membership expansion'],
      risks: ['Tariff cost pass-through', 'Amazon grocery competition', 'Labour cost inflation'],
      pe: 34, growth: '5% YoY revenue', riskLevel: 'low',
      politicalSensitivity: { tariffs: -1, defenseSpend: 0, aiRegulation: 0, greenEnergy: 0 }
    },

    /* ── STOCKS TO POTENTIALLY AVOID ── */
    INTC: {
      name: 'Intel Corp', sector: 'Technology', sub: 'Semiconductors',
      t212: true, exchange: 'NASDAQ',
      thesis: {
        short: 'Foundry business losing billions. PC market share falling to AMD. No credible AI GPU.',
        long: 'Turnaround possible if 18A process node succeeds — but high execution risk and 3+ year timeline.',
        risk: 'Massive capex with uncertain returns. TSMC dominance. AMD and NVIDIA leaving Intel behind in AI.'
      },
      signals: { momentum: 25, fundamental: 30, political: 40, sentiment: 28 },
      target12m: '-15%', targetLong: '+20% (if turnaround succeeds)',
      catalysts: ['18A process success', 'Government CHIPS Act subsidies', 'New CEO strategy'],
      risks: ['Foundry losses continue', 'Market share losses accelerate', 'Dividend cut risk'],
      pe: 35, growth: '-8% YoY revenue', riskLevel: 'high',
      action: 'avoid',
      politicalSensitivity: { tariffs: -0.5, defenseSpend: +0.5, aiRegulation: 0, greenEnergy: 0 }
    },

    BABA: {
      name: 'Alibaba Group', sector: 'Technology', sub: 'E-Commerce',
      t212: true, exchange: 'NYSE', note: 'ADR',
      thesis: {
        short: 'Chinese government regulatory crackdown ongoing. US-China tensions create delisting risk.',
        long: 'Deep value if geopolitical normalisation occurs — but high political risk.',
        risk: 'US-China decoupling. Delisting risk from SEC. Chinese regulatory unpredictability. Economic slowdown in China.'
      },
      signals: { momentum: 30, fundamental: 45, political: 20, sentiment: 32 },
      target12m: '-10%', targetLong: 'Uncertain',
      risks: ['US delisting risk', 'US-China trade war escalation', 'Regulatory crackdowns', 'China economic slowdown'],
      pe: 10, growth: '5% YoY revenue', riskLevel: 'high',
      action: 'avoid',
      politicalSensitivity: { tariffs: -3, defenseSpend: 0, aiRegulation: -1, greenEnergy: 0 }
    }
  },

  /* ─────────────────────────────────────────
     MACRO POLITICAL EVENT SCORING
     Maps current geopolitical events to sector impact
  ───────────────────────────────────────────*/
  macroEvents: {
    tariffs_us_china: {
      active: true, severity: 'high',
      bullish: ['LMT', 'RTX', 'NOC', 'COST', 'WMT'],
      bearish: ['AAPL', 'TSLA', 'NVDA', 'BABA', 'NKE'],
      message: 'US-China tariff escalation: Avoid China-exposed tech. Domestic manufacturers and defence benefit.'
    },
    fed_rates_high: {
      active: true, severity: 'medium',
      bullish: ['JPM', 'GS', 'BAC'],
      bearish: ['NEE', 'VNQ', 'COST'],
      message: 'Higher-for-longer Fed rates: Financials benefit, rate-sensitive utilities/REITs under pressure.'
    },
    nato_defence_surge: {
      active: true, severity: 'high',
      bullish: ['LMT', 'RTX', 'NOC', 'GD', 'BA'],
      bearish: [],
      message: 'NATO 3% GDP defence commitment: Multi-year contract surge for all major defence primes.'
    },
    ai_boom: {
      active: true, severity: 'high',
      bullish: ['NVDA', 'MSFT', 'GOOGL', 'AMD', 'META'],
      bearish: ['INTC'],
      message: 'AI infrastructure boom continues: NVIDIA leads but broader AI supply chain benefits.'
    },
    oil_oversupply: {
      active: true, severity: 'medium',
      bullish: ['DAL', 'AAL', 'UAL'],
      bearish: ['XOM', 'CVX', 'BP', 'SLB'],
      message: 'Oil oversupply fears: Energy sector under pressure. Airlines and shipping benefit from lower fuel costs.'
    },
    obesity_drugs: {
      active: true, severity: 'medium',
      bullish: ['LLY', 'NVO'],
      bearish: ['DXCM', 'MDT'],
      message: 'GLP-1 obesity drug boom: Lilly and Novo Nordisk dominate; medical devices face demand headwind.'
    },
    green_energy_push: {
      active: true, severity: 'medium',
      bullish: ['NEE', 'PLUG', 'ENPH', 'TSLA'],
      bearish: ['XOM', 'CVX'],
      message: 'Government green energy mandates: Renewable utilities and clean energy plays benefit long-term.'
    }
  },

  /* ─────────────────────────────────────────
     GENERATE RECOMMENDATIONS
  ───────────────────────────────────────────*/
  generateRecommendations(priceData, settings) {
    const risk = settings?.riskLevel || 'medium';
    const recommendations = { short: [], long: [], avoid: [] };

    Object.entries(this.stocks).forEach(([symbol, stock]) => {
      // Calculate composite score
      const score = this._calcScore(symbol, stock, priceData, risk);
      const priceInfo = priceData?.[symbol] || {};
      const currentPrice = priceInfo.price || this._estimatePrice(symbol);
      const changePct = priceInfo.changePct || 0;

      const rec = {
        symbol, ...stock,
        score,
        price: currentPrice,
        changePct,
        action: stock.action || this._getAction(score, stock, risk),
        confidence: Math.min(95, Math.max(50, score)),
        riskWidth: { low: '25%', medium: '55%', high: '85%' }[stock.riskLevel]
      };

      if (stock.action === 'avoid' || score < 35) {
        recommendations.avoid.push(rec);
      } else if (score >= 72 || (score >= 65 && stock.signals?.political >= 80)) {
        recommendations.short.push(rec);
        if (stock.signals?.fundamental >= 72) recommendations.long.push(rec);
      } else if (score >= 60) {
        recommendations.long.push(rec);
      } else if (score < 50) {
        recommendations.avoid.push(rec);
      }
    });

    // Sort by score
    recommendations.short.sort((a, b) => b.score - a.score);
    recommendations.long.sort((a, b) => b.score - a.score);
    recommendations.avoid.sort((a, b) => a.score - b.score);

    return recommendations;
  },

  _calcScore(symbol, stock, priceData, risk) {
    const s = stock.signals;
    let score = (s.momentum * 0.25 + s.fundamental * 0.30 + s.political * 0.25 + s.sentiment * 0.20);

    // Apply macro event adjustments
    Object.values(this.macroEvents).forEach(event => {
      if (!event.active) return;
      if (event.bullish.includes(symbol)) score += event.severity === 'high' ? 8 : 4;
      if (event.bearish.includes(symbol)) score -= event.severity === 'high' ? 10 : 5;
    });

    // Risk tolerance adjustment
    if (risk === 'low' && stock.riskLevel === 'high') score -= 15;
    if (risk === 'high' && stock.riskLevel === 'low') score -= 5;

    // Price momentum adjustment if data available
    const priceInfo = priceData?.[symbol];
    if (priceInfo && priceInfo.changePct > 0) score += Math.min(5, priceInfo.changePct);
    if (priceInfo && priceInfo.changePct < -5) score -= 5;

    return Math.round(Math.max(0, Math.min(100, score)));
  },

  _getAction(score, stock, risk) {
    if (score >= 75) return 'buy';
    if (score >= 60) return 'hold';
    if (score <= 40) return 'sell';
    return 'watch';
  },

  _estimatePrice(symbol) {
    const prices = {
      NVDA: 875, MSFT: 415, AAPL: 218, GOOGL: 175, META: 595,
      TSLA: 280, AMD: 185, LMT: 510, RTX: 125, NOC: 480,
      XOM: 110, JPM: 245, GS: 540, LLY: 880, NVO: 105,
      NEE: 72, COST: 925, WMT: 95, INTC: 22, BABA: 85
    };
    return prices[symbol] || 100;
  },

  /* ─────────────────────────────────────────
     AI HEADLINE GENERATOR
  ───────────────────────────────────────────*/
  getAIHeadline(recommendations, marketData) {
    const topPick = recommendations?.short?.[0];
    const fearGreed = marketData?.sentiment?.score || 50;

    if (!topPick) return 'Scanning global markets and political events for opportunities...';

    const headlines = [
      `Top pick: ${topPick.symbol} (${topPick.action.toUpperCase()}) — ${topPick.thesis?.short?.split('.')[0]}.`,
      `Market sentiment at ${fearGreed}/100. ${fearGreed > 60 ? 'Greed suggests caution on high-valuation stocks.' : fearGreed < 40 ? 'Fear creates buying opportunity in quality names.' : 'Neutral — stick to high-conviction picks.'}`,
      `Defence sector at multi-year high on NATO spending surge. ${topPick.sector === 'Defense' ? topPick.symbol + ' leading.' : 'LMT, RTX, NOC remain strong holds.'}`,
      `AI boom continues: NVIDIA and Microsoft driving data center investment cycle. AI infrastructure remains top long-term theme.`
    ];

    return headlines[Math.floor(Date.now() / 30000) % headlines.length];
  },

  /* ─────────────────────────────────────────
     ANALYSE NEWS ITEM — map to stocks
  ───────────────────────────────────────────*/
  categoriseNews(newsItem) {
    const title = (newsItem.title || '').toLowerCase();
    const summary = (newsItem.summary || '').toLowerCase();
    const text = title + ' ' + summary;

    let category = newsItem.category || 'economic';
    let direction = newsItem.direction || 'neutral';
    let affectedStocks = newsItem.stocks || [];
    let impactDetail = newsItem.impactDetail || '';

    // Auto-categorise if not already set
    if (!newsItem.category) {
      if (/tariff|trade war|nato|sanction|geopolit|election|congress|president|government|policy/i.test(text)) category = 'political';
      else if (/fed|interest rate|inflation|gdp|unemployment|recession|cpi|pce/i.test(text)) category = 'economic';
      else if (/earn|revenue|profit|beat|miss|guidance|eps|quarter/i.test(text)) category = 'earnings';
      else if (/nvidia|microsoft|apple|google|meta|ai|chip|semiconductor|cloud/i.test(text)) category = 'tech';
      else if (/oil|opec|energy|gas|exxon|chevron|renewable|solar|wind/i.test(text)) category = 'energy';
      else if (/defense|military|nato|lockheed|raytheon|weapon|army/i.test(text)) category = 'defense';
    }

    return { ...newsItem, category, direction, affectedStocks, impactDetail };
  },

  /* ─────────────────────────────────────────
     GENERATE SMART ALERTS
  ───────────────────────────────────────────*/
  generateAlerts(recommendations, marketData) {
    const alerts = [];
    const now = Date.now();

    // Top recommendation alert
    const top = recommendations?.short?.[0];
    if (top) {
      alerts.push({
        type: 'ai', icon: 'fa-robot', cls: 'ai',
        title: `AI Pick: ${top.symbol} — ${top.action.toUpperCase()}`,
        desc: top.thesis?.short?.split('.')[0] + '. Confidence: ' + top.confidence + '%',
        time: now - 5 * 60000
      });
    }

    // Defence sector alert
    alerts.push({
      type: 'buy', icon: 'fa-arrow-up', cls: 'buy',
      title: 'Defence Sector: Strong Multi-Year Tailwind',
      desc: 'NATO 3% GDP target drives historic order books. LMT, RTX, NOC — consider adding on any dip.',
      time: now - 30 * 60000
    });

    // AI infrastructure alert
    alerts.push({
      type: 'buy', icon: 'fa-microchip', cls: 'ai',
      title: 'AI Infrastructure: Long-Term Structural Growth',
      desc: 'NVIDIA, Microsoft, AMD benefiting from unprecedented AI capex cycle. Consider long-term positions.',
      time: now - 60 * 60000
    });

    // Warning alert
    alerts.push({
      type: 'warn', icon: 'fa-exclamation-triangle', cls: 'warn',
      title: 'Warning: China Tariff Risk — Review Holdings',
      desc: 'US-China trade tensions escalating. Check your exposure to AAPL, TSLA, BABA. Consider reducing if overweight.',
      time: now - 2 * 3600000
    });

    // News alert
    alerts.push({
      type: 'news', icon: 'fa-newspaper', cls: 'news',
      title: 'Oil Prices Sliding — Airline Stocks Benefit',
      desc: 'OPEC+ considering production increase. Lower oil = lower fuel costs for airlines. Watch DAL, AAL, UAL.',
      time: now - 3 * 3600000
    });

    // Market open/close alert
    const hour = new Date().getUTCHours();
    const isUsOpen = hour >= 14 && hour < 21; // UTC
    alerts.push({
      type: 'news', icon: isUsOpen ? 'fa-bell' : 'fa-moon', cls: 'news',
      title: isUsOpen ? 'US Market Is Open' : 'US Market Closed — Pre-Market Activity',
      desc: isUsOpen
        ? 'NYSE and NASDAQ are actively trading. Real-time prices available.'
        : 'US markets closed. Pre-market trading 4am–9:30am ET. Review your positions.',
      time: now - 10 * 60000
    });

    return alerts;
  }
};
