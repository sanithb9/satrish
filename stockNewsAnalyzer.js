'use strict';

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */
const MODEL        = 'claude-sonnet-4-6';
const MAX_TOKENS   = 4096;
const MAX_ARTICLES = 20; // guard against accidentally huge inputs

const SYSTEM_PROMPT = `You are a stock market research assistant. Analyze the following news articles and identify:
1. Which specific stocks or sectors are affected
2. Whether the impact is POSITIVE or NEGATIVE
3. Urgency level:
   - 🔴 URGENT: Act within hours (major geopolitical events, surprise earnings, sudden regulations)
   - 🟡 SHORT-TERM: Watch this week (earnings reports, policy announcements, sector trends)
   - 🟢 LONG-TERM: Worth noting for portfolio strategy (industry shifts, demographic trends, technology changes)
4. A brief plain-English explanation of WHY (2-3 sentences max)

Respond in JSON format like this:
{
  "alerts": [
    {
      "stock_or_sector": "AAPL / Tech Sector / Oil & Gas",
      "action": "BUY" | "SELL" | "HOLD" | "WATCH",
      "urgency": "URGENT" | "SHORT_TERM" | "LONG_TERM",
      "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "reason": "Plain English explanation here",
      "source_headline": "The original news headline",
      "source_url": "URL to the article"
    }
  ],
  "market_summary": "A 2-3 sentence overall summary of the current market mood"
}

Important: Only include stocks/sectors where the news has a MEANINGFUL impact. Don't force connections. If nothing significant is happening, say so.`;

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function getApiKey() {
  var key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env file.');
  }
  return key;
}

function buildArticleList(articles) {
  return articles
    .slice(0, MAX_ARTICLES)
    .map(function(a, i) {
      return [
        'Article ' + (i + 1) + ':',
        'Headline: '    + (a.title       || 'N/A'),
        'Description: ' + (a.description || 'N/A'),
        'Source: '      + (a.source      || 'N/A'),
        'Published: '   + (a.publishedAt || 'N/A'),
        'URL: '         + (a.url         || 'N/A')
      ].join('\n');
    })
    .join('\n\n');
}

function extractJson(text) {
  /* Claude usually returns clean JSON but may occasionally wrap it in
     a markdown code block — strip that before parsing. */
  var stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(stripped);
}

/* ─────────────────────────────────────────
   MAIN EXPORT: analyzeNews()
───────────────────────────────────────── */

/**
 * Sends news articles to the Claude API for stock-impact analysis.
 *
 * @param {Array} articles - Array of article objects from newsMonitor.fetchLatestNews()
 *   Each article should have: title, description, source, publishedAt, url
 *
 * @returns {Promise<Object>} Parsed JSON response:
 *   {
 *     alerts: [{ stock_or_sector, action, urgency, sentiment, reason, source_headline, source_url }],
 *     market_summary: string
 *   }
 *
 * @throws {Error} if ANTHROPIC_API_KEY is missing or the API call fails
 */
async function analyzeNews(articles) {
  if (!Array.isArray(articles) || articles.length === 0) {
    return { alerts: [], market_summary: 'No articles provided for analysis.' };
  }

  var client  = new Anthropic({ apiKey: getApiKey() });
  var content = buildArticleList(articles);

  var message = await client.messages.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system:     SYSTEM_PROMPT,
    messages: [
      {
        role:    'user',
        content: 'Please analyse these ' + Math.min(articles.length, MAX_ARTICLES) +
                 ' news articles and return your JSON response:\n\n' + content
      }
    ]
  });

  var rawText = message.content && message.content[0] && message.content[0].text
    ? message.content[0].text
    : '';

  var parsed;
  try {
    parsed = extractJson(rawText);
  } catch (parseErr) {
    console.error('[stockNewsAnalyzer] JSON parse failed. Raw response:\n', rawText);
    throw new Error('Claude returned non-JSON response: ' + parseErr.message);
  }

  /* Ensure expected shape even if Claude omits a field */
  if (!parsed.alerts)         parsed.alerts         = [];
  if (!parsed.market_summary) parsed.market_summary = '';

  return parsed;
}

module.exports = { analyzeNews };
