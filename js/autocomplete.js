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
  { sym:'NLR',   name:'VanEck Uranium+Nuclear Energy ETF',ex:'NYSE' },
  { sym:'ACWI',  name:'iShares MSCI ACWI ETF',           ex:'NASDAQ'},
  { sym:'EEM',   name:'iShares MSCI Emerging Markets ETF',ex:'NYSE' },
  { sym:'EWU',   name:'iShares MSCI United Kingdom ETF',  ex:'NYSE' },
  { sym:'EWG',   name:'iShares MSCI Germany ETF',         ex:'NYSE' },
  { sym:'EWQ',   name:'iShares MSCI France ETF',          ex:'NYSE' },
  { sym:'EWI',   name:'iShares MSCI Italy ETF',           ex:'NYSE' },
  { sym:'EWP',   name:'iShares MSCI Spain ETF',           ex:'NYSE' },
  { sym:'EWJ',   name:'iShares MSCI Japan ETF',           ex:'NYSE' },
  { sym:'MCHI',  name:'iShares MSCI China ETF',           ex:'NASDAQ'},
  { sym:'INDA',  name:'iShares MSCI India ETF',           ex:'CBOE' },
  { sym:'IAU',   name:'iShares Gold Trust ETF',           ex:'NYSE' },
  { sym:'SGOL',  name:'Aberdeen Standard Physical Gold ETF',ex:'NYSE'},
  { sym:'SIVR',  name:'Aberdeen Standard Physical Silver ETF',ex:'NYSE'},
  { sym:'PPLT',  name:'Aberdeen Standard Physical Platinum ETF',ex:'NYSE'},

  /* ── UK-Listed ETFs (LSE, Trading 212 accessible) ── */
  /* Physical Precious Metals */
  { sym:'RMAP.L', name:'Royal Mint Responsibly Sourced Physical Gold ETC', ex:'LSE' },
  { sym:'RMAU.L', name:'Royal Mint Physical Gold ETC',                      ex:'LSE' },
  { sym:'IGLN.L', name:'iShares Physical Gold ETC',                         ex:'LSE' },
  { sym:'ISLN.L', name:'iShares Physical Silver ETC',                       ex:'LSE' },
  { sym:'IPDM.L', name:'iShares Physical Platinum ETC',                     ex:'LSE' },
  { sym:'IPAL.L', name:'iShares Physical Palladium ETC',                    ex:'LSE' },
  { sym:'PHAU.L', name:'WisdomTree Physical Gold ETC',                      ex:'LSE' },
  { sym:'PHAG.L', name:'WisdomTree Physical Silver ETC',                    ex:'LSE' },
  { sym:'PHPT.L', name:'WisdomTree Physical Platinum ETC',                  ex:'LSE' },
  { sym:'PHPD.L', name:'WisdomTree Physical Palladium ETC',                 ex:'LSE' },
  { sym:'PHGP.L', name:'WisdomTree Physical Gold — GBP Daily Hedged',       ex:'LSE' },
  { sym:'SGLD.L', name:'Invesco Physical Gold ETC',                         ex:'LSE' },
  { sym:'WGLD.L', name:'WisdomTree Core Physical Gold ETC',                 ex:'LSE' },
  { sym:'BULL.L', name:'WisdomTree Gold 2x Daily Leveraged ETC',            ex:'LSE' },
  { sym:'SLVR.L', name:'WisdomTree Silver 2x Daily Leveraged ETC',          ex:'LSE' },

  /* Global Equity — World / Multi-Asset */
  { sym:'VWRL.L', name:'Vanguard FTSE All-World UCITS ETF (USD, Dist.)',    ex:'LSE' },
  { sym:'VWRP.L', name:'Vanguard FTSE All-World UCITS ETF (Acc.)',          ex:'LSE' },
  { sym:'SWDA.L', name:'iShares Core MSCI World UCITS ETF',                 ex:'LSE' },
  { sym:'IWDA.L', name:'iShares Core MSCI World UCITS ETF (USD)',           ex:'LSE' },
  { sym:'IWDG.L', name:'iShares Core MSCI World UCITS ETF (GBP Hedged)',    ex:'LSE' },
  { sym:'XDWD.L', name:'Xtrackers MSCI World Swap UCITS ETF',               ex:'LSE' },
  { sym:'HMWD.L', name:'HSBC MSCI World UCITS ETF',                         ex:'LSE' },
  { sym:'ISAC.L', name:'iShares MSCI ACWI UCITS ETF',                       ex:'LSE' },
  { sym:'WLDS.L', name:'iShares MSCI World Small Cap UCITS ETF',            ex:'LSE' },

  /* S&P 500 */
  { sym:'VUSA.L', name:'Vanguard S&P 500 UCITS ETF (USD, Dist.)',           ex:'LSE' },
  { sym:'VUAG.L', name:'Vanguard S&P 500 UCITS ETF (Acc.)',                 ex:'LSE' },
  { sym:'CSPX.L', name:'iShares Core S&P 500 UCITS ETF (USD)',              ex:'LSE' },
  { sym:'CSP1.L', name:'iShares Core S&P 500 UCITS ETF (GBP)',              ex:'LSE' },
  { sym:'IUSA.L', name:'iShares S&P 500 UCITS ETF (GBP)',                   ex:'LSE' },
  { sym:'SPXP.L', name:'Invesco S&P 500 UCITS ETF',                         ex:'LSE' },
  { sym:'XDPG.L', name:'Xtrackers S&P 500 Swap UCITS ETF (GBP Hedged)',     ex:'LSE' },
  { sym:'HSPX.L', name:'HSBC S&P 500 UCITS ETF',                            ex:'LSE' },
  { sym:'500.L',  name:'L&G Core Global Equity (50/50) UCITS ETF',          ex:'LSE' },

  /* NASDAQ / Tech */
  { sym:'EQQQ.L', name:'Invesco EQQQ NASDAQ-100 UCITS ETF',                 ex:'LSE' },
  { sym:'NQDS.L', name:'Invesco NASDAQ-100 Daily Swap UCITS ETF',           ex:'LSE' },
  { sym:'CNDX.L', name:'iShares NASDAQ 100 UCITS ETF (GBP)',                ex:'LSE' },
  { sym:'INQQ.L', name:'iShares NASDAQ 100 UCITS ETF (USD)',                ex:'LSE' },

  /* UK Equity */
  { sym:'ISF.L',  name:'iShares Core FTSE 100 UCITS ETF (GBP)',             ex:'LSE' },
  { sym:'VUKE.L', name:'Vanguard FTSE 100 UCITS ETF (GBP)',                 ex:'LSE' },
  { sym:'VMID.L', name:'Vanguard FTSE 250 UCITS ETF (GBP)',                 ex:'LSE' },
  { sym:'IUKD.L', name:'iShares UK Dividend UCITS ETF (GBP)',               ex:'LSE' },
  { sym:'IUKP.L', name:'iShares UK Property UCITS ETF',                     ex:'LSE' },
  { sym:'GBDV.L', name:'SPDR S&P UK Dividend Aristocrats ETF',              ex:'LSE' },
  { sym:'XUKX.L', name:'Xtrackers FTSE 100 UCITS ETF',                      ex:'LSE' },

  /* Europe Equity */
  { sym:'VERE.L', name:'Vanguard FTSE Developed Europe UCITS ETF',          ex:'LSE' },
  { sym:'VEUR.L', name:'Vanguard FTSE Developed Europe ex UK UCITS ETF',    ex:'LSE' },
  { sym:'IMEU.L', name:'iShares Core MSCI Europe UCITS ETF',                ex:'LSE' },
  { sym:'EXW1.L', name:'iShares Core EURO STOXX 50 UCITS ETF',              ex:'LSE' },
  { sym:'XESC.L', name:'Xtrackers Euro Stoxx 50 Swap UCITS ETF',            ex:'LSE' },

  /* Emerging Markets */
  { sym:'VFEM.L', name:'Vanguard FTSE Emerging Markets UCITS ETF',          ex:'LSE' },
  { sym:'EMIM.L', name:'iShares Core MSCI EM IMI UCITS ETF',                ex:'LSE' },
  { sym:'VAPX.L', name:'Vanguard FTSE Developed Asia Pacific ex Japan ETF', ex:'LSE' },
  { sym:'IAPD.L', name:'iShares Asia Pacific Dividend UCITS ETF',           ex:'LSE' },

  /* US Sector ETFs (LSE-listed) */
  { sym:'INRG.L', name:'iShares Global Clean Energy UCITS ETF (GBP)',       ex:'LSE' },
  { sym:'IUIT.L', name:'iShares S&P 500 Information Technology UCITS ETF',  ex:'LSE' },
  { sym:'IUHC.L', name:'iShares S&P 500 Health Care UCITS ETF',             ex:'LSE' },
  { sym:'IUFS.L', name:'iShares S&P 500 Financials UCITS ETF',              ex:'LSE' },
  { sym:'IUES.L', name:'iShares S&P 500 Energy UCITS ETF',                  ex:'LSE' },
  { sym:'IUCD.L', name:'iShares S&P 500 Consumer Disc UCITS ETF',           ex:'LSE' },
  { sym:'IDVY.L', name:'iShares Euro Dividend UCITS ETF',                   ex:'LSE' },
  { sym:'IUKD.L', name:'iShares UK Dividend UCITS ETF',                     ex:'LSE' },
  { sym:'FUSD.L', name:'Fidelity US Quality Income UCITS ETF',              ex:'LSE' },
  { sym:'FUSA.L', name:'Fidelity US Quality Factor UCITS ETF',              ex:'LSE' },

  /* Bond & Fixed Income (LSE) */
  { sym:'IGLT.L', name:'iShares Core UK Gilts UCITS ETF',                   ex:'LSE' },
  { sym:'IDGB.L', name:'iShares Core UK Government Bond UCITS ETF',         ex:'LSE' },
  { sym:'SLXX.L', name:'iShares Core £ Corp Bond UCITS ETF',                ex:'LSE' },
  { sym:'FLRG.L', name:'iShares £ Floating Rate Bond UCITS ETF',            ex:'LSE' },
  { sym:'ITPS.L', name:'iShares $ TIPS UCITS ETF (GBP Hedged)',             ex:'LSE' },
  { sym:'IBTM.L', name:'iShares $ Treasury Bond 7-10yr UCITS ETF',          ex:'LSE' },
  { sym:'VGOV.L', name:'Vanguard UK Government Bond UCITS ETF',             ex:'LSE' },
  { sym:'CORP.L', name:'Vanguard USD Corporate Bond UCITS ETF',             ex:'LSE' },
  { sym:'VUCP.L', name:'Vanguard USD Corp Bond UCITS ETF (GBP Hedged)',     ex:'LSE' },

  /* Thematic & Alternatives (LSE) */
  { sym:'IBIT.L', name:'iShares Bitcoin ETP',                               ex:'LSE' },
  { sym:'BTCE.L', name:'ETC Group Core Bitcoin ETP',                        ex:'LSE' },
  { sym:'ETHE.L', name:'ETC Group Core Ethereum ETP',                       ex:'LSE' },
  { sym:'ROBO.L', name:'ROBO Global Robotics and Automation ETF',           ex:'LSE' },
  { sym:'CYBG.L', name:'L&G Cyber Security UCITS ETF',                      ex:'LSE' },
  { sym:'AIAI.L', name:'L&G Artificial Intelligence UCITS ETF',             ex:'LSE' },
  { sym:'AIAG.L', name:'iShares Automation & Robotics UCITS ETF',           ex:'LSE' },
  { sym:'BATG.L', name:'L&G Battery Value-Chain UCITS ETF',                 ex:'LSE' },
  { sym:'KROP.L', name:'L&G Clean Water UCITS ETF',                         ex:'LSE' },
  { sym:'WOOD.L', name:'iShares Global Timber & Forestry UCITS ETF',        ex:'LSE' },
  { sym:'WDSC.L', name:'iShares MSCI World Small Cap UCITS ETF (Acc.)',     ex:'LSE' },
  { sym:'RENW.L', name:'L&G Renewable Energy 100 UCITS ETF',               ex:'LSE' },
  { sym:'BATT.L', name:'Amundi Electric Vehicles & Future Mobility ETF',    ex:'LSE' },
  { sym:'HTEC.L', name:'L&G Global Health & Pharmaceuticals UCITS ETF',    ex:'LSE' },
  { sym:'VEVE.L', name:'Vanguard FTSE Developed World UCITS ETF',           ex:'LSE' },
  { sym:'HMSD.L', name:'HSBC MSCI Sustainable World ETF',                   ex:'LSE' },
  { sym:'UKRE.L', name:'iShares UK Property UCITS ETF',                     ex:'LSE' },

  /* UK Mid/Small Cap Stocks (LSE) */
  { sym:'HLMA.L', name:'Halma PLC',                                         ex:'LSE' },
  { sym:'DPLM.L', name:'Diploma PLC',                                       ex:'LSE' },
  { sym:'RTO.L',  name:'Rentokil Initial PLC',                              ex:'LSE' },
  { sym:'IMI.L',  name:'IMI PLC',                                           ex:'LSE' },
  { sym:'WEIR.L', name:'Weir Group PLC',                                    ex:'LSE' },
  { sym:'SXS.L',  name:'Spectris PLC',                                      ex:'LSE' },
  { sym:'OXIG.L', name:'Oxford Instruments PLC',                            ex:'LSE' },
  { sym:'BME.L',  name:'B&M European Value Retail SA',                      ex:'LSE' },
  { sym:'NXT.L',  name:'Next PLC',                                          ex:'LSE' },
  { sym:'KGF.L',  name:'Kingfisher PLC (B&Q / Screwfix)',                   ex:'LSE' },
  { sym:'MKS.L',  name:'Marks & Spencer Group PLC',                         ex:'LSE' },
  { sym:'SBRY.L', name:'J Sainsbury PLC',                                   ex:'LSE' },
  { sym:'OCDO.L', name:'Ocado Group PLC',                                   ex:'LSE' },
  { sym:'FLTR.L', name:'Flutter Entertainment PLC',                         ex:'LSE' },
  { sym:'ENT.L',  name:'Entain PLC',                                        ex:'LSE' },
  { sym:'GRG.L',  name:'Greggs PLC',                                        ex:'LSE' },
  { sym:'TUI.L',  name:'TUI AG',                                            ex:'LSE' },
  { sym:'JD.L',   name:'JD Sports Fashion PLC',                             ex:'LSE' },
  { sym:'MONY.L', name:'MoneySupermarket Group PLC',                        ex:'LSE' },
  { sym:'AUTO.L', name:'Auto Trader Group PLC',                             ex:'LSE' },
  { sym:'SEGRO.L',name:'SEGRO PLC (Industrial REIT)',                       ex:'LSE' },
  { sym:'BBOX.L', name:'Tritax Big Box REIT PLC',                           ex:'LSE' },
  { sym:'LAND.L', name:'Land Securities Group PLC',                         ex:'LSE' },
  { sym:'BLND.L', name:'British Land Company PLC',                          ex:'LSE' },
  { sym:'PSH.L',  name:'Pershing Square Holdings Ltd',                      ex:'LSE' },
  { sym:'SMT.L',  name:'Scottish Mortgage Investment Trust',                ex:'LSE' },
  { sym:'ATT.L',  name:'Artemis Income Fund',                               ex:'LSE' },
  { sym:'PETS.L', name:'Pets at Home Group PLC',                            ex:'LSE' },
  { sym:'ECM.L',  name:'Electrocomponents PLC (RS Group)',                  ex:'LSE' },
  { sym:'RS1.L',  name:'RS Group PLC',                                      ex:'LSE' },
  { sym:'MNDI.L', name:'Mondi PLC',                                         ex:'LSE' },
  { sym:'PHNX.L', name:'Phoenix Group Holdings',                            ex:'LSE' },
  { sym:'COB.L',  name:'Cobham Advanced Electronic Systems',                ex:'LSE' },
  { sym:'QQ.L',   name:'Quilter PLC',                                       ex:'LSE' },
  { sym:'SDR.L',  name:'Schroders PLC',                                     ex:'LSE' },
  { sym:'ABF.L',  name:'Associated British Foods PLC',                      ex:'LSE' },
  { sym:'CPG.L',  name:'Compass Group PLC',                                 ex:'LSE' },
  { sym:'DCC.L',  name:'DCC PLC',                                           ex:'LSE' },
  { sym:'III.L',  name:'3i Group PLC',                                      ex:'LSE' },
  { sym:'HLN.L',  name:'Haleon PLC',                                        ex:'LSE' },
  { sym:'ZAL.L',  name:'Zalando SE (LSE)',                                  ex:'LSE' },
  { sym:'AIR.L',  name:'Airtel Africa PLC',                                 ex:'LSE' },
  { sym:'MTRO.L', name:'Metro Bank Holdings PLC',                           ex:'LSE' },

  /* UK Blue Chip (LSE) ── */
  { sym:'RR.L',   name:'Rolls-Royce Holdings',            ex:'LSE'  },
  { sym:'BA.L',   name:'BAE Systems PLC',                 ex:'LSE'  },
  { sym:'HSBA.L', name:'HSBC Holdings PLC',               ex:'LSE'  },
  { sym:'LLOY.L', name:'Lloyds Banking Group',            ex:'LSE'  },
  { sym:'BARC.L', name:'Barclays PLC',                    ex:'LSE'  },
  { sym:'STAN.L', name:'Standard Chartered PLC',          ex:'LSE'  },
  { sym:'BP.L',   name:'BP plc',                          ex:'LSE'  },
  { sym:'SHEL.L', name:'Shell plc',                       ex:'LSE'  },
  { sym:'AZN.L',  name:'AstraZeneca PLC',                 ex:'LSE'  },
  { sym:'GSK.L',  name:'GSK plc (GlaxoSmithKline)',       ex:'LSE'  },
  { sym:'ULVR.L', name:'Unilever PLC',                    ex:'LSE'  },
  { sym:'BATS.L', name:'British American Tobacco',        ex:'LSE'  },
  { sym:'DGE.L',  name:'Diageo PLC',                      ex:'LSE'  },
  { sym:'NG.L',   name:'National Grid PLC',               ex:'LSE'  },
  { sym:'VOD.L',  name:'Vodafone Group PLC',              ex:'LSE'  },
  { sym:'BT-A.L', name:'BT Group PLC',                    ex:'LSE'  },
  { sym:'REL.L',  name:'RELX Group PLC',                  ex:'LSE'  },
  { sym:'EXPN.L', name:'Experian PLC',                    ex:'LSE'  },
  { sym:'PRU.L',  name:'Prudential PLC',                  ex:'LSE'  },
  { sym:'LSEG.L', name:'LSEG (London Stock Exchange Group)',ex:'LSE' },
  { sym:'IMB.L',  name:'Imperial Brands PLC',             ex:'LSE'  },
  { sym:'SGE.L',  name:'Sage Group PLC',                  ex:'LSE'  },
  { sym:'CRH.L',  name:'CRH PLC',                         ex:'LSE'  },
  { sym:'AAL.L',  name:'Anglo American PLC',              ex:'LSE'  },
  { sym:'GLEN.L', name:'Glencore PLC',                    ex:'LSE'  },
  { sym:'LGEN.L', name:'Legal & General Group',           ex:'LSE'  },
  { sym:'AV.L',   name:'Aviva PLC',                       ex:'LSE'  },
  { sym:'TSCO.L', name:'Tesco PLC',                       ex:'LSE'  },
  { sym:'WPP.L',  name:'WPP PLC',                         ex:'LSE'  },
  { sym:'MNG.L',  name:'M&G PLC',                         ex:'LSE'  },
  { sym:'RKT.L',  name:'Reckitt Benckiser Group',         ex:'LSE'  },
  { sym:'FERG.L', name:'Ferguson Enterprises',            ex:'LSE'  },
  { sym:'ABF.L',  name:'Associated British Foods',        ex:'LSE'  },
  { sym:'AUTO.L', name:'Auto Trader Group',               ex:'LSE'  },
  { sym:'III.L',  name:'3i Group PLC',                    ex:'LSE'  },
  { sym:'SMT.L',  name:'Scottish Mortgage Investment Trust',ex:'LSE' },
  { sym:'BVIC.L', name:'Britvic PLC',                     ex:'LSE'  },
  { sym:'MNDI.L', name:'Mondi PLC',                       ex:'LSE'  },
  { sym:'INF.L',  name:'Informa PLC',                     ex:'LSE'  },
  { sym:'IAG.L',  name:'International Airlines Group',    ex:'LSE'  },
  { sym:'EZJ.L',  name:'easyJet PLC',                     ex:'LSE'  },

  /* ── UK/Int\'l stocks also listed in US (ADRs / dual-listed) ── */
  { sym:'AZN',    name:'AstraZeneca PLC (NASDAQ ADR)',    ex:'NASDAQ'},
  { sym:'SHEL',   name:'Shell plc (NYSE)',                ex:'NYSE'  },
  { sym:'BP',     name:'BP plc (NYSE ADR)',               ex:'NYSE'  },
  { sym:'GSK',    name:'GSK plc (NYSE ADR)',              ex:'NYSE'  },
  { sym:'BCS',    name:'Barclays PLC (NYSE ADR)',         ex:'NYSE'  },
  { sym:'HBC',    name:'HSBC Holdings (NYSE ADR)',        ex:'NYSE'  },
  { sym:'UL',     name:'Unilever PLC (NYSE ADR)',         ex:'NYSE'  },
  { sym:'BTI',    name:'British American Tobacco (NYSE ADR)',ex:'NYSE'},
  { sym:'DEO',    name:'Diageo PLC (NYSE ADR)',           ex:'NYSE'  },
  { sym:'NGG',    name:'National Grid (NYSE ADR)',        ex:'NYSE'  },
  { sym:'VOD',    name:'Vodafone Group (NASDAQ ADR)',     ex:'NASDAQ'},
  { sym:'SAP',    name:'SAP SE (NYSE ADR)',               ex:'NYSE'  },
  { sym:'NVS',    name:'Novartis AG (NYSE ADR)',          ex:'NYSE'  },
  { sym:'RHHBY',  name:'Roche Holdings (OTC ADR)',        ex:'OTC'   },
  { sym:'NSRGY',  name:'Nestlé SA (OTC ADR)',             ex:'OTC'   },
  { sym:'EADSY',  name:'Airbus SE (OTC ADR)',             ex:'OTC'   },
  { sym:'BAYRY',  name:'Bayer AG (OTC ADR)',              ex:'OTC'   },

  /* ── European Large Cap (local tickers) ── */
  { sym:'SAP.DE',  name:'SAP SE',                         ex:'XETRA' },
  { sym:'SIE.DE',  name:'Siemens AG',                     ex:'XETRA' },
  { sym:'BMW.DE',  name:'BMW AG',                         ex:'XETRA' },
  { sym:'MBG.DE',  name:'Mercedes-Benz Group',            ex:'XETRA' },
  { sym:'VOW3.DE', name:'Volkswagen AG (Preferred)',       ex:'XETRA' },
  { sym:'BAYN.DE', name:'Bayer AG',                       ex:'XETRA' },
  { sym:'ALV.DE',  name:'Allianz SE',                     ex:'XETRA' },
  { sym:'BAS.DE',  name:'BASF SE',                        ex:'XETRA' },
  { sym:'DTE.DE',  name:'Deutsche Telekom AG',            ex:'XETRA' },
  { sym:'MUV2.DE', name:'Munich Re (Muenchener Rueck)',   ex:'XETRA' },
  { sym:'DB1.DE',  name:'Deutsche Börse AG',              ex:'XETRA' },
  { sym:'AIR.PA',  name:'Airbus SE',                      ex:'Euronext Paris' },
  { sym:'MC.PA',   name:'LVMH Moët Hennessy Louis Vuitton',ex:'Euronext Paris'},
  { sym:'TTE.PA',  name:'TotalEnergies SE',               ex:'Euronext Paris' },
  { sym:'SAN.PA',  name:'Sanofi SA',                      ex:'Euronext Paris' },
  { sym:'BNP.PA',  name:'BNP Paribas SA',                 ex:'Euronext Paris' },
  { sym:'OR.PA',   name:'L\'Oréal SA',                    ex:'Euronext Paris' },
  { sym:'RI.PA',   name:'Pernod Ricard SA',               ex:'Euronext Paris' },
  { sym:'CAP.PA',  name:'Capgemini SE',                   ex:'Euronext Paris' },
  { sym:'DSY.PA',  name:'Dassault Systèmes SE',           ex:'Euronext Paris' },
  { sym:'SU.PA',   name:'Schneider Electric SE',          ex:'Euronext Paris' },
  { sym:'HO.PA',   name:'Thales SA',                      ex:'Euronext Paris' },
  { sym:'SGO.PA',  name:'Compagnie de Saint-Gobain',      ex:'Euronext Paris' },
  { sym:'ASML.AS', name:'ASML Holding NV (AEX)',          ex:'Euronext Amsterdam'},
  { sym:'PHIA.AS', name:'Philips NV',                     ex:'Euronext Amsterdam'},
  { sym:'NESN.SW', name:'Nestlé SA',                      ex:'SIX Swiss Exchange'},
  { sym:'ROG.SW',  name:'Roche Holdings AG',              ex:'SIX Swiss Exchange'},
  { sym:'NOVN.SW', name:'Novartis AG',                    ex:'SIX Swiss Exchange'},
  { sym:'ABBN.SW', name:'ABB Ltd',                        ex:'SIX Swiss Exchange'},
  { sym:'UBSG.SW', name:'UBS Group AG',                   ex:'SIX Swiss Exchange'},
  { sym:'IBE.MC',  name:'Iberdrola SA',                   ex:'BME Madrid'       },
  { sym:'SAN.MC',  name:'Banco Santander SA',             ex:'BME Madrid'       },
  { sym:'ENEL.MI', name:'Enel SpA',                       ex:'Borsa Italiana'   },
  { sym:'UCG.MI',  name:'UniCredit SpA',                  ex:'Borsa Italiana'   },
  { sym:'ERG.MI',  name:'ERG SpA',                        ex:'Borsa Italiana'   },

  /* ── Chinese Tech & Consumer ADRs ── */
  { sym:'BIDU',   name:'Baidu Inc (ADR)',                  ex:'NASDAQ'},
  { sym:'NTES',   name:'NetEase Inc (ADR)',                ex:'NASDAQ'},
  { sym:'TCOM',   name:'Trip.com Group (ADR)',             ex:'NASDAQ'},
  { sym:'BILI',   name:'Bilibili Inc (ADR)',               ex:'NASDAQ'},
  { sym:'IQ',     name:'iQIYI Inc (ADR)',                  ex:'NASDAQ'},
  { sym:'YUMC',   name:'Yum China Holdings',              ex:'NYSE'  },
  { sym:'VIPS',   name:'Vipshop Holdings (ADR)',           ex:'NYSE'  },
  { sym:'TME',    name:'Tencent Music Entertainment (ADR)',ex:'NYSE'  },
  { sym:'HTHT',   name:'H World Group (Huazhu Hotels ADR)',ex:'NASDAQ'},
  { sym:'ZTO',    name:'ZTO Express (Cayman) ADR',         ex:'NYSE'  },
  { sym:'DIDI',   name:'DiDi Global ADR',                  ex:'OTC'   },

  /* ── Indian ADRs (NYSE/NASDAQ) ── */
  { sym:'INFY',   name:'Infosys Limited (ADR)',            ex:'NYSE'  },
  { sym:'WIT',    name:'Wipro Limited (ADR)',              ex:'NYSE'  },
  { sym:'HDB',    name:'HDFC Bank Limited (ADR)',          ex:'NYSE'  },
  { sym:'IBN',    name:'ICICI Bank Limited (ADR)',         ex:'NYSE'  },
  { sym:'RDY',    name:'Dr. Reddy\'s Laboratories (ADR)', ex:'NYSE'  },
  { sym:'WNS',    name:'WNS Holdings Limited (ADR)',       ex:'NYSE'  },
  { sym:'MTCL',   name:'Mastech Holdings (IT services)',   ex:'NYSE'  },
  { sym:'SIFY',   name:'Sify Technologies (ADR)',          ex:'NASDAQ'},
  { sym:'AZRE',   name:'Azure Power Global (ADR)',         ex:'NYSE'  },
  { sym:'REXI',   name:'Resource Capital Corp',            ex:'NYSE'  }
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
   CURRENCY HELPER
   Maps exchange / ticker suffix → symbol
════════════════════════════════════════ */
function getCurrencySymbol(sym, ex) {
  if (!sym) return '$';
  var upper = sym.toUpperCase();
  /* UK LSE stocks trade in GBp (pence) */
  if (upper.endsWith('.L'))  return 'p';
  /* European exchanges */
  if (upper.endsWith('.DE') || upper.endsWith('.PA') || upper.endsWith('.AS') ||
      upper.endsWith('.MC') || upper.endsWith('.MI') || upper.endsWith('.BR') ||
      upper.endsWith('.LS') || upper.endsWith('.HE'))  return '€';
  /* Swiss */
  if (upper.endsWith('.SW')) return 'CHF ';
  /* Exchange fallback */
  if (ex) {
    var exU = ex.toUpperCase();
    if (exU.indexOf('LSE') !== -1)   return 'p';
    if (exU.indexOf('XETRA') !== -1 || exU.indexOf('EURONEXT') !== -1 ||
        exU.indexOf('BORSA') !== -1 || exU.indexOf('BME') !== -1) return '€';
    if (exU.indexOf('SIX') !== -1)   return 'CHF ';
  }
  return '$';
}

/* ════════════════════════════════════════
   LIVE QUOTE FETCH (Yahoo Finance)
   Returns { price, chg, name } or null
════════════════════════════════════════ */
function fetchLiveQuote(sym) {
  /* Preserve original casing for international tickers (e.g. RR.L, AIR.PA) */
  var canonical = sym.replace(/^([a-zA-Z0-9]+)(\.[a-zA-Z]+)?$/, function(_, base, suffix) {
    return base.toUpperCase() + (suffix ? suffix.toUpperCase() : '');
  });
  return fetchStockPrices([canonical]).then(function(prices) {
    if (prices && prices[canonical]) {
      return prices[canonical];
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
        var currSym = getCurrencySymbol(s.sym, s.ex);
        priceHtml = '<span class="ac-price">' +
          currSym + p.price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}) +
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
            '<strong>' + getCurrencySymbol(stock.sym, stock.ex) + livePrice.price.toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</strong>' +
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
