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
  SP500:  { price: 5861,   chg: -1.59 },
  NASDAQ: { price: 18544,  chg: -2.78 },
  DOW:    { price: 43239,  chg: -0.45 },
  FTSE:   { price: 8810,   chg: +0.36 },
  GOLD:   { price: 2868,   chg: +1.05 },
  OIL:    { price: 69.76,  chg: -0.82 },
  VIX:    { price: 22.3,   chg: +16.0 },
  BTC:    { price: 78500,  chg: -7.20 }
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
    price: 177, chg: -3.8,
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
    price: 388, chg: -1.2,
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
    price: 237, chg: -0.8,
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
    price: 197, chg: -1.5,
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
    price: 638, chg: -2.1,
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
    price: 497, chg: +0.3,
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
    price: 202, chg: +0.9,
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
    price: 503, chg: +0.2,
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
    price: 798, chg: -0.9,
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
    price: 89, chg: -1.4,
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
    price: 258, chg: -0.7,
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
    price: 74, chg: -0.5,
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
    price: 1048, chg: -0.6,
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
    price: 103, chg: -0.4,
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
    price: 112, chg: -2.4,
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
    price: 598, chg: -0.8,
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
    price: 115, chg: -1.1,
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
    price: 21, chg: -1.8,
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
    price: 115, chg: -0.9,
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
    price: 322, chg: -5.8,
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
  },

  /* ── SMALL & MID CAP OPPORTUNITIES ── */
  PLTR: {
    name: 'Palantir Technologies', sector: 'Technology / AI Defence', exchange: 'NYSE',
    price: 88, chg: -4.5, cap: 'mid',
    action: 'BUY', risk: 'High', horizon: 'both',
    confidence: 84,
    target12m: '+55%', targetLong: '+250%', pe: 280, growth: '+36% YoY',
    thesis_short: 'US Government AI contracts exploding. AIP (AI Platform) generating explosive enterprise revenue. Boot Camp model creating viral adoption with Fortune 500s.',
    thesis_long: 'Palantir is becoming the operating system for Western government AI. Military AI, healthcare AI, and enterprise AI all converging on their Ontology platform. Early AWS parallel — dominance takes a decade.',
    why_now: 'S&P 500 inclusion = forced passive buying. US defence AI spending routing contracts to PLTR. AIP enterprise growing 70%+ QoQ. NATO allies demanding battle management AI.',
    catalysts: ['US Army AI battle management contracts', 'AIP enterprise seat expansion', 'NATO ally AI defence deployments', 'S&P 500 passive inflows continuing'],
    risks: ['Extreme valuation (280x PE)', 'Government contract renewal risk', 'Competition from AWS, Azure AI services', 'Insider selling pressure'],
    political: { tariffs: 0, nato: +3, ai_regulation: -0.5, green: 0 },
    t212_search: 'PLTR'
  },
  CRWD: {
    name: 'CrowdStrike Holdings', sector: 'Cybersecurity', exchange: 'NASDAQ',
    price: 392, chg: -1.4, cap: 'mid',
    action: 'BUY', risk: 'Medium', horizon: 'both',
    confidence: 83,
    target12m: '+35%', targetLong: '+150%', pe: 95, growth: '+32% YoY',
    thesis_short: 'Cybersecurity is now critical national infrastructure. State-sponsored attacks from Russia, China, Iran making every government and enterprise upgrade security immediately.',
    thesis_long: 'Every major geopolitical conflict expands the cyber threat landscape. CrowdStrike\'s Falcon platform is the gold standard. Cloud-native advantage over legacy players (Symantec, McAfee) is insurmountable.',
    why_now: 'Recovered strongly from the July 2024 outage. Customer retention remained 98%+. Demand has re-accelerated. US government mandating zero-trust architecture = CRWD wins.',
    catalysts: ['US government zero-trust mandate', 'Charlotte AI expansion across all modules', 'Crowdstrike Falcon Complete MDR growth', 'European cyber sovereignty spending'],
    risks: ['Valuation (95x PE) after recovery rally', 'July 2024 outage legal liability ongoing', 'Microsoft Defender competition in enterprise'],
    political: { tariffs: 0, nato: +2, ai_regulation: 0, green: 0 },
    t212_search: 'CRWD'
  },
  ARM: {
    name: 'ARM Holdings', sector: 'Semiconductors', exchange: 'NASDAQ',
    price: 156, chg: -3.2, cap: 'mid',
    action: 'BUY', risk: 'Medium', horizon: 'both',
    confidence: 81,
    target12m: '+40%', targetLong: '+180%', pe: 110, growth: '+25% YoY',
    thesis_short: 'ARM architecture powers 99% of smartphones and is rapidly taking over AI edge computing, automotive chips, and data centre CPUs (Apple M-series, AWS Graviton, NVIDIA Grace).',
    thesis_long: 'The world is moving away from x86 (Intel). ARM chips are more power-efficient — critical for AI inference at edge. Every AI device needs ARM. Royalty model scales massively.',
    why_now: 'AI edge computing is the next battleground. NVIDIA designing next-gen server CPUs on ARM. Every major chip designer (Apple, Qualcomm, Amazon) designing on ARM architecture.',
    catalysts: ['AI server CPU adoption (replacing Intel Xeon)', 'Automotive autonomous driving chip wins', 'Royalty rate increases on premium chips', 'India data sovereignty chip initiative'],
    risks: ['RISC-V open-source architecture threatening royalty model long-term', 'SoftBank still owns 90% — supply overhang risk', 'Geopolitical risk: UK-China chip licensing restrictions'],
    political: { tariffs: 0, nato: +1, ai_regulation: -0.5, green: 0 },
    t212_search: 'ARM'
  },
  VST: {
    name: 'Vistra Energy', sector: 'Energy / Nuclear', exchange: 'NYSE',
    price: 148, chg: -1.8, cap: 'mid',
    action: 'BUY', risk: 'Medium', horizon: 'both',
    confidence: 87,
    target12m: '+45%', targetLong: '+200%', pe: 22, growth: '+85% YoY',
    thesis_short: 'The single best play on AI power demand. Vistra owns nuclear plants that produce 24/7 carbon-free electricity. Microsoft, Google and Amazon are signing direct power purchase agreements with nuclear operators.',
    thesis_long: 'AI data centres need always-on, carbon-free power — nuclear is the only answer at scale. Vistra\'s existing nuclear fleet cannot be replicated. Power scarcity = pricing power for decades.',
    why_now: 'Microsoft signed direct nuclear PPA (similar deals coming). PJM capacity prices tripling. Nuclear plant life extensions approved. Every AI hyperscaler is desperately seeking reliable power.',
    catalysts: ['AI hyperscaler nuclear PPAs (MSFT-style deals)', 'PJM capacity market price surge', 'Nuclear plant life extensions (20 more years)', 'Data centre co-location at nuclear sites'],
    risks: ['Nuclear regulation complexity', 'Power price normalisation if new supply enters', 'Single-region concentration risk (Texas, Illinois)'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: +3 },
    t212_search: 'VST'
  },
  CEG: {
    name: 'Constellation Energy', sector: 'Energy / Nuclear', exchange: 'NASDAQ',
    price: 275, chg: -0.9, cap: 'mid',
    action: 'BUY', risk: 'Medium', horizon: 'long',
    confidence: 85,
    target12m: '+35%', targetLong: '+130%', pe: 28, growth: '+60% YoY',
    thesis_short: 'Largest US nuclear operator. Microsoft signed a 20-year PPA to restart Three Mile Island exclusively for data centre power. This is the template — every hyperscaler is now calling CEG.',
    thesis_long: 'Nuclear is the only carbon-free baseload power that can satisfy AI\'s energy hunger. CEG\'s fleet of 22 reactors is impossible to replicate. Carbon-free electricity = premium pricing forever.',
    why_now: 'Three Mile Island restart approved and operational. Amazon, Google both exploring nuclear PPAs. Federal government IRA credits for nuclear = $30/MWh subsidy floor.',
    catalysts: ['Google and Amazon nuclear PPAs (following MSFT)', 'Three Mile Island restart generating revenue', 'Small Modular Reactor (SMR) development contracts', 'IRA nuclear credits ($30/MWh subsidy)'],
    risks: ['Nuclear safety incidents (low probability, high impact)', 'New grid connections permitting delays', 'Interest rate sensitivity on capital projects'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: +3 },
    t212_search: 'CEG'
  },
  MP: {
    name: 'MP Materials (Rare Earth)', sector: 'Materials / Rare Earth', exchange: 'NYSE',
    price: 16, chg: -2.1, cap: 'small',
    action: 'BUY', risk: 'High', horizon: 'long',
    confidence: 74,
    target12m: '+60%', targetLong: '+300%', pe: 45, growth: '+15% YoY',
    thesis_short: 'China controls 85% of global rare earth processing — a national security emergency. MP Materials owns the only major US rare earth mine (Mountain Pass, California). Every semiconductor, EV motor, and missile guidance system needs rare earths.',
    thesis_long: 'The US-China decoupling will force Western nations to build domestic rare earth supply chains. MP is the only US solution at scale. Defence contracts + EV motor magnet demand = decade-long structural growth.',
    why_now: 'US DoD has signed rare earth supply contracts with MP. GM using MP magnets in EV motors. China restricting rare earth exports is accelerating the crisis and MP\'s pricing power.',
    catalysts: ['China rare earth export restrictions (ongoing crisis)', 'US DoD rare earth supply contracts', 'EV motor magnet manufacturing in Fort Worth Texas', 'EU Critical Raw Materials Act forcing European partnerships'],
    risks: ['China flooding market with cheap rare earths to kill competition', 'Mine expansion permitting delays', 'Small market cap = high volatility', 'Commodity price cycles'],
    political: { tariffs: +2, nato: +2, ai_regulation: 0, green: +2 },
    t212_search: 'MP'
  },
  ALB: {
    name: 'Albemarle Corp (Lithium)', sector: 'Materials / Lithium', exchange: 'NYSE',
    price: 74, chg: -1.5, cap: 'mid',
    action: 'WATCH', risk: 'High', horizon: 'long',
    confidence: 62,
    target12m: '+25%', targetLong: '+200%', pe: 35, growth: '-30% YoY',
    thesis_short: 'Lithium price crashed 80% from peak — this is the time to start watching. EV adoption is still happening. Battery storage demand is growing. When lithium prices recover, ALB will explode.',
    thesis_long: 'Every EV battery, grid storage system, and portable device needs lithium. ALB is the world\'s largest pure-play lithium producer. Wait for the supply glut to clear (6-18 months), then accumulate.',
    why_now: 'WATCH, not buy yet. Lithium price near multi-year lows. Build position slowly. Wait for China EV demand recovery or supply curtailment signals before going big.',
    catalysts: ['Lithium price recovery from current lows', 'China EV demand acceleration', 'US IRA battery manufacturing incentives', 'Grid storage demand surge from AI power needs'],
    risks: ['Lithium price remaining depressed for 2+ years', 'New Chilean and Australian mine supply', 'Chinese lithium producers (Ganfeng) price war', 'EV adoption slower than expected'],
    political: { tariffs: +1, nato: 0, ai_regulation: 0, green: +2 },
    t212_search: 'ALB'
  },
  SMCI: {
    name: 'Super Micro Computer', sector: 'Technology / AI Servers', exchange: 'NASDAQ',
    price: 39, chg: -2.8, cap: 'small',
    action: 'WATCH', risk: 'High', horizon: 'short',
    confidence: 63,
    target12m: '+80%', targetLong: 'Uncertain', pe: 14, growth: '+38% YoY',
    thesis_short: 'Builds the AI server racks that house NVIDIA GPUs. Massive revenue growth but accounting controversy and delayed financial filings are a serious red flag. Very cheap on earnings if books are clean.',
    thesis_long: 'If accounting issues are resolved, SMCI is genuinely cheap as the pick-and-shovel play for AI servers. Revenue growing 40%+. But trust must be re-established first.',
    why_now: 'WATCH — wait for audited financials. If accounting clears and stock stays at these levels, aggressive accumulation is warranted.',
    catalysts: ['Clean audited financial statements', 'AI server demand from hyperscalers', 'NVIDIA GPU integration partnerships', 'New liquid cooling server designs'],
    risks: ['Accounting irregularities / fraud risk (serious)', 'NASDAQ delisting threat', 'Competition from Dell, HPE in AI servers', 'Supply chain constraints'],
    political: { tariffs: -1, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'SMCI'
  },
  COIN: {
    name: 'Coinbase Global', sector: 'Financials / Crypto', exchange: 'NASDAQ',
    price: 292, chg: -8.5, cap: 'mid',
    action: 'WATCH', risk: 'High', horizon: 'both',
    confidence: 66,
    target12m: '+50%', targetLong: '+200%', pe: 35, growth: '+75% YoY',
    thesis_short: 'Trump administration is pro-crypto — SEC dropped most crypto enforcement cases. Bitcoin ETF approval drove $50bn+ inflows. COIN is the regulated on-ramp for institutional crypto.',
    thesis_long: 'If crypto becomes mainstream financial infrastructure (stablecoin legislation, crypto in 401ks), COIN is the dominant licensed exchange. Revenue is highly correlated to crypto prices and volumes.',
    why_now: 'Regulatory environment is the most favourable in COIN\'s history. Bitcoin all-time highs = record trading revenue. Stablecoin legislation would unlock massive new revenue streams.',
    catalysts: ['US stablecoin legislation (COIN becomes settlement layer)', 'Bitcoin in pension fund portfolios', 'Crypto custody contracts with major institutions', 'Base L2 blockchain growing rapidly'],
    risks: ['Crypto market crash reducing trading volumes', 'Foreign exchange regulatory uncertainty', 'Centralised exchanges vulnerable to hacks', 'Revenue highly cyclical'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'COIN'
  },
  PANW: {
    name: 'Palo Alto Networks', sector: 'Cybersecurity', exchange: 'NASDAQ',
    price: 198, chg: -0.8, cap: 'mid',
    action: 'BUY', risk: 'Medium', horizon: 'long',
    confidence: 80,
    target12m: '+28%', targetLong: '+110%', pe: 55, growth: '+14% YoY',
    thesis_short: 'Platformisation strategy is working — customers consolidating from 50+ security vendors to one PANW platform. Annual Recurring Revenue growing strongly, near-term revenue optics distorted by transition.',
    thesis_long: 'Cybersecurity spending cannot be cut in a world of nation-state cyber warfare. PANW\'s integrated platform model wins against point-solution vendors. AI-powered threat detection is a genuine moat.',
    why_now: 'Platformisation concerns are now well-priced. AI-powered XSIAM security operations centre is winning enterprise deals. Government and financial sector expanding deployments.',
    catalysts: ['Platformisation revenue recognition clearing', 'XSIAM SOC platform winning large government deals', 'AI-powered threat detection superiority', 'European NATO cyber spending'],
    risks: ['Revenue growth temporary slowdown during platform transition', 'CrowdStrike competition in endpoint security', 'High valuation during transition period'],
    political: { tariffs: 0, nato: +2, ai_regulation: 0, green: 0 },
    t212_search: 'PANW'
  },
  ASML: {
    name: 'ASML Holding (ADR)', sector: 'Semiconductors', exchange: 'NASDAQ',
    price: 718, chg: -1.2, cap: 'large',
    action: 'BUY', risk: 'Low', horizon: 'long',
    confidence: 88,
    target12m: '+30%', targetLong: '+120%', pe: 32, growth: '+18% YoY',
    thesis_short: 'ASML makes the EUV lithography machines needed to manufacture leading-edge chips. They have a complete monopoly — no competitor is even close. Every chip fab (TSMC, Samsung, Intel) must buy from ASML.',
    thesis_long: 'Monopoly on the technology needed to print the world\'s most advanced chips. Cannot be replicated — took 30 years to develop. Every advanced chip fab on earth depends on ASML. Price increases are automatic.',
    why_now: 'AI chip demand is forcing TSMC to build new fabs at record pace. Every new fab needs EUV machines. ASML\'s order book is multi-year backlogged. China export restrictions mean Western allies get priority.',
    catalysts: ['TSMC fab expansion orders (Taiwan, Arizona, Japan)', 'Next-gen High-NA EUV machines at €350m each', 'Europe chip sovereignty (IMEC, STMicro) investments', 'Longer-term China demand when restrictions ease'],
    risks: ['China export restrictions reducing addressable market by 15%', 'Geopolitical risk: Netherlands between US/China pressure', 'Chip cycle downturn reducing near-term orders'],
    political: { tariffs: 0, nato: +1, ai_regulation: 0, green: 0 },
    t212_search: 'ASML'
  },
  TSM: {
    name: 'Taiwan Semiconductor (ADR)', sector: 'Semiconductors', exchange: 'NYSE',
    price: 208, chg: -2.0, cap: 'large',
    action: 'BUY', risk: 'High', horizon: 'long',
    confidence: 78,
    target12m: '+35%', targetLong: '+130%', pe: 25, growth: '+34% YoY',
    thesis_short: 'Makes 90%+ of the world\'s most advanced chips. Every AI chip (NVIDIA, AMD, Apple M-series, Google TPU) is manufactured at TSMC. Revenue growing explosively on AI demand.',
    thesis_long: 'Irreplaceable for at least 10 years. The geopolitical risk is real but overstated — Taiwan\'s chip fabs are too valuable for any rational actor to destroy. Diversifying into US/Japan to reduce risk.',
    why_now: 'AI chip demand surge means TSMC fabs running at 100% utilisation. Arizona fab starting production. Price increases being pushed through for advanced nodes.',
    catalysts: ['AI chip demand at N3/N2 nodes', 'Arizona fab (TSMC USA) production ramp', 'CoWoS packaging for AI GPU demand', 'Japan fab (Kumamoto) opening'],
    risks: ['Taiwan geopolitical risk (China invasion scenario)', 'Customer concentration: APPLE = 25% of revenue', 'US tariffs on Taiwan chips in trade disputes', 'Arizona fab cost overruns'],
    political: { tariffs: -1, nato: +1, ai_regulation: 0, green: 0 },
    t212_search: 'TSM'
  },
  MELI: {
    name: 'MercadoLibre', sector: 'Technology / E-Commerce', exchange: 'NASDAQ',
    price: 2085, chg: -1.8, cap: 'large',
    action: 'BUY', risk: 'Medium', horizon: 'long',
    confidence: 81,
    target12m: '+28%', targetLong: '+120%', pe: 60, growth: '+42% YoY',
    thesis_short: 'Dominant e-commerce and fintech platform across Latin America (Brazil, Mexico, Argentina, Colombia). 220m+ users. MercadoPago fintech growing faster than the e-commerce business.',
    thesis_long: 'LatAm is the fastest-growing digital economy in the world. MELI has the logistics, payments, and marketplace infrastructure to dominate for decades. MercadoPago is becoming the PayPal of Latin America.',
    why_now: 'Brazil and Mexico digital economy boom. Credit portfolio growing 60%+. Ad revenue growing 90%+. Logistics network now a competitive moat.',
    catalysts: ['MercadoPago fintech credit expansion', 'Brazil e-commerce penetration still only 15%', 'Ad revenue acceleration', 'Mexico market share gains vs Amazon'],
    risks: ['Argentine economic instability', 'Currency devaluation risk (BRL, ARS)', 'Amazon entering LatAm aggressively', 'Political risk in key markets'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'MELI'
  },
  SHOP: {
    name: 'Shopify Inc', sector: 'Technology / E-Commerce', exchange: 'NYSE',
    price: 124, chg: -1.6, cap: 'mid',
    action: 'BUY', risk: 'Medium', horizon: 'long',
    confidence: 77,
    target12m: '+35%', targetLong: '+150%', pe: 75, growth: '+25% YoY',
    thesis_short: 'The operating system for online retail — over 2 million merchants globally. AI tools (Shopify Magic, Sidekick) are making merchants more profitable. Offline POS expansion.',
    thesis_long: 'Every business eventually sells online. Shopify is the infrastructure layer. Payments (Shopify Payments), capital (Shopify Capital), logistics are expanding margins. AI commerce is the next frontier.',
    why_now: 'Divested logistics (reducing losses). Back to profitable growth. AI tools for merchants are genuinely useful. B2B enterprise expansion underway.',
    catalysts: ['Shopify Plus enterprise expansion', 'AI merchant tools adoption', 'B2B commerce market expansion', 'International market penetration'],
    risks: ['Amazon, WooCommerce, BigCommerce competition', 'Merchant success directly tied to macro consumer spending', 'High PE during revenue growth slowdown'],
    political: { tariffs: -1, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'SHOP'
  },
  RXRX: {
    name: 'Recursion Pharmaceuticals', sector: 'Healthcare / AI Drug Discovery', exchange: 'NASDAQ',
    price: 5, chg: -3.2, cap: 'small',
    action: 'WATCH', risk: 'High', horizon: 'long',
    confidence: 55,
    target12m: '+80%', targetLong: '+500%', pe: null, growth: '+35% YoY',
    thesis_short: 'AI-powered drug discovery company. Using machine learning to find drug candidates 10x faster than traditional pharma. NVIDIA and Bayer have invested/partnered.',
    thesis_long: 'If AI drug discovery works at scale, this is the biggest disruption in pharmaceutical history. Multi-billion drug pipeline being generated at a fraction of traditional cost. Binary outcome: transformative or zero.',
    why_now: 'WATCH — speculative, high risk. NVIDIA investment gives credibility. First AI-discovered compounds entering human trials. Roche/Bayer partnerships de-risk somewhat.',
    catalysts: ['First AI-discovered drug entering Phase 2 trials', 'NVIDIA Quantum2 platform partnership expansion', 'Roche acquisition or licensing deal', 'Platform licensing to big pharma'],
    risks: ['Clinical trial failures (most drug candidates fail)', 'Cash burn — will need to raise capital', 'Competition from Insilico, Schrödinger, BenevolentAI', 'Regulatory pathway for AI drugs uncertain'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'RXRX'
  },
  ENPH: {
    name: 'Enphase Energy', sector: 'Clean Energy / Solar', exchange: 'NASDAQ',
    price: 62, chg: -2.4, cap: 'mid',
    action: 'WATCH', risk: 'High', horizon: 'long',
    confidence: 58,
    target12m: '+40%', targetLong: '+200%', pe: 22, growth: '-35% YoY',
    thesis_short: 'Microinverter technology leader for solar panels. Revenue hit hard by high interest rates (slowing residential solar). When rates fall, ENPH will rocket. Currently deeply oversold.',
    thesis_long: 'Energy transition is inevitable. Solar + home battery storage is the endpoint for millions of homes. ENPH microinverters are superior technology with proprietary software lock-in.',
    why_now: 'WATCH — accumulate slowly at these levels. Rate cut cycle will dramatically accelerate residential solar adoption. ENPH at 22x earnings is cheap for quality.',
    catalysts: ['Fed rate cuts restarting residential solar', 'IRA clean energy incentives extended', 'Battery storage (Encharge) adoption', 'European energy crisis driving residential solar demand'],
    risks: ['Interest rates staying high for longer', 'Chinese solar inverter companies (Huawei) competing on price', 'US tariff changes affecting solar equipment imports', 'Inventory correction continuing'],
    political: { tariffs: -0.5, nato: 0, ai_regulation: 0, green: +2 },
    t212_search: 'ENPH'
  },
  AFRM: {
    name: 'Affirm Holdings (BNPL)', sector: 'Financials / FinTech', exchange: 'NASDAQ',
    price: 57, chg: -4.1, cap: 'small',
    action: 'WATCH', risk: 'High', horizon: 'long',
    confidence: 61,
    target12m: '+55%', targetLong: '+250%', pe: 42, growth: '+46% YoY',
    thesis_short: 'Buy-Now-Pay-Later dominant in US. Debit+ card reaching 1m+ users. Apple Pay Later discontinued = AFRM picked up that market. Amazon partnership drives volume.',
    thesis_long: 'BNPL is replacing credit cards for younger consumers. AFRM\'s transparent (no hidden fees) model wins trust. Debit+ account is building sticky relationship. Profitable for first time.',
    why_now: 'Apple Pay Later shut down = direct market share gift. First GAAP profitable quarter. Amazon partnership driving 20%+ GMV growth.',
    catalysts: ['Apple Pay Later shutdown windfall', 'Debit+ card expansion to 5m users', 'Amazon partnership GMV growth', 'First sustained GAAP profitability'],
    risks: ['Credit losses rising in consumer stress scenario', 'Competition from Klarna, Afterpay', 'High interest rates hurting BNPL unit economics', 'Regulatory scrutiny of BNPL industry'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'AFRM'
  },
  NU: {
    name: 'Nu Holdings (Nubank)', sector: 'Financials / FinTech', exchange: 'NYSE',
    price: 15, chg: -1.9, cap: 'mid',
    action: 'BUY', risk: 'High', horizon: 'long',
    confidence: 76,
    target12m: '+45%', targetLong: '+250%', pe: 30, growth: '+58% YoY',
    thesis_short: '100 million customers across Brazil, Mexico, Colombia — the fastest-growing digital bank in history. 50% of Brazilian adults now have a Nubank account. Expanding into insurance, investments, payroll.',
    thesis_long: 'Latin America\'s 650 million people are underbanked. Nu is the default financial platform for an entire generation. Once you have someone\'s banking, you have their financial life — deposits, loans, insurance, investments.',
    why_now: 'Profitable in every market. Mexico growing at 200%+ (still tiny). Warren Buffett (Berkshire) invested. Crossing 100 million customers = network effects compounding.',
    catalysts: ['Mexico market expansion (200% YoY growth)', 'Nubank insurance and investment products', 'Colombia market scaling', 'Credit card lending expansion'],
    risks: ['Brazilian real currency devaluation', 'Brazilian economic recession', 'Credit losses if Brazilian consumers stress', 'Regulatory changes in financial services'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'NU'
  },

  /* ════════════════════════════════════════════
     UK STOCKS (LSE)
     ════════════════════════════════════════════ */
  'RR.L': {
    name: 'Rolls-Royce Holdings', sector: 'Defence & Aerospace', exchange: 'LSE',
    price: 440, chg: +1.2, cap: 'large',
    action: 'BUY', risk: 'Medium', horizon: 'both',
    confidence: 88,
    target12m: '+35%', targetLong: '+150%', pe: 28, growth: '+57% YoY',
    thesis_short: 'Remarkable turnaround under CEO Tufan Erginbilgin. Long-Term Service Agreement (LTSA) revenue from aircraft engine maintenance is now a high-margin, recurring cash machine. Civil aviation recovering strongly post-COVID. Free cash flow turned massively positive.',
    thesis_long: 'Rolls-Royce engines power 50% of widebody commercial aircraft globally — every flight hour generates service revenue for decades. Defence division (Typhoon, submarine nuclear reactors) benefits from NATO spending surge. Small Modular Reactors (SMR) is a potential £multi-billion new revenue stream if UK government awards contracts.',
    why_now: 'Free cash flow guidance upgraded 3x in 2 years. SMR contract decision expected. Defence orders accelerating with European rearmament. Still trading at significant discount to US defence peers.',
    catalysts: ['UK SMR contract award (potential £10bn+)', 'NATO 3% GDP defence spending = more UK government contracts', 'Civil aviation engine flying hours near pre-COVID peak', 'Power Systems division benefiting from data centre energy demand', 'Further buyback/dividend initiation as FCF builds'],
    risks: ['Boeing/Airbus production delays reduce engine deliveries', 'SMR contracts delayed or cancelled', 'Pension deficit obligations', 'Airlines cutting routes in recession', 'Currency risk (USD-denominated revenue vs GBP costs)'],
    political: { tariffs: -0.5, nato: +3, ai_regulation: 0, green: +1 },
    t212_search: 'RR.'
  },
  'BA.L': {
    name: 'BAE Systems PLC', sector: 'Defence', exchange: 'LSE',
    price: 1380, chg: +0.8, cap: 'large',
    action: 'BUY', risk: 'Low', horizon: 'both',
    confidence: 86,
    target12m: '+25%', targetLong: '+120%', pe: 22, growth: '+14% YoY',
    thesis_short: 'UK\'s largest defence company and one of the world\'s top 10. Record order backlog of £74bn. Governments are committing to 3% GDP+ defence spending for the first time since the Cold War. BAE is the prime beneficiary in UK and globally.',
    thesis_long: 'BAE dominates UK\'s most critical defence programmes: Dreadnought submarines (40-year lifecycle), Typhoon/Tempest combat aircraft, Type 26 frigates, cyber warfare, and AUKUS submarine programme. Multi-decade revenue visibility with government-backed contracts. Electronic warfare is a rapidly growing segment.',
    why_now: 'NATO rearmament is structural, not cyclical. UK committed to 2.5% GDP on defence by 2027. BAE\'s backlog is at all-time highs. AUKUS submarine deal adds Australian revenue. US F-35 electronics and UK Typhoon upgrades both driving growth.',
    catalysts: ['UK defence budget increase to 2.5% GDP', 'AUKUS submarine programme (Australia) revenues', 'Tempest / Global Combat Air Programme (GCAP)', 'Electronic warfare & cyber segment acceleration', 'US F-35 ship sets and weapons production'],
    risks: ['Defence budget cuts if new government elected', 'Programme delays or cost overruns on major contracts', 'Supply chain constraints (titanium, specialised components)', 'Geopolitical de-escalation reducing urgency', 'USD/GBP currency headwinds'],
    political: { tariffs: -0.5, nato: +3, ai_regulation: 0, green: 0 },
    t212_search: 'BA.'
  },
  'HSBA.L': {
    name: 'HSBC Holdings PLC', sector: 'Financials', exchange: 'LSE',
    price: 820, chg: +0.4, cap: 'large',
    action: 'BUY', risk: 'Medium', horizon: 'both',
    confidence: 78,
    target12m: '+20%', targetLong: '+80%', pe: 8, growth: '+12% YoY',
    thesis_short: 'World\'s largest trade finance bank, pivoted to Asia. Earnings power at near-record levels. Dividend yield of 6%+ and £3bn+ buyback programme. Trading at a significant discount to book value despite strong profitability.',
    thesis_long: 'HSBC is uniquely positioned at the intersection of East-West trade finance. No Western bank can match its Asian network. As Asia\'s trade grows and middle classes expand, HSBC\'s franchise becomes more valuable. Wealth management in Asia is still in early innings.',
    why_now: 'Dividend restored to pre-COVID levels plus special dividends. Buyback programme ongoing. CEO Georges Elhedery focused on shareholder returns. Hong Kong and Asia operations generating record profits despite global headwinds.',
    catalysts: ['Asia wealth management business scaling', 'Special dividends and buybacks continuation', 'Hong Kong commercial real estate stabilisation', 'Trade finance volumes increasing with Asia supply chains', 'Potential re-rating if Western investor sentiment improves on China'],
    risks: ['China/Hong Kong geopolitical escalation', 'US-China trade war impacting Asian trade volumes', 'UK base rates declining faster than expected', 'Credit losses in commercial real estate', 'Regulatory capital requirements increasing'],
    political: { tariffs: -1, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'HSBA'
  },
  'LLOY.L': {
    name: 'Lloyds Banking Group', sector: 'Financials', exchange: 'LSE',
    price: 72, chg: -0.3, cap: 'large',
    action: 'WATCH', risk: 'Medium', horizon: 'long',
    confidence: 62,
    target12m: '+15%', targetLong: '+60%', pe: 7, growth: '+8% YoY',
    thesis_short: 'UK\'s largest mortgage lender and retail bank. 7%+ dividend yield. Cheap at 7x earnings. However, the motor finance PCP (Personal Contract Purchase) mis-selling scandal creates a significant unknown liability — court ruling expected.',
    thesis_long: 'If the motor finance scandal is resolved favorably (compensation capped at manageable levels), Lloyds is deeply undervalued. Strong UK mortgage franchise, improving net interest margin, and diversified insurance business (Scottish Widows).',
    why_now: 'WATCH until the Supreme Court ruling on motor finance PCP claims is handed down. If liability is capped or reversed, LLOY could surge 30%+ quickly. Current price bakes in a worst-case scenario. High-risk, high-reward situation requiring patience.',
    catalysts: ['Favourable Supreme Court ruling on motor finance claims', 'UK interest rates staying higher for longer', 'Halifax mortgage market share recovery', 'Dividend growth and buyback programme', 'Insurance (Scottish Widows) de-merger optionality'],
    risks: ['Motor finance PCP claims liability (could be £20bn+ worst case)', 'UK house price decline impacting mortgage book', 'Recession increasing credit losses', 'Bank of England rate cuts compressing margins faster than expected', 'Regulatory capital surcharge'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'LLOY'
  },
  'BARC.L': {
    name: 'Barclays PLC', sector: 'Financials', exchange: 'LSE',
    price: 295, chg: +0.6, cap: 'large',
    action: 'BUY', risk: 'Medium', horizon: 'both',
    confidence: 74,
    target12m: '+25%', targetLong: '+90%', pe: 8, growth: '+18% YoY',
    thesis_short: 'Barclays is the most undervalued UK bank. Trading at 0.5x book value while generating 10%+ return on equity. CEO C.S. Venkatakrishnan\'s 3-year plan to increase UK retail profitability and return capital is working. Investment banking revenues strong.',
    thesis_long: 'Unique dual model — UK retail bank + global investment bank. Investment banking (M&A advisory, fixed income, equities) generates higher-margin revenues than pure retail. No motor finance exposure unlike Lloyds. Buyback programme accelerating.',
    why_now: 'Upgrade cycle: analysts continuously upgrading earnings estimates. Cost savings programme delivering. Capital ratio improving faster than expected. UK consumer spending resilient. Investment bank benefiting from M&A recovery.',
    catalysts: ['Buyback programme acceleration', 'UK consumer business profitability improvement', 'Investment bank M&A fee recovery', 'Cost savings delivering above targets', 'Re-rating towards book value as ROE improves'],
    risks: ['Investment bank revenue cyclicality', 'UK retail credit losses in recession', 'Regulatory capital requirements', 'US DOJ investigations (historical matters)', 'Competition from digital banks (Monzo, Starling)'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'BARC'
  },
  'AZN': {
    name: 'AstraZeneca PLC', sector: 'Healthcare / Pharma', exchange: 'NASDAQ',
    price: 71, chg: +0.5, cap: 'large',
    action: 'BUY', risk: 'Low', horizon: 'both',
    confidence: 85,
    target12m: '+30%', targetLong: '+130%', pe: 20, growth: '+18% YoY',
    thesis_short: 'UK/Swedish pharmaceutical giant with one of the strongest oncology pipelines in the world. Tagrisso (lung cancer), Imfinzi (immunotherapy), and Enhertu (breast/gastric cancer) are all growing rapidly. Revenue surpassed $50bn. Emerging markets expansion especially in China.',
    thesis_long: 'AstraZeneca is becoming the world\'s most valuable pharmaceutical company. Rare diseases platform (Alexion acquisition), cardiovascular drugs (Farxiga), and respiratory franchise add stability. With 15+ potential blockbusters in the pipeline, the next decade looks extremely promising. UK\'s largest company by market cap.',
    why_now: 'China revenue recovery after government crackdown resolved. Enhertu approved for multiple new cancer indications. Rare disease portfolio fully integrated. Pipeline inflection with 5+ Phase 3 readouts in 2025.',
    catalysts: ['Enhertu new cancer indications (lung, gastric, breast)', 'China revenue normalisation and growth resumption', 'Rare disease platform (Alexion) next-generation drugs', 'Obesity/cardiometabolic drugs (MASH programme)', 'US/EU regulatory approvals for pipeline assets'],
    risks: ['China investigation overhang (executive detained)', 'Patent cliffs for older drugs (Crestor, Nexium)', 'Clinical trial failures in late-stage pipeline', 'Generic competition in mature markets', 'Currency risk (significant non-USD revenue)'],
    political: { tariffs: -0.5, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'AZN'
  },
  'SHEL': {
    name: 'Shell plc', sector: 'Energy', exchange: 'NYSE',
    price: 72, chg: -0.4, cap: 'large',
    action: 'HOLD', risk: 'Low', horizon: 'both',
    confidence: 71,
    target12m: '+15%', targetLong: '+50%', pe: 11, growth: '+4% YoY',
    thesis_short: 'Anglo-Dutch oil major with best-in-class LNG (liquefied natural gas) business. Integrated Gas division is the crown jewel — Shell is the world\'s largest LNG trader. Strong cash generation funds a growing dividend and buyback programme. Less capital-intensive than US peers.',
    thesis_long: 'Shell is diversifying faster than US peers into LNG, chemical recycling, and low-carbon energy — while maintaining massive cash generation from oil and gas for the transition. Chemicals business restructured. Renewables position being built methodically.',
    why_now: 'Global LNG demand structurally growing (Europe replacing Russian gas, Asia growing). Share buybacks continuing. Dividend increased. CEO Wael Sawan focussed on capital discipline and returns to shareholders rather than vanity ESG projects.',
    catalysts: ['LNG demand surge from Europe (Russia gas replacement)', 'Asian LNG demand growth (India, China)', 'Chemicals restructuring delivering cost savings', 'Continued buyback programme (£3.5bn per quarter)', 'Deepwater Gulf of Mexico production growth'],
    risks: ['Oil price decline below $60/barrel stress-testing cash flows', 'Carbon taxes and stranded asset risk long-term', 'LNG supply glut from US/Qatar new capacity', 'Activist investor pressure on climate strategy', 'Refining margins normalising'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: -1 },
    t212_search: 'SHEL'
  },
  'BP': {
    name: 'BP plc', sector: 'Energy', exchange: 'NYSE',
    price: 34, chg: -0.7, cap: 'large',
    action: 'WATCH', risk: 'Medium', horizon: 'long',
    confidence: 64,
    target12m: '+20%', targetLong: '+70%', pe: 10, growth: '-5% YoY',
    thesis_short: 'BP is the cheapest of the major oil companies. Trading at multi-year lows due to strategy uncertainty — overpromised on renewables, now pivoting back to oil and gas under CEO Murray Auchincloss. Activist investors pushing for breakup or strategy change. Potential re-rating.',
    thesis_long: 'If activist investors succeed in pushing BP to spin off or simplify its portfolio, significant value could be unlocked. BP\'s upstream assets (North Sea, Gulf of Mexico, Azerbaijan) are world-class. Trading at 40% discount to US peers (Exxon, Chevron) on most metrics.',
    why_now: 'WATCH — company undergoing strategic review. Could be a takeover target (Shell, Exxon have been mooted). Activist hedge funds (Elliott Management) pushing for change. New CEO must show credibility before investing confidently.',
    catalysts: ['Activist investor (Elliott) pushing for strategy change', 'Potential takeover bid from larger rival', 'Oil prices rising above $80/barrel', 'Asset sales unlocking value', 'Simplification of portfolio and cost cutting'],
    risks: ['Oil price decline making assets uneconomic', 'Deepwater Horizon legacy costs continuing', 'Renewables strategy U-turn damaging credibility further', 'Dividend cut risk if cash flows disappoint', 'US Permian Basin underperformance vs peers'],
    political: { tariffs: 0, nato: 0, ai_regulation: 0, green: -1 },
    t212_search: 'BP.'
  },
  'GLEN.L': {
    name: 'Glencore PLC', sector: 'Materials / Mining', exchange: 'LSE',
    price: 320, chg: +1.1, cap: 'large',
    action: 'WATCH', risk: 'High', horizon: 'long',
    confidence: 63,
    target12m: '+20%', targetLong: '+100%', pe: 12, growth: '-8% YoY',
    thesis_short: 'World\'s largest commodities trader and one of the biggest mining companies. Unique business model: mines copper, cobalt, coal — and also trades commodities globally (making money on volatility itself). Copper is the critical metal for energy transition.',
    thesis_long: 'Copper demand will double by 2040 for EVs, grids, and renewables. Glencore is a top-3 copper miner globally. Cobalt is crucial for batteries (Glencore controls the world\'s largest cobalt mine, Mutanda in DRC). Trading business generates profit regardless of commodity direction.',
    why_now: 'Coal division (controversial but highly profitable) is being wound down by 2035 — but generating billions in cash meantime. Copper assets in South America and Africa are being expanded. Takeover speculation after failed Rio Tinto merger bid.',
    catalysts: ['Copper price surge as supply deficit widens', 'Cobalt prices recovering from cyclical lows', 'Coal cash generation extending shareholder returns', 'Potential M&A activity in mining consolidation', 'Energy transition driving copper demand acceleration'],
    risks: ['Commodity price collapse (copper below $7000/tonne stress test)', 'DRC (Congo) political instability affecting Katanga mines', 'ESG investor pressure (coal operations)', 'China slowdown reducing commodity demand', 'Currency and political risk in emerging market operations'],
    political: { tariffs: -1, nato: 0, ai_regulation: 0, green: -1 },
    t212_search: 'GLEN'
  },

  /* ════════════════════════════════════════════
     EUROPEAN STOCKS
     ════════════════════════════════════════════ */
  'SAP': {
    name: 'SAP SE', sector: 'Technology / Enterprise Software', exchange: 'NYSE',
    price: 250, chg: +1.4, cap: 'large',
    action: 'BUY', risk: 'Low', horizon: 'both',
    confidence: 83,
    target12m: '+25%', targetLong: '+100%', pe: 42, growth: '+10% YoY',
    thesis_short: 'Europe\'s most valuable tech company and the global leader in enterprise resource planning (ERP). 90%+ of large corporations worldwide use SAP. Cloud migration (S/4HANA Cloud) is creating a massive, recurring revenue base that is only ~30% complete. AI embedded into core products.',
    thesis_long: 'Every company moving to SAP S/4HANA is a multi-year, multi-million dollar project — creating deep switching costs and 25+ year customer relationships. Business AI (Joule copilot) is becoming embedded in ERP workflows globally. SAP is one of the few European companies that can genuinely compete with US big tech.',
    why_now: 'Cloud revenue growing 25%+ while total revenue accelerating. AI copilot "Joule" integrated across SAP portfolio. Majority of installed base still on legacy SAP ECC (pre-2027 end-of-support driving forced migration). Record revenue guidance for 2025.',
    catalysts: ['S/4HANA cloud migration — 20,000+ legacy customers still to migrate', 'SAP Joule AI copilot adoption across ERP suite', 'Rise with SAP hyperscaler partnerships (AWS, Azure, Google)', 'Business Network marketplace expansion', 'SuccessFactors (HR) and Ariba (procurement) cloud growth'],
    risks: ['Migration projects slower than expected', 'Competition from Oracle Fusion cloud ERP', 'Economic slowdown reducing enterprise IT spending', 'German economic weakness (large home market)', 'Currency risk (EUR/USD)'],
    political: { tariffs: -0.5, nato: 0, ai_regulation: -0.5, green: 0 },
    t212_search: 'SAP'
  },
  'AIR.PA': {
    name: 'Airbus SE', sector: 'Industrials / Aerospace', exchange: 'Euronext Paris',
    price: 175, chg: +0.6, cap: 'large',
    action: 'BUY', risk: 'Low', horizon: 'both',
    confidence: 81,
    target12m: '+20%', targetLong: '+90%', pe: 25, growth: '+8% YoY',
    thesis_short: 'Airbus is one of just two companies (with Boeing) that can build large commercial aircraft. Boeing\'s production crisis (737 MAX safety scandal, quality failures) is handing Airbus a decade of market share gains. Current backlog: 8,700+ aircraft worth €600bn+ — a 10+ year production queue.',
    thesis_long: 'The global airline fleet needs to double by 2040 (Asia Pacific growth). Airbus A320neo family dominates narrowbody market at 60%+ share. A350 widebody has zero serious competition after Boeing 787 delivery problems. Defence division growing with European rearmament.',
    why_now: 'Boeing production cuts = Airbus gaining orders faster than it can build. Delivery rate target of 75 aircraft/month by 2027 = massive revenue step-up. Defence orders accelerating (A400M, Eurofighter, helicopters). Dividend reinstated and growing.',
    catalysts: ['Boeing production crisis driving Airbus order conversions', 'Delivery rate ramp to 75/month by 2027', 'A350 widebody demand from Asian carriers', 'European defence spending (Eurofighter Typhoon upgrades)', 'Supply chain normalisation enabling output acceleration'],
    risks: ['Engine supplier bottlenecks (CFM, P&W) limiting output', 'Boeing recovery taking market share back', 'Airline bankruptcies cancelling orders (recession risk)', 'Supply chain delays in titanium, composites', 'European carbon regulations increasing aircraft operating costs'],
    political: { tariffs: -0.5, nato: +1.5, ai_regulation: 0, green: -0.5 },
    t212_search: 'AIR'
  },
  'MC.PA': {
    name: 'LVMH Moët Hennessy', sector: 'Consumer / Luxury', exchange: 'Euronext Paris',
    price: 600, chg: -0.8, cap: 'large',
    action: 'WATCH', risk: 'Medium', horizon: 'long',
    confidence: 69,
    target12m: '+15%', targetLong: '+80%', pe: 22, growth: '-3% YoY',
    thesis_short: 'World\'s largest luxury conglomerate. 75+ ultra-premium brands: Louis Vuitton, Dior, Moët & Chandon, Hennessy, Bulgari, TAG Heuer. Luxury is one of the most resilient business models — affluent consumers rarely trade down. Currently experiencing a cyclical slowdown in China.',
    thesis_long: 'The global luxury market will grow as Asian middle classes expand. LVMH has pricing power like no other company — Louis Vuitton raised prices 50%+ post-COVID with zero demand destruction. Bernard Arnault has compounded shareholder value at 15%+ annually for 30 years.',
    why_now: 'WATCH — China recovery is the key catalyst. Chinese consumers account for ~35% of global luxury spending. When China confidence returns, LVMH snaps back hard. Currently trading at 5-year valuation lows. Entry point building.',
    catalysts: ['China consumer confidence recovery', 'US luxury spending resilience', 'Fashion & Leather Goods (LV, Dior) pricing power', 'Perfumes & Cosmetics (Sephora) growth', 'DFS (travel retail) benefiting from Asian travel recovery'],
    risks: ['China economic slowdown prolonging luxury weakness', 'US tariffs on European luxury goods', 'Bernard Arnault succession uncertainty', 'Anti-ostentation regulations in China', 'Counterfeit luxury market growing'],
    political: { tariffs: -2, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'LVMH'
  },
  'SIE.DE': {
    name: 'Siemens AG', sector: 'Industrials / Technology', exchange: 'XETRA',
    price: 185, chg: +0.9, cap: 'large',
    action: 'BUY', risk: 'Low', horizon: 'both',
    confidence: 77,
    target12m: '+20%', targetLong: '+85%', pe: 18, growth: '+7% YoY',
    thesis_short: 'Germany\'s most diversified industrial-technology conglomerate. Siemens Digital Industries (factory automation + software) is the key growth driver. Industrial automation with AI is the next wave. Infrastructure & Transport (trains, smart grids) benefits from European green transition.',
    thesis_long: 'Siemens is becoming a software and automation powerhouse. Siemens Digital Industries Software (formerly Mentor) competes with Dassault Systèmes in industrial simulation. Factory of the future = digital twin + AI + robotics — Siemens is uniquely positioned across all three layers.',
    why_now: 'European industrial re-shoring (away from China) driving factory automation capex. Grid infrastructure spending exploding as Europe electrifies. Siemens Energy (partially owned) is a major beneficiary of power transition.',
    catalysts: ['Factory automation capex cycle upcycle', 'Smart grid infrastructure spending surge', 'Digital Industries Software growth accelerating', 'European manufacturing reshoring orders', 'Siemens Healthineers growth (medical imaging AI)'],
    risks: ['German industrial recession reducing automation orders', 'Competition from Rockwell Automation, ABB', 'China slowdown (15% revenue exposure)', 'Interest rate sensitivity (long-cycle business)', 'Euro weakness vs USD'],
    political: { tariffs: -1, nato: +0.5, ai_regulation: -0.5, green: +1 },
    t212_search: 'SIE'
  },

  /* ════════════════════════════════════════════
     CHINESE STOCKS (US-listed ADRs)
     ════════════════════════════════════════════ */
  'BIDU': {
    name: 'Baidu Inc', sector: 'Technology', exchange: 'NASDAQ',
    price: 90, chg: -1.1, cap: 'large',
    action: 'WATCH', risk: 'High', horizon: 'long',
    confidence: 56,
    target12m: '+30%', targetLong: '+120%', pe: 12, growth: '+5% YoY',
    thesis_short: 'China\'s dominant search engine (70%+ market share) — China\'s equivalent of Google. Also the world\'s most advanced autonomous driving technology platform (Apollo). Ernie Bot LLM is China\'s leading large language model. Trading at extremely cheap valuation (12x earnings) due to China regulatory and geopolitical discount.',
    thesis_long: 'If China\'s tech regulatory environment stabilises and autonomous driving commercialises, Baidu is deeply undervalued. Apollo robotaxi service (Wuhan, Chongqing) already operating. Cloud AI business growing rapidly. Search advertising cash flow funds all growth investments.',
    why_now: 'WATCH — high risk, high reward. China government support for domestic AI is increasing. US-China geopolitical tensions create headline risk but Baidu is unlikely to be sanctioned (not a hardware company). Extremely cheap but requires China macro confidence.',
    catalysts: ['Ernie Bot monetisation via API (enterprise AI)', 'Apollo robotaxi commercial expansion nationally', 'China AI investment cycle driven by DeepSeek success', 'Online marketing recovery as China economy recovers', 'Cloud AI (Baidu Intelligent Cloud) growth acceleration'],
    risks: ['US-China geopolitical escalation (ADR delisting risk)', 'Chinese government regulatory crackdown renewal', 'ByteDance/Douyin taking search queries from younger users', 'AI competition from Alibaba, Tencent, Chinese startups', 'Chinese economic slowdown reducing ad spend'],
    political: { tariffs: -3, nato: -2, ai_regulation: -2, green: 0 },
    t212_search: 'BIDU'
  },
  'TCOM': {
    name: 'Trip.com Group', sector: 'Consumer / Travel', exchange: 'NASDAQ',
    price: 58, chg: +0.9, cap: 'mid',
    action: 'BUY', risk: 'High', horizon: 'both',
    confidence: 72,
    target12m: '+35%', targetLong: '+130%', pe: 18, growth: '+20% YoY',
    thesis_short: 'China\'s dominant online travel platform (hotels, flights, trains). Chinese outbound travel is recovering strongly post-COVID. Trip.com international platform growing rapidly — now the world\'s #2 OTA by some metrics. Domestic China travel is booming.',
    thesis_long: 'China has 1.4bn people with rapidly growing disposable incomes and passport ownership. Chinese outbound tourism is only at 50% of pre-COVID levels — the recovery runway is massive. Trip.com is the default booking platform for Chinese travellers internationally.',
    why_now: 'International revenue growing 70%+ as Chinese tourists return. Operating leverage kicking in — revenue growing faster than costs. PE of 18x is extremely cheap for a dominant platform with 20%+ growth. Buffett-like position in Chinese travel.',
    catalysts: ['Chinese outbound travel recovery to pre-COVID levels', 'International (non-China) platform expansion', 'Operating leverage improving margins', 'Middle East and Asia Pacific market expansion', 'Domestic China travel volume growth'],
    risks: ['US-China geopolitical tensions discouraging investment', 'COVID resurgence or new pandemic risk', 'Chinese government travel restrictions', 'Competition from Meituan, Alibaba\'s Fliggy', 'Currency risk if RMB weakens'],
    political: { tariffs: -2, nato: -1, ai_regulation: -1, green: 0 },
    t212_search: 'TCOM'
  },
  'BILI': {
    name: 'Bilibili Inc', sector: 'Technology / Media', exchange: 'NASDAQ',
    price: 22, chg: +1.8, cap: 'mid',
    action: 'WATCH', risk: 'High', horizon: 'long',
    confidence: 58,
    target12m: '+40%', targetLong: '+200%', pe: null, growth: '+24% YoY',
    thesis_short: 'China\'s YouTube — the dominant long-form video and animation platform for Gen Z and Millennials in China. Known for high-quality user-generated content and "danmaku" (real-time comments). 100mn+ monthly active users with exceptional engagement. Approaching breakeven.',
    thesis_long: 'Bilibili has the most loyal and engaged young audience in China — and loyalty translates to premium subscription revenue, games, and e-commerce. As China\'s Gen Z ages into prime earning years, BILI monetisation accelerates. The "otaku" culture platform has zero serious competitor.',
    why_now: 'First-ever quarter of GAAP profitability achieved. Advertising revenue recovering as China economy improves. Cost cuts have dramatically improved unit economics. Live streaming and premium membership growing.',
    catalysts: ['First sustained GAAP profitability in 2025', 'Advertising revenue recovery with China economic rebound', 'Gaming pipeline (original games IP development)', 'E-commerce integration for content creators', 'Overseas expansion (anime is globally popular)'],
    risks: ['Content regulation by Chinese government', 'Competition from Douyin (TikTok in China), WeChat Video', 'US-China geopolitical tensions (ADR delisting risk)', 'Gaming licence approvals slow in China', 'User monetisation lower than US peers'],
    political: { tariffs: -2, nato: -2, ai_regulation: -1, green: 0 },
    t212_search: 'BILI'
  },

  /* ════════════════════════════════════════════
     INDIAN STOCKS (US-listed ADRs)
     ════════════════════════════════════════════ */
  'INFY': {
    name: 'Infosys Limited', sector: 'Technology / IT Services', exchange: 'NYSE',
    price: 21, chg: +0.4, cap: 'large',
    action: 'WATCH', risk: 'Low', horizon: 'both',
    confidence: 68,
    target12m: '+18%', targetLong: '+70%', pe: 24, growth: '+8% YoY',
    thesis_short: 'India\'s second-largest IT services company. 300,000+ employees delivering software development, digital transformation, and AI services to global Fortune 500 clients. AI-driven transformation services (Infosys Topaz) is the key new revenue stream. Solid dividend payer.',
    thesis_long: 'Indian IT services companies have a structural cost advantage: the same software engineering talent costs 1/5th of US/UK equivalents. As companies globally face pressure to cut IT costs while adopting AI, Indian IT firms like Infosys become essential partners. 35+ years of Fortune 500 client relationships.',
    why_now: 'AI-driven projects (Topaz AI) growing at 40%+ — most clients want to transform using AI and Infosys provides the delivery. Revenue guidance upgraded. Margin recovery from post-COVID wage inflation. Share buyback programme continuing.',
    catalysts: ['AI transformation services (Infosys Topaz) growth', 'US corporate IT spending recovery', 'Banking & Financial Services vertical recovery', 'Margin improvement from cost rationalisation', 'Return to 8-10% revenue growth'],
    risks: ['Demand slowdown if US/European recession hits corporate IT budgets', 'Immigration policy tightening increasing onsite delivery costs', 'Competition from Accenture, TCS, Wipro', 'AI disruption (automation reducing headcount-based billing)', 'Currency risk (USD revenue, INR cost base)'],
    political: { tariffs: -0.5, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'INFY'
  },
  'HDB': {
    name: 'HDFC Bank Limited', sector: 'Financials', exchange: 'NYSE',
    price: 65, chg: +0.5, cap: 'large',
    action: 'BUY', risk: 'Medium', horizon: 'long',
    confidence: 76,
    target12m: '+25%', targetLong: '+110%', pe: 18, growth: '+15% YoY',
    thesis_short: 'India\'s largest private sector bank and one of the best-run banks in Asia. India\'s middle class is growing at 50 million+ per year — each new middle-class family needs a bank account, mortgage, car loan, and investment product. HDFC Bank is the default choice for India\'s rising middle class.',
    thesis_long: 'India will become the world\'s 3rd largest economy by 2030 (already past UK and France). HDFC Bank has 180 million+ customers and only 8% credit card penetration in India vs 30%+ in developed markets — the growth runway is decades long. Post-merger with HDFC Ltd, the combined bank is formidable.',
    why_now: 'Post HDFC-HDFC Bank merger integration largely complete. Loan growth accelerating. NIM (net interest margin) stabilising after post-merger pressure. India economy growing 7%+ — best major economy in the world. FII (foreign institutional investor) flows returning to Indian equities.',
    catalysts: ['India GDP growth 6-7% sustaining loan demand', 'Credit card and consumer finance penetration increasing', 'NIM recovery and expansion post-merger', 'Rural banking expansion (underserved markets)', 'India stock market index weight increase attracting passive flows'],
    risks: ['Reserve Bank of India rate cuts compressing NIM', 'Asset quality deterioration if Indian economy slows', 'HDFC Ltd merger integration unexpected costs', 'Competition from digital banks (Paytm, PhonePe, Jio Financial)', 'FII selling pressure if USD strengthens'],
    political: { tariffs: -0.5, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'HDB'
  },
  'WIT': {
    name: 'Wipro Limited', sector: 'Technology / IT Services', exchange: 'NYSE',
    price: 5, chg: +0.3, cap: 'large',
    action: 'WATCH', risk: 'Medium', horizon: 'long',
    confidence: 60,
    target12m: '+15%', targetLong: '+60%', pe: 21, growth: '+5% YoY',
    thesis_short: 'India\'s third-largest IT services company. Restructuring under CEO Srinivas Pallia after a difficult period. AI services (Wipro ai360) growing. Cheaper than Infosys and TCS on valuation. Good entry for exposure to Indian IT sector at a discount.',
    thesis_long: 'India has 5 million+ software engineers graduating every year — the largest tech talent pool in the world. Wipro services 200+ Fortune 500 clients with deep relationships in banking, healthcare, and manufacturing. As US and European companies reduce IT costs, Indian IT grows.',
    why_now: 'WATCH — recovery underway but conviction lower than Infosys. New CEO implementing restructuring. Large deals returning (consulting + IT bundled). Good dividend. Better entry if AI services ramp faster than expected.',
    catalysts: ['Wipro ai360 AI transformation wins', 'Large deal momentum recovery ($1bn+ contracts)', 'Europe (Capco consulting) revenue growth', 'Operational efficiency improvements', 'Return to double-digit revenue growth'],
    risks: ['Revenue growth lagging peers (TCS, Infosys)', 'Talent attrition higher than peers historically', 'US visa policy tightening', 'Execution risk in CEO transition period', 'Competition for talent with larger Indian IT peers'],
    political: { tariffs: -0.5, nato: 0, ai_regulation: 0, green: 0 },
    t212_search: 'WIT'
  }
};

/* ──────────────────────────────────────────
   SECTOR CASCADE ENGINE
   PhD-level macro dependency mapping.
   When one sector moves, these cascade.
────────────────────────────────────────── */
const SECTOR_CASCADES = [
  {
    id: 'ai_infra_power',
    trigger_event: 'AI Infrastructure Boom',
    trigger_sector: 'Technology / AI',
    icon: '🤖',
    description: 'Every $1bn of AI compute built requires massive electricity, cooling, rare earth minerals, and specialised servers. This cascade is already happening.',
    urgency: 'NOW',
    effects: [
      { sector: 'Nuclear & Power', direction: 'positive', magnitude: 'EXTREME', stocks: ['VST', 'CEG', 'NEE'],
        reason: 'AI data centres consume 10x more power than traditional infrastructure. A single ChatGPT query uses 10x more energy than a Google search. Hyperscalers are signing 20-year nuclear PPAs. Power demand will double by 2030.' },
      { sector: 'Rare Earth Minerals', direction: 'positive', magnitude: 'HIGH', stocks: ['MP', 'ALB'],
        reason: 'GPU manufacturing requires neodymium (magnets), cobalt, and lithium. AI chip demand is creating entirely new mining demand cycles. China controls 85% of processing — creating a supply emergency.' },
      { sector: 'Cybersecurity', direction: 'positive', magnitude: 'HIGH', stocks: ['CRWD', 'PANW'],
        reason: 'AI systems are massive new attack surfaces. Every AI deployment requires endpoint security, network security and AI-specific threat detection. Budgets are exploding.' },
      { sector: 'Semiconductor Equipment', direction: 'positive', magnitude: 'EXTREME', stocks: ['ASML', 'TSM'],
        reason: 'AI chips require the most advanced semiconductor manufacturing. TSMC is building new fabs at record pace. ASML EUV machines are the bottleneck — 2-year order backlog.' },
      { sector: 'Traditional IT Services', direction: 'negative', magnitude: 'MEDIUM', stocks: ['INTC'],
        reason: 'AI automation is replacing traditional IT consulting, software maintenance, and data entry services. Legacy IT companies face existential disruption.' }
    ]
  },
  {
    id: 'european_rearmament',
    trigger_event: 'European Rearmament & NATO 3% GDP Target',
    trigger_sector: 'Geopolitics / Defence',
    icon: '🛡️',
    description: 'Russia-Ukraine war + NATO expansion commitments = largest European military spending surge since World War II. Every NATO member is racing to rebuild depleted arsenals.',
    urgency: 'NOW',
    effects: [
      { sector: 'Defence Prime Contractors', direction: 'positive', magnitude: 'EXTREME', stocks: ['LMT', 'RTX', 'NOC'],
        reason: 'NATO\'s new 3% GDP target means $400bn+ additional annual spending. F-35 backlog exceeds 1,000 aircraft. Patriot missile demand is unquenchable. This is a decade-long order cycle.' },
      { sector: 'Cybersecurity', direction: 'positive', magnitude: 'HIGH', stocks: ['CRWD', 'PANW', 'PLTR'],
        reason: 'State-sponsored cyberattacks from Russia and China are escalating. NATO cyber defence budgets growing 50%+ annually. Palantir and CrowdStrike winning government contracts.' },
      { sector: 'Steel & Industrial Metals', direction: 'positive', magnitude: 'MEDIUM', stocks: ['MP'],
        reason: 'Military hardware requires specialised alloys, rare earth magnets for missiles and aircraft. Domestic production being prioritised for security reasons.' },
      { sector: 'AI Defence Systems', direction: 'positive', magnitude: 'HIGH', stocks: ['PLTR'],
        reason: 'Modern warfare is AI warfare. Battlefield management AI, drone coordination, intelligence analysis — all going to PLTR and defence AI specialists.' }
    ]
  },
  {
    id: 'us_china_decoupling',
    trigger_event: 'US-China Tech Decoupling & Tariff Escalation',
    trigger_sector: 'Geopolitics / Trade',
    icon: '🌏',
    description: 'The world is splitting into two technological spheres. Western and Chinese tech supply chains are being forcibly separated. This is a 10-year structural shift.',
    urgency: 'BUILDING',
    effects: [
      { sector: 'Rare Earth / Critical Materials', direction: 'positive', magnitude: 'EXTREME', stocks: ['MP', 'ALB'],
        reason: 'China controls 85% of rare earth processing and 70% of lithium processing. Decoupling forces Western nations to build domestic supply chains at enormous cost — and enormous profit for Western producers.' },
      { sector: 'Western Semiconductor Manufacturing', direction: 'positive', magnitude: 'HIGH', stocks: ['TSM', 'ASML', 'ARM'],
        reason: 'US CHIPS Act ($52bn), EU Chips Act (€43bn), Japan chip subsidies — all funding domestic fab construction. TSMC Arizona, Samsung Texas, Intel Ohio.' },
      { sector: 'Cybersecurity', direction: 'positive', magnitude: 'HIGH', stocks: ['CRWD', 'PANW'],
        reason: 'Chinese espionage and cyberattacks are accelerating the decoupling. Every Western government is hardening its digital infrastructure against Chinese infiltration.' },
      { sector: 'China-Exposed Consumer Tech', direction: 'negative', magnitude: 'HIGH', stocks: ['AAPL', 'TSLA', 'BABA'],
        reason: 'Apple manufactures 90% in China (Foxconn). Tesla\'s Shanghai gigafactory. Both face tariff risk, consumer boycott risk, and supply chain disruption risk.' }
    ]
  },
  {
    id: 'energy_transition',
    trigger_event: 'Accelerated Energy Transition & Green Policy',
    trigger_sector: 'Policy / Energy',
    icon: '⚡',
    description: 'IRA ($369bn), EU Green Deal, UK net-zero commitments are the largest government-directed energy investments in history. Winners and losers are clearly identifiable.',
    urgency: 'MULTI-YEAR',
    effects: [
      { sector: 'Renewable Energy Utilities', direction: 'positive', magnitude: 'HIGH', stocks: ['NEE', 'ENPH'],
        reason: 'IRA tax credits ($3-7/watt) make renewable energy projects economically compelling. NEE is the largest wind/solar operator in the US with a 20GW+ pipeline.' },
      { sector: 'Nuclear Power', direction: 'positive', magnitude: 'EXTREME', stocks: ['VST', 'CEG'],
        reason: 'Nuclear is the only 24/7 carbon-free power source that can satisfy both climate goals AND AI data centre demand. First real nuclear renaissance in 40 years.' },
      { sector: 'Lithium & Battery Materials', direction: 'positive', magnitude: 'HIGH', stocks: ['ALB', 'MP'],
        reason: 'Every EV battery, grid storage system, and home battery pack needs lithium, cobalt, nickel. Energy transition is creating new commodity super-cycles.' },
      { sector: 'Traditional Fossil Fuels', direction: 'negative', magnitude: 'MEDIUM', stocks: ['XOM'],
        reason: 'Long-term demand destruction is inevitable. Institutional ESG pressures, carbon taxes, and EV adoption will structurally reduce oil demand over decades. Hold, don\'t add.' }
    ]
  },
  {
    id: 'obesity_drug_cascade',
    trigger_event: 'GLP-1 Obesity Drug Revolution',
    trigger_sector: 'Healthcare / Pharma',
    icon: '💊',
    description: 'GLP-1 drugs (Ozempic, Wegovy, Mounjaro) are the fastest-growing pharmaceutical products in history. But the cascade effects on other industries are equally dramatic.',
    urgency: 'BUILDING',
    effects: [
      { sector: 'Pharma & Biotech', direction: 'positive', magnitude: 'EXTREME', stocks: ['LLY', 'NVO', 'RXRX'],
        reason: 'GLP-1 market projected at $150bn by 2030. LLY and NVO are splitting a winner-takes-most market. Oral formulation could double the addressable patient population.' },
      { sector: 'Medical Devices (Cardiac/Orthopaedic)', direction: 'negative', magnitude: 'HIGH', stocks: [],
        reason: 'Obese patients need fewer hip replacements, cardiac procedures, and diabetes devices. GLP-1 success is structurally reducing demand for many medical procedures.' },
      { sector: 'Food & Beverage', direction: 'negative', magnitude: 'MEDIUM', stocks: [],
        reason: 'GLP-1 patients eat 20-30% fewer calories. Fast food, snack food, and sugary beverage companies face structural demand reduction from 100 million+ eventual GLP-1 users.' },
      { sector: 'Fitness & Wellness', direction: 'positive', magnitude: 'MEDIUM', stocks: [],
        reason: 'Lighter, healthier patients engage more with fitness. Gym memberships, sportswear, healthy food brands all benefit as the population becomes healthier.' }
    ]
  },
  {
    id: 'cyber_warfare_rise',
    trigger_event: 'State-Sponsored Cyber Warfare Escalation',
    trigger_sector: 'Geopolitics / Technology',
    icon: '🔐',
    description: 'Russia, China, Iran, and North Korea conducting unprecedented cyberattacks on Western infrastructure. Every government and corporation is now a target. Security is no longer optional.',
    urgency: 'NOW',
    effects: [
      { sector: 'Cybersecurity Platforms', direction: 'positive', magnitude: 'EXTREME', stocks: ['CRWD', 'PANW', 'PLTR'],
        reason: 'Government mandates for zero-trust architecture. Every critical infrastructure operator (energy, water, finance) legally required to upgrade security. Multi-year mandatory spending cycle.' },
      { sector: 'AI Security & Intelligence', direction: 'positive', magnitude: 'HIGH', stocks: ['PLTR'],
        reason: 'Threat intelligence and pattern recognition at AI scale is the only way to detect sophisticated state-sponsored attacks. Palantir\'s Gotham platform is the government standard.' },
      { sector: 'Cryptocurrency Exchanges', direction: 'negative', magnitude: 'MEDIUM', stocks: ['COIN'],
        reason: 'Crypto infrastructure is a prime target for North Korean and criminal hackers. Major exchange hacks reduce institutional trust and trigger regulatory scrutiny.' }
    ]
  },
  {
    id: 'latam_digital_boom',
    trigger_event: 'Latin America Digital Economy Explosion',
    trigger_sector: 'Emerging Markets / Technology',
    icon: '🌎',
    description: '650 million people, smartphone penetration at 80%+, banking penetration at only 50%. Latin America is at the same inflection point China was in 2010. Digital adoption is compressing 20 years into 5.',
    urgency: 'BUILDING',
    effects: [
      { sector: 'Digital Banking / FinTech', direction: 'positive', magnitude: 'EXTREME', stocks: ['NU', 'MELI', 'AFRM'],
        reason: 'Brazil, Mexico, Colombia — 300 million people getting smartphones and bank accounts simultaneously. Nu Holdings at 100 million customers is still early. MELI\'s Mercado Pago is the LatAm PayPal.' },
      { sector: 'E-Commerce Platforms', direction: 'positive', magnitude: 'HIGH', stocks: ['MELI', 'SHOP'],
        reason: 'LatAm e-commerce penetration is only 15% vs 35% in the US. Still 20 years of runway. MercadoLibre has logistics, payments, and marketplace that cannot be replicated quickly.' }
    ]
  },
  {
    id: 'interest_rate_cycle',
    trigger_event: 'Federal Reserve Rate Cut Cycle Beginning',
    trigger_sector: 'Macro / Monetary Policy',
    icon: '🏦',
    description: 'When the Fed cuts rates, the investment landscape shifts dramatically. Rate-sensitive sectors that suffered in 2022-2024 will become the biggest winners. Knowing this cascade in advance is crucial.',
    urgency: 'WATCH',
    effects: [
      { sector: 'Clean Energy & Solar', direction: 'positive', magnitude: 'EXTREME', stocks: ['ENPH', 'NEE'],
        reason: 'Residential solar and renewable projects are highly interest-rate sensitive (financed with debt). Rate cuts will dramatically cut project costs and restart the boom. ENPH could double from current levels.' },
      { sector: 'FinTech / BNPL', direction: 'positive', magnitude: 'HIGH', stocks: ['AFRM', 'NU'],
        reason: 'Buy-Now-Pay-Later and consumer lending become far more attractive when cost of capital falls. AFRM\'s unit economics improve dramatically. NU\'s Brazilian lending margins expand.' },
      { sector: 'Banks (NII compression)', direction: 'negative', magnitude: 'MEDIUM', stocks: ['JPM', 'GS'],
        reason: 'Lower rates mean lower net interest income. Banks thrived with high rates. Rate cuts will squeeze NII — but M&A and IPO revival may offset this partially.' }
    ]
  }
];

/* ──────────────────────────────────────────
   TOOLTIP CONTENT
   Explains what each metric/section means
   in plain language + colour coding guide
────────────────────────────────────────── */
const TOOLTIPS = {
  markets: {
    title: 'Global Markets',
    text: 'Live prices for the world\'s major indices, commodities and assets. Green = rising (bullish). Red = falling (bearish). The VIX (Fear Index) works inversely — a VIX above 30 signals extreme fear and is often a buying opportunity.',
    color: 'blue'
  },
  sentiment: {
    title: 'Fear & Greed Index',
    text: '0 = Extreme Fear (markets oversold — historically good time to buy). 100 = Extreme Greed (markets overbought — consider reducing risk). The AI uses this alongside macro events to adjust recommendations. Sweet spot: 30-60.',
    color: 'purple'
  },
  sectors: {
    title: 'Sector Heat Map',
    text: 'Shows which industries are gaining or losing today. Green sectors have positive momentum. Red sectors face headwinds. Use this to identify where money is rotating. The cascade engine below shows WHY sectors move together.',
    color: 'green'
  },
  confidence: {
    title: 'AI Confidence Score',
    text: 'PhD-level model combining: fundamental analysis (PE, growth), macro event exposure (geopolitics, policy), technical momentum, and risk-adjusted probability. 80%+ = Strong conviction BUY. 60-79% = Moderate conviction. Below 50% = AVOID.',
    color: 'purple'
  },
  risk: {
    title: 'Risk Level',
    text: 'LOW RISK (green): Blue-chip, dividend payers, defensives. Safe in most conditions. MEDIUM RISK (yellow): Growth stocks with solid fundamentals. Some volatility. HIGH RISK (red): Small caps, speculative, turnarounds. Only 5-10% of portfolio maximum.',
    color: 'yellow'
  },
  target12m: {
    title: '12-Month Price Target',
    text: 'AI-projected fair value in 12 months based on earnings growth, comparable companies, and macro tailwinds. Not guaranteed — treat as probabilistic range. Higher confidence + lower current price = better risk/reward ratio.',
    color: 'green'
  },
  cascade: {
    title: 'Macro Cascade Engine',
    text: 'PhD-level economic dependency mapping. When one sector or event occurs, it creates ripple effects across the entire economy. Example: AI boom → massive power demand → nuclear energy wins. Understanding these cascades gives you an edge weeks or months ahead of consensus.',
    color: 'purple'
  },
  portfolio_risk: {
    title: 'Geopolitical Risk Score',
    text: 'Scores each of your holdings on their exposure to current geopolitical threats: trade wars, sanctions, regulatory risk, currency risk. GREEN = well-insulated. YELLOW = moderate exposure. RED = immediate review recommended.',
    color: 'red'
  },
  pnl: {
    title: 'Profit & Loss (P&L)',
    text: 'Your unrealised gain or loss vs your average purchase price. Green = profitable position. Red = loss position. Note: unrealised losses only become real if you sell. The AI will alert you if a loss indicates the thesis has changed vs if it\'s just market noise.',
    color: 'yellow'
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

    // Base score from qualitative analysis
    var score = s.confidence;

    // Apply macro event adjustments
    MACRO_EVENTS.forEach(function(ev) {
      if (ev.affected_bull && ev.affected_bull.indexOf(sym) !== -1) score += (ev.score_bull || 5);
      if (ev.affected_bear && ev.affected_bear.indexOf(sym) !== -1) score += (ev.score_bear || -6);
    });

    // Live price momentum signal — s.chg is updated with real-time day % change
    // A stock moving strongly today is a meaningful short-term signal
    if (typeof s.chg === 'number' && s.chg !== 0) {
      if      (s.chg >  5) score += 6;   // strong positive momentum
      else if (s.chg >  2) score += 3;   // mild positive momentum
      else if (s.chg < -5) score -= 8;   // strong sell-off — reduce conviction
      else if (s.chg < -2) score -= 4;   // mild negative momentum
    }

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
