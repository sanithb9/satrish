/* ================================================================
   StockSense AI — Curated Data
   All data is hardcoded here so the app works instantly,
   even with no network. Live API calls enhance it further.
   ================================================================ */

/* ──────────────────────────────────────────
   FALLBACK MARKET PRICES
   Shown immediately, replaced by live data
────────────────────────────────────────── */
const FALLBACK = {
  SP500:  { price: 5950,   chg: +0.42 },
  NASDAQ: { price: 19280,  chg: +0.61 },
  DOW:    { price: 44200,  chg: +0.18 },
  FTSE:   { price: 8720,   chg: -0.12 },
  GOLD:   { price: 3020,   chg: +0.85 },
  OIL:    { price: 71.20,  chg: -1.10 },
  VIX:    { price: 18.4,   chg: +3.20 },
  BTC:    { price: 87500,  chg: +2.40 }
};

/* ──────────────────────────────────────────
   SECTOR DATA
────────────────────────────────────────── */
const SECTORS = [
  { name: 'Technology',  emoji: '💻', chg: +1.2,  note: 'AI boom driving tech outperformance' },
  { name: 'Defence',     emoji: '🛡️', chg: +1.5,  note: 'NATO spending surge fuelling multi-year rally' },
  { name: 'Healthcare',  emoji: '🏥', chg: +0.9,  note: 'GLP-1 obesity drugs powering gains' },
  { name: 'Financials',  emoji: '🏦', chg: +0.4,  note: 'Higher-for-longer rates support bank margins' },
  { name: 'Industrials', emoji: '🏭', chg: +0.3,  note: 'Reshoring trend benefiting US manufacturers' },
  { name: 'Materials',   emoji: '⛏️', chg: +0.6,  note: 'Infrastructure spending supportive' },
  { name: 'Consumer',    emoji: '🛒', chg: -0.1,  note: 'Consumer confidence softening' },
  { name: 'Utilities',   emoji: '💡', chg: -0.5,  note: 'Rate sensitivity weighing on valuations' },
  { name: 'Energy',      emoji: '⚡', chg: -0.8,  note: 'OPEC+ supply concerns pressuring oil prices' }
];

/* ──────────────────────────────────────────
   STOCK DATABASE
   20 stocks with full analysis
────────────────────────────────────────── */
const STOCKS = {
  NVDA: {
    name: 'NVIDIA Corp', sector: 'Technology', exchange: 'NASDAQ',
    price: 875, chg: +2.1,
    action: 'BUY', risk: 'Medium', horizon: 'both',
    confidence: 91,
    target12m: '+35%', targetLong: '+180%', pe: 35, growth: '+120% YoY',
    thesis_short: 'AI GPU demand is exploding. Every major cloud provider (AWS, Azure, Google Cloud) is buying NVIDIA GPUs at record pace. Data centre revenue grew 200%+ last year and is still accelerating.',
    thesis_long: 'NVIDIA owns the AI compute stack: hardware + CUDA software = near-unbreakable moat. Expanding into autonomous vehicles, robotics, and sovereign AI. Decade-long structural winner.',
    why_now: 'Blackwell GPU ramp starting, data centre orders backlogged 12+ months, MSFT and META both guiding massive AI capex.',
    catalysts: ['Blackwell GPU production ramp Q1 2025', 'Sovereign AI deals (UAE, Japan, India)', 'Autonomous vehicle licensing revenue'],
    risks: ['China export restrictions (20% revenue at risk)', 'AMD MI350 competition', 'Valuation at premium (35x PE)'],
    political: { tariffs: -2, nato: 0, ai_regulation: -1, green: 0 },
    t212_search: 'NVDA'
  },
  MSFT: {
    name: 'Microsoft Corp', sector: 'Technology', exchange: 'NASDAQ',
    price: 415, chg: +0.8,
    action: 'BUY', risk: 'Low', horizon: 'both',
    confidence: 88,
    target12m: '+22%', targetLong: '+95%', pe: 32, growth: '+16% YoY',
    thesis_short: 'Azure cloud growing 45%+ driven by AI services. Copilot generating real enterprise revenue. Best-in-class free cash flow ($80bn/year).',
    thesis_long: 'Dominant in enterprise software + cloud + AI. Office, Teams, Azure, and OpenAI partnership create an impossible-to-replicate platform. Consistent 15-18% EPS growth for years.',
    why_now: '$80bn AI data centre capex plan announced, Copilot enterprise adoption accelerating, Azure AI share growing faster than AWS.',
    catalysts: ['Azure AI revenue inflection', 'Copilot enterprise adoption', 'Activision gaming synergies'],
    risks: ['EU antitrust action on AI deals', 'High data centre capex denting free cash flow', 'Google Workspace competition'],
    political: { tariffs: -0.3, nato: +0.4, ai_regulation: -1, green: 0 },
    t212_search: 'MSFT'
  },
  AAPL: {
    name: 'Apple Inc', sector: 'Technology', exchange: 'NASDAQ',
    price: 218, chg: -0.5,
    action: 'HOLD', risk: 'Medium', horizon: 'long',
    confidence: 65,
    target12m: '+8%', targetLong: '+55%', pe: 28, growth: '+4% YoY',
    thesis_short: 'iPhone 16 AI upgrade cycle is slower than hoped. Services revenue growing 15% but China revenue is under tariff threat.',
    thesis_long: 'Ecosystem lock-in is unmatched. Services margin expansion will drive EPS higher over time. $100bn+ annual buybacks support the stock.',
    why_now: 'Hold position — China tariff risk is real. Do not add aggressively until trade relations clarify.',
    catalysts: ['Apple Intelligence AI features driving upgrades', 'India market expansion', 'Services hitting $100bn run rate'],
    risks: ['US-China tariffs: China = 18% of revenue — could be cut off', 'EU DMA regulations imposing app store fines', 'iPhone market saturation in developed world'],
    political: { tariffs: -3, nato: 0, ai_regulation: -0.5, green: 0 },
    t212_search: 'AAPL'
  },
  GOOGL: {
    name: 'Alphabet / Google', sector: 'Technology', exchange: 'NASDAQ',
    price: 175, chg: +1.2,
    action: 'BUY', risk: 'Medium', horizon: 'both',
    confidence: 80,
    target12m: '+25%', targetLong: '+110%', pe: 22, growth: '+13% YoY',
    thesis_short: 'Gemini AI revitalising search. YouTube ad revenue outperforming. Google Cloud growing 30%+. Cheapest of the mega-cap tech stocks on PE.',
    thesis_long: 'Undervalued vs peers considering its AI, cloud and autonomous vehicles (Waymo) optionality. Search still a monopoly. Most attractive risk/reward in big tech.',
    why_now: 'DOJ antitrust fears priced in. Cloud inflection point happening now. PE at 22x is historically low for this quality.',
    catalysts: ['Gemini AI search monetisation', 'Google Cloud crossing $50bn run rate', 'Waymo robotaxi commercial expansion'],
    risks: ['DOJ forced breakup of search/Android', 'AI chatbots reducing search click-through', 'EU antitrust fines'],
    political: { tariffs: -0.2, nato: +0.3, ai_regulation: -1.5, green: 0 },
    t212_search: 'GOOGL'
  },
  META: {
    name: 'Meta Platforms', sector: 'Technology', exchange: 'NASDAQ',
    price: 595, chg: +1.8,
    action: 'BUY', risk: 'Medium', horizon: 'both',
    confidence: 83,
    target12m: '+28%', targetLong: '+90%', pe: 25, growth: '+19% YoY',
    thesis_short: 'Ad revenue at all-time highs. Llama AI reducing infrastructure costs. Reels and WhatsApp Business monetisation surging.',
    thesis_long: 'Controls global social graph (3.2bn daily users). AI-powered ad targeting is industry-best. WhatsApp monetisation just beginning. Strong buyback.',
    why_now: 'Year of Efficiency 2.0 — margins expanding while AI investment costs falling. Cheapest social media stock by far.',
    catalysts: ['Llama 4 launch reducing AI costs', 'WhatsApp Business monetisation in India/Brazil', 'AI ad targeting superiority'],
    risks: ['EU Digital Markets Act reducing data collection', 'US teen safety legislation', 'Reality Labs losing $15bn/year'],
    political: { tariffs: 0, nato: 0, ai_regulation: -1, green: 0 },
    t212_search: 'META'
  },
  LMT: {
    name: 'Lockheed Martin', sector: 'Defence', exchange: 'NYSE',
    price: 510, chg: +0.6,
    action: 'BUY', risk: 'Low', horizon: 'both',
    confidence: 92,
    target12m: '+20%', targetLong: '+70%', pe: 18, growth: '+5% YoY',
    thesis_short: 'NATO members racing to hit new 3% GDP defence spending target. LMT order book is at record highs. F-35 deliveries resuming. HIMARS demand from global conflicts.',
    thesis_long: 'Best-in-class defence prime with decade-long order visibility. Dividend aristocrat, consistent buybacks. Geopolitical instability is a structural tailwind.',
    why_now: 'NATO 3% GDP commitment announced. Every European country is buying F-35s, HIMARS, Patriot upgrades. Multi-year contract awards incoming.',
    catalysts: ['NATO 3% GDP spending mandate', 'F-35 global backlog exceeds 1,000 aircraft', 'Next-gen fighter (NGAD) programme', 'Poland/Germany rearmament'],
    risks: ['US defence budget sequestration', 'F-35 cost overruns and delivery delays', 'Competition from RTX/Boeing on specific programmes'],
    political: { tariffs: +0.2, nato: +3, ai_regulation: 0, green: 0 },
    t212_search: 'LMT'
  },
  RTX: {
    name: 'RTX Corp (Raytheon)', sector: 'Defence', exchange: 'NYSE',
    price: 125, chg: +0.9,
    action: 'BUY', risk: 'Low', horizon: 'both',
    confidence: 89,
    target12m: '+18%', targetLong: '+65%', pe: 20, growth: '+7% YoY',
    thesis_short: 'Patriot missile system demand is exploding globally. Commercial aviation (Pratt & Whitney engines) recovering strongly alongside defence.',
    thesis_long: 'Dual revenue stream: defence + commercial aviation is a structural advantage. Air defence demand structurally elevated post-Ukraine conflict.',
    why_now: 'Patriot systems ordered by 40+ countries. Commercial aviation recovery = engine maintenance revenue surge. GTF engine issue costs now fully provisioned.',
    catalysts: ['Patriot AD system global orders', 'Commercial aviation engine MRO recovery', 'Hypersonic defence programme wins'],
    risks: ['Geared turbofan engine inspection costs (largely resolved)', 'US government payment delays', 'Commercial aviation recession risk'],
    political: { tariffs: +0.2, nato: +2.8, ai_regulation: 0, green: 0 },
    t212_search: 'RTX'
  },
  NOC: {
    name: 'Northrop Grumman', sector: 'Defence', exchange: 'NYSE',
    price: 480, chg: +0.4,
    action: 'BUY', risk: 'Low', horizon: 'long',
    confidence: 85,
    target12m: '+15%', targetLong: '+60%', pe: 17, growth: '+4% YoY',
    thesis_short: 'B-21 Raider bomber entering production — first new US bomber in 30 years. Space and cyber segments growing rapidly.',
    thesis_long: 'Unique exposure to nuclear modernisation (GBSD ICBMs = $100bn+ programme). Space Force expansion. Cyber and electronic warfare growth.',
    why_now: 'B-21 production milestone hit. GBSD programme accelerating. Space Force budget growing 15% annually.',
    catalysts: ['B-21 Raider production ramp', 'GBSD ICBM replacement ($100bn)', 'Space Force satellite contracts'],
    risks: ['B-21 cost overruns historically', 'SpaceX disrupting government space contracts', 'Defence budget uncertainty'],
    political: { tariffs: 0, nato: +2.5, ai_regulation: 0, green: 0 },
    t212_search: 'NOC'
  },
  LLY: {
    name: 'Eli Lilly', sector: 'Healthcare', exchange: 'NYSE',
    price: 880, chg: +1.4,
    action: 'BUY', risk: 'Medium', horizon: 'both',
    confidence: 86,
    target12m: '+25%', targetLong: '+100%', pe: 50, growth: '+45% YoY',
    thesis_short: 'Mounjaro (diabetes) and Zepbound (obesity) are the fastest-growing drugs in pharmaceutical history. Supply is now catching up with demand.',
    thesis_long: 'GLP-1 obesity/diabetes market could hit $150bn by 2030. Oral formulation of tirzepatide could 10x the addressable market. Pipeline is best in class.',
    why_now: 'Supply constraints easing. New manufacturing coming online. Oral GLP-1 Phase 3 data expected. Alzheimer drug Kisunla driving additional revenue.',
    catalysts: ['Oral tirzepatide Phase 3 data (2025)', 'Obesity prevention label expansion', 'Kisunla Alzheimer\'s drug rollout', 'Manufacturing scale-up'],
    risks: ['Medicare drug price negotiation risk', 'Novo Nordisk competition (Ozempic/Wegovy)', 'Valuation premium (50x PE)'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'LLY'
  },
  NVO: {
    name: 'Novo Nordisk (ADR)', sector: 'Healthcare', exchange: 'NYSE',
    price: 105, chg: +0.7,
    action: 'BUY', risk: 'Medium', horizon: 'long',
    confidence: 82,
    target12m: '+20%', targetLong: '+85%', pe: 28, growth: '+24% YoY',
    thesis_short: 'Ozempic and Wegovy are household names. Manufacturing scale-up underway. CagriSema next-gen drug showing >20% weight loss in trials.',
    thesis_long: 'First-mover in GLP-1 with global manufacturing scale. Denmark\'s most valuable company. GLP-1 market is winner-takes-most.',
    why_now: 'CagriSema Phase 3 data beats expectations. US supply ramp reducing shortages. Strong international demand (EU, Asia) diversifying revenue.',
    catalysts: ['CagriSema approval (>20% weight loss)', 'US supply normalisation', 'Obesity label expansion for children'],
    risks: ['Eli Lilly oral pill competition', 'Drug pricing regulation in EU', 'Trial disappointments in pipeline'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'NVO'
  },
  JPM: {
    name: 'JPMorgan Chase', sector: 'Financials', exchange: 'NYSE',
    price: 245, chg: +0.5,
    action: 'BUY', risk: 'Low', horizon: 'long',
    confidence: 79,
    target12m: '+15%', targetLong: '+55%', pe: 13, growth: '+7% YoY',
    thesis_short: 'Best-run bank globally. Net interest income resilient even as rates plateau. Investment banking fees recovering as M&A market reopens.',
    thesis_long: 'Fortress balance sheet. Diversified revenue from retail banking, IB, asset management and payments. Jamie Dimon\'s leadership = consistent outperformance.',
    why_now: 'IPO and M&A market thawing. NII (net interest income) still very high. Consumer credit holding up better than feared.',
    catalysts: ['IPO/M&A market recovery', 'NII staying elevated', 'Buyback programme at $30bn/year'],
    risks: ['Commercial real estate loan losses', 'Consumer credit deterioration in recession', 'Basel III capital requirement increase'],
    political: { tariffs: -0.3, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'JPM'
  },
  NEE: {
    name: 'NextEra Energy', sector: 'Utilities', exchange: 'NYSE',
    price: 72, chg: -0.3,
    action: 'BUY', risk: 'Low', horizon: 'long',
    confidence: 76,
    target12m: '+18%', targetLong: '+70%', pe: 22, growth: '+8% YoY',
    thesis_short: 'Largest US wind and solar operator. AI data centres need massive amounts of electricity — NEE is perfectly positioned.',
    thesis_long: 'AI boom requires 10x more electricity by 2030. NEE already has the grid connections, renewable energy and contracts. IRA tax credits provide funding.',
    why_now: 'AI data centre power demand surge. Every tech company (MSFT, GOOGL, AMZN) signing long-term renewable power purchase agreements with NEE.',
    catalysts: ['AI data centre power contracts', 'IRA clean energy tax credits ($50bn+)', 'Florida Power & Light rate base growth'],
    risks: ['Interest rate sensitivity (utility stocks fall when rates rise)', 'Hurricane damage to Florida infrastructure', 'Project permitting delays'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: +2 },
    t212_search: 'NEE'
  },
  COST: {
    name: 'Costco Wholesale', sector: 'Consumer', exchange: 'NASDAQ',
    price: 925, chg: +0.4,
    action: 'HOLD', risk: 'Low', horizon: 'long',
    confidence: 74,
    target12m: '+12%', targetLong: '+55%', pe: 52, growth: '+6% YoY',
    thesis_short: 'Recession-resistant business. Consumers trading down to bulk buying. Membership renewal rate >92%. Very expensive though (52x PE).',
    thesis_long: 'Best retail model in the world. Membership fee income is recurring and predictable. Global expansion (Australia, Europe) adds growth. Own-label Kirkland brand growing.',
    why_now: 'Hold — great business but expensive. Only add on meaningful dips. Membership fee increase coming.',
    catalysts: ['Annual membership fee increase', 'International expansion (Europe, Asia)', 'Kirkland private label growth'],
    risks: ['52x PE offers little margin of safety', 'Amazon groceries competition', 'Tariff impact on imported goods'],
    political: { tariffs: -0.5, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'COST'
  },
  WMT: {
    name: 'Walmart Inc', sector: 'Consumer', exchange: 'NYSE',
    price: 95, chg: +0.6,
    action: 'BUY', risk: 'Low', horizon: 'long',
    confidence: 78,
    target12m: '+14%', targetLong: '+55%', pe: 34, growth: '+5% YoY',
    thesis_short: 'Consumers trading down to Walmart. High-margin ad business (Walmart Connect) growing 40%+. Grocery dominance protecting traffic.',
    thesis_long: 'Walmart is becoming a tech/ad/fintech company. Advertising and marketplace revenues are high-margin and growing fast. Sam\'s Club is undervalued within the whole.',
    why_now: 'Consumer under pressure = WMT gains share. Ad revenue hitting $3bn+. Flipkart India IPO optionality.',
    catalysts: ['Walmart Connect advertising revenue', 'Sam\'s Club expansion', 'Flipkart IPO value unlock'],
    risks: ['Import tariff cost pass-through to consumers', 'Amazon grocery competition in urban markets', 'Labour cost inflation'],
    political: { tariffs: -1, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'WMT'
  },
  AMD: {
    name: 'Advanced Micro Devices', sector: 'Technology', exchange: 'NASDAQ',
    price: 185, chg: +1.5,
    action: 'BUY', risk: 'Medium', horizon: 'both',
    confidence: 79,
    target12m: '+30%', targetLong: '+130%', pe: 40, growth: '+22% YoY',
    thesis_short: 'MI300X GPU gaining real AI data centre market share. PC CPU market recovery adding to growth. Best alternative to NVIDIA.',
    thesis_long: 'As hyperscalers diversify away from NVIDIA dependency, AMD is the natural alternative. Instinct GPU roadmap is aggressive and credible.',
    why_now: 'MI300X in production and selling. Microsoft and Meta both buying AMD GPUs to reduce NVIDIA dependence. PC recovery adding volume.',
    catalysts: ['MI350 GPU launch outperforming NVIDIA on some benchmarks', 'AI PC processor demand', 'Data centre share gains from hyperscalers'],
    risks: ['NVIDIA CUDA moat is very strong — hard to displace', 'Custom silicon (Google TPU, Amazon Trainium) reducing AMD opportunity', 'China export restrictions'],
    political: { tariffs: -1.5, nato: +0.3, ai_regulation: 0, green: 0 },
    t212_search: 'AMD'
  },
  GS: {
    name: 'Goldman Sachs', sector: 'Financials', exchange: 'NYSE',
    price: 540, chg: +0.7,
    action: 'BUY', risk: 'Medium', horizon: 'long',
    confidence: 74,
    target12m: '+18%', targetLong: '+60%', pe: 14, growth: '+12% YoY',
    thesis_short: 'M&A and IPO advisory fees recovering strongly. Trading revenues elevated. Asset management growing.',
    thesis_long: 'Dominant investment bank — irreplaceable in large capital markets transactions. Benefits from M&A boom when rates eventually fall.',
    why_now: 'IPO market reopening (Reddit, others). M&A backlog building. Trading desks profitable on volatility.',
    catalysts: ['IPO market reopening', 'M&A advisory fee surge', 'Private credit expansion'],
    risks: ['Revenue very cyclical — recession would hit hard', 'Consumer banking retreat was expensive', 'Regulatory capital requirements increasing'],
    political: { tariffs: -0.5, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'GS'
  },
  XOM: {
    name: 'Exxon Mobil', sector: 'Energy', exchange: 'NYSE',
    price: 110, chg: -0.8,
    action: 'HOLD', risk: 'Medium', horizon: 'long',
    confidence: 60,
    target12m: '+5%', targetLong: '+30%', pe: 14, growth: '-2% YoY',
    thesis_short: 'Oil price under pressure from OPEC+ overproduction. Guyana deep-water production growing but offset by falling oil price.',
    thesis_long: 'Best-positioned major for the transition. Guyana low-cost production, Permian efficiency, carbon capture investments. Reliable dividend.',
    why_now: 'Hold — only add if oil falls to $65 WTI (strong support). Pioneer acquisition fully integrated and adding volume.',
    catalysts: ['Guyana deep-water production growth', 'LNG export capacity expansion', 'Carbon capture at scale'],
    risks: ['Oil price falling below $65 pressure break-even', 'OPEC+ overproduction flooding market', 'Energy transition accelerating faster than expected'],
    political: { tariffs: +0.3, nato: 0, ai_regulation: 0, green: -1.5 },
    t212_search: 'XOM'
  },
  /* ── AVOID ── */
  INTC: {
    name: 'Intel Corp', sector: 'Technology', exchange: 'NASDAQ',
    price: 22, chg: -1.2,
    action: 'AVOID', risk: 'High', horizon: 'none',
    confidence: 25,
    target12m: '-15%', targetLong: 'Uncertain', pe: 35, growth: '-8% YoY',
    thesis_short: 'Foundry losing billions. No credible AI GPU product. AMD taking CPU market share. TSMC dominates advanced nodes.',
    thesis_long: 'Turnaround possible if 18A process node succeeds — but 3+ year timeline with massive execution risk and ongoing losses.',
    why_now: 'AVOID — do not buy. Multiple years of painful restructuring. Dividend already cut. Market share losses in every segment.',
    catalysts: ['18A process node success (unproven)', 'US CHIPS Act government subsidies', 'New CEO strategic clarity'],
    risks: ['Foundry losses continue ($7bn+ annually', 'AMD server/PC share gains accelerating', 'TSMC dominance at cutting edge', 'Dividend cut risk again'],
    political: { tariffs: -0.5, nato: +0.5, ai_regulation: 0, green: 0 },
    t212_search: 'INTC'
  },
  BABA: {
    name: 'Alibaba Group (ADR)', sector: 'Technology', exchange: 'NYSE',
    price: 85, chg: -0.6,
    action: 'AVOID', risk: 'High', horizon: 'none',
    confidence: 20,
    target12m: '-10%', targetLong: 'Uncertain', pe: 10, growth: '+5% YoY',
    thesis_short: 'US-China decoupling risk is existential. SEC delisting threat remains. Chinese government regulatory unpredictability. Domestic economy slowing.',
    thesis_long: 'Deep value IF geopolitical normalisation occurs — but that is not the base case right now.',
    why_now: 'AVOID — geopolitical risk too high. If US-China relations worsen, this stock could be delisted from US exchanges or banned.',
    catalysts: ['US-China trade normalisation (not expected)', 'Chinese government stimulus working'],
    risks: ['SEC forced delisting from US exchanges', 'US-China trade war escalation', 'CCP regulatory crackdown resuming', 'China economic slowdown'],
    political: { tariffs: -3, nato: 0, ai_regulation: -1, green: 0 },
    t212_search: 'BABA'
  },
  TSLA: {
    name: 'Tesla Inc', sector: 'Technology', exchange: 'NASDAQ',
    price: 280, chg: +0.3,
    action: 'WATCH', risk: 'High', horizon: 'long',
    confidence: 52,
    target12m: '+10%', targetLong: '+120%', pe: 55, growth: '-1% YoY',
    thesis_short: 'Elon Musk political controversy causing real brand damage in Europe. Auto margins compressed. BYD taking global EV share.',
    thesis_long: 'If robotaxi (Cybercab) commercial launch succeeds, Tesla becomes a transport-as-a-service company worth multiples more. FSD subscriptions and energy storage are growing.',
    why_now: 'WATCH only — too uncertain to add aggressively. Wait for robotaxi launch clarity or a major dip below $200.',
    catalysts: ['Robotaxi/Cybercab commercial launch in Austin TX', 'FSD subscription revenue scaling', 'Megapack energy storage orders'],
    risks: ['Brand damage from CEO political controversy', 'BYD EV competition in China, Europe, SE Asia', 'Auto margin compression continues', 'Overvalued at 55x PE for -1% revenue growth'],
    political: { tariffs: -1, nato: 0, ai_regulation: 0, green: +1.5 },
    t212_search: 'TSLA'
  }
};

/* ──────────────────────────────────────────
   ACTIVE MACRO / POLITICAL EVENTS
   Maps global events to stock impacts
────────────────────────────────────────── */
const MACRO_EVENTS = [
  {
    id: 'nato_defence',
    title: 'NATO 3% GDP Defence Spending Mandate',
    category: 'political',
    direction: 'bull',
    severity: 'high',
    impact: 'Bullish for all defence primes. Multi-year order book surge for LMT, RTX, NOC, GD, BA. Poland, Germany, UK all massively increasing military budgets.',
    affected_bull: ['LMT', 'RTX', 'NOC'],
    affected_bear: [],
    score_bull: +12
  },
  {
    id: 'us_china_tariffs',
    title: 'US-China Tariff Escalation — New Measures Proposed',
    category: 'political',
    direction: 'bear',
    severity: 'high',
    impact: 'Negative for China-exposed tech (AAPL, TSLA, NVDA supply chain). Positive for domestic US manufacturers and defence. BABA faces delisting risk.',
    affected_bull: ['LMT', 'RTX', 'WMT'],
    affected_bear: ['AAPL', 'TSLA', 'BABA'],
    score_bull: +5, score_bear: -10
  },
  {
    id: 'ai_boom',
    title: 'AI Infrastructure Investment Boom Continues',
    category: 'tech',
    direction: 'bull',
    severity: 'high',
    impact: 'MSFT, GOOGL, META all committing $60-80bn annual AI capex. NVIDIA is the pick-and-shovel play. AMD benefiting as hyperscalers diversify supply.',
    affected_bull: ['NVDA', 'MSFT', 'GOOGL', 'META', 'AMD'],
    affected_bear: ['INTC'],
    score_bull: +10
  },
  {
    id: 'fed_rates',
    title: 'Federal Reserve Holds Rates — Higher for Longer',
    category: 'economic',
    direction: 'neutral',
    severity: 'medium',
    impact: 'Banks (JPM, GS) benefit from sustained high NII. Rate-sensitive stocks (NEE, REITs) under pressure. Growth stocks face higher discount rates.',
    affected_bull: ['JPM', 'GS'],
    affected_bear: ['NEE'],
    score_bull: +4, score_bear: -4
  },
  {
    id: 'obesity_drugs',
    title: 'GLP-1 Obesity Drug Revolution Accelerating',
    category: 'earnings',
    direction: 'bull',
    severity: 'medium',
    impact: 'LLY and NVO both printing record revenues. Oral formulation trials positive. Market could reach $150bn by 2030. Structural multi-year growth story.',
    affected_bull: ['LLY', 'NVO'],
    affected_bear: [],
    score_bull: +8
  },
  {
    id: 'oil_supply',
    title: 'OPEC+ Considers Production Increase',
    category: 'energy',
    direction: 'bear',
    severity: 'medium',
    impact: 'Oil price risk to downside. XOM, CVX under pressure near-term. Airlines (DAL, AAL) benefit from lower jet fuel costs. Transition stocks (NEE) relatively positive.',
    affected_bull: ['NEE'],
    affected_bear: ['XOM'],
    score_bull: +2, score_bear: -6
  },
  {
    id: 'green_energy',
    title: 'UK/EU Green Energy Investment Packages Announced',
    category: 'political',
    direction: 'bull',
    severity: 'low',
    impact: 'UK commits £20bn to offshore wind and grid. EU Green Deal spending accelerating. Renewable utilities and clean tech long-term beneficiaries.',
    affected_bull: ['NEE'],
    affected_bear: [],
    score_bull: +3
  }
];

/* ──────────────────────────────────────────
   CURATED NEWS ARTICLES
────────────────────────────────────────── */
const NEWS = [
  {
    id: 1,
    title: 'NATO Allies Agree to 3% GDP Defence Spending — Biggest Upgrade in Decades',
    summary: 'NATO member states committed to raising defence spending from the 2% to a new 3% GDP target at the latest summit. US, UK, Germany, and Poland are leading the spending surge, with massive procurement contracts for missiles, fighters, and air defence systems.',
    category: 'political', direction: 'bull', age_h: 2,
    impact: 'Strongest multi-year tailwind for defence stocks since 9/11. LMT, RTX, NOC are direct beneficiaries. Expect sustained order book growth for 5-10 years.',
    stocks: ['LMT', 'RTX', 'NOC']
  },
  {
    id: 2,
    title: 'NVIDIA Blackwell GPU Production Ramp Ahead of Schedule',
    summary: 'NVIDIA confirms Blackwell GPU production is ramping faster than expected, with major cloud providers (AWS, Azure, Google) pre-purchasing entire quarters of production. Data centre revenue expected to exceed $30bn this quarter.',
    category: 'earnings', direction: 'bull', age_h: 5,
    impact: 'Strong BUY confirmation for NVDA. AMD likely to see sympathy rally as AI demand benefits the whole sector. Intel falls further behind.',
    stocks: ['NVDA', 'AMD', 'INTC']
  },
  {
    id: 3,
    title: 'US Proposes New Tariffs on Chinese Tech and Semiconductor Imports',
    summary: 'The administration has proposed additional 25-30% tariffs on Chinese technology goods, semiconductors and electronic components. Apple and Tesla — both heavily dependent on Chinese manufacturing and sales — fell on the news.',
    category: 'political', direction: 'bear', age_h: 8,
    impact: 'Negative for AAPL (18% revenue from China), TSLA (Gigashanghai + China sales), BABA (delisting risk). Positive for domestic US defence and manufacturers.',
    stocks: ['AAPL', 'TSLA', 'BABA', 'LMT']
  },
  {
    id: 4,
    title: 'Federal Reserve Holds Rates Steady — Signals Cuts Require More Evidence',
    summary: 'The Fed kept rates unchanged at 5.25-5.5%, citing sticky core inflation still above 2% target. Chair Powell signalled that rate cuts will only come with clear evidence of sustained disinflation. Markets pricing only 2 cuts in 2025.',
    category: 'economic', direction: 'neutral', age_h: 12,
    impact: 'Banks (JPM, GS) benefit from higher-for-longer NII. Utilities (NEE) and REITs face headwinds. Growth stocks (unprofitable tech) under pressure from higher discount rates.',
    stocks: ['JPM', 'GS', 'NEE']
  },
  {
    id: 5,
    title: 'Eli Lilly Oral Obesity Pill Phase 3 Trial: Positive Results',
    summary: 'Lilly\'s oral tirzepatide showed 15-22% weight loss in Phase 3 trials, comparable to the injected version. An oral pill could massively expand the addressable market by reaching patients who refuse injections.',
    category: 'earnings', direction: 'bull', age_h: 16,
    impact: 'Game-changer for LLY. Oral GLP-1 pill could add $50bn+ annual revenue by 2030. NVO also benefits from expanding market awareness. Both remain strong multi-year holds.',
    stocks: ['LLY', 'NVO']
  },
  {
    id: 6,
    title: 'Microsoft Announces $80bn AI Data Centre Investment Plan',
    summary: 'Microsoft committed to $80bn in global AI data centre construction for fiscal year 2025, with over half planned for the US. Azure AI services are growing at 45%+ and the company is capacity-constrained.',
    category: 'tech', direction: 'bull', age_h: 20,
    impact: 'MSFT is in an AI arms race it is winning. Also bullish for power utilities (NEE, VST) and data centre REITs (EQIX). Confirms that AI capex cycle has years to run.',
    stocks: ['MSFT', 'NVDA', 'NEE']
  },
  {
    id: 7,
    title: 'OPEC+ Signals May Raise Production — Oil Slides 2%',
    summary: 'Several OPEC+ members are pushing to unwind voluntary production cuts as compliance among members weakens. Brent crude fell 2% on the news, pressuring energy sector stocks.',
    category: 'energy', direction: 'bear', age_h: 24,
    impact: 'Negative for oil majors XOM, CVX, BP near-term. Positive for airlines and shipping companies that benefit from lower fuel costs (DAL, AAL, FDX).',
    stocks: ['XOM']
  },
  {
    id: 8,
    title: 'Intel Reports Weak Quarter — Foundry Losses Widen',
    summary: 'Intel posted another quarter of Foundry losses exceeding $2bn, with data centre market share continuing to fall to AMD and custom chips. Management acknowledged the turnaround is taking longer than expected.',
    category: 'earnings', direction: 'bear', age_h: 30,
    impact: 'Confirms AVOID on INTC. AMD and NVDA are taking Intel\'s data centre market share permanently. Intel foundry is burning cash with no short-term fix visible.',
    stocks: ['INTC', 'AMD', 'NVDA']
  },
  {
    id: 9,
    title: 'UK Government Commits £20bn to Green Energy Infrastructure',
    summary: 'The UK Chancellor announced a £20bn green energy investment package covering offshore wind, green hydrogen and grid modernisation. Multiple long-term contracts to be awarded to renewable energy operators.',
    category: 'political', direction: 'bull', age_h: 36,
    impact: 'Positive for clean energy sector. UK-listed utilities and global renewable operators benefit. Long-term structural tailwind alongside similar EU green deal spending.',
    stocks: ['NEE']
  },
  {
    id: 10,
    title: 'Consumer Confidence Drops — Retail Spending Softens',
    summary: 'University of Michigan consumer confidence index fell to a 3-month low. Higher credit card rates and persistent inflation are squeezing disposable incomes. Discretionary retail stocks underperforming.',
    category: 'economic', direction: 'bear', age_h: 40,
    impact: 'Trade down effect benefits WMT and COST. Avoid discretionary retail (NKE, TGT, AMZN retail). JPM and GS watching consumer credit quality closely.',
    stocks: ['WMT', 'COST']
  }
];

/* ──────────────────────────────────────────
   SCORE & RECOMMEND
   Returns { short: [], long: [], avoid: [] }
────────────────────────────────────────── */
function buildRecommendations(riskLevel) {
  var risk = riskLevel || 'medium';
  var short = [], long = [], avoid = [];

  Object.keys(STOCKS).forEach(function(sym) {
    var s = STOCKS[sym];

    // Base score from hardcoded confidence
    var score = s.confidence;

    // Apply macro event adjustments
    MACRO_EVENTS.forEach(function(ev) {
      if (ev.affected_bull && ev.affected_bull.indexOf(sym) !== -1) score += (ev.score_bull || 5);
      if (ev.affected_bear && ev.affected_bear.indexOf(sym) !== -1) score += (ev.score_bear || -6);
    });

    // Risk tolerance adjustment
    if (risk === 'low' && s.risk === 'High') score -= 20;
    if (risk === 'low' && s.risk === 'Medium') score -= 5;
    if (risk === 'high' && s.risk === 'Low') score -= 3;

    score = Math.max(0, Math.min(100, Math.round(score)));

    var rec = Object.assign({}, s, { sym: sym, score: score });

    if (s.action === 'AVOID') {
      avoid.push(rec);
    } else if (s.action === 'WATCH') {
      // WATCH goes into long-term only
      long.push(rec);
    } else if (score >= 80 && s.horizon !== 'long') {
      short.push(rec);
      if (s.horizon === 'both') long.push(rec);
    } else if (score >= 65) {
      if (s.horizon === 'short' || s.horizon === 'both') short.push(rec);
      if (s.horizon === 'long' || s.horizon === 'both') long.push(rec);
    } else if (score >= 50) {
      long.push(rec);
    } else {
      avoid.push(rec);
    }
  });

  short.sort(function(a, b) { return b.score - a.score; });
  long.sort(function(a, b) { return b.score - a.score; });
  avoid.sort(function(a, b) { return a.score - b.score; });

  return { short: short, long: long, avoid: avoid };
}
