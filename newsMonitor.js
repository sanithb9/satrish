'use strict';

require('dotenv').config();
const axios = require('axios');

/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */
const NEWS_API_BASE = 'https://newsapi.org/v2';

const GEOPOLITICAL_TERMS = [
  '"trade war"', '"sanctions"', '"tariffs"', '"geopolitical"',
  '"conflict"', '"central bank"', '"interest rate"', '"regulation"'
];

const CORPORATE_TERMS = [
  '"earnings"', '"merger"', '"acquisition"', '"IPO"',
  '"bankruptcy"', '"CEO"', '"lawsuit"'
];

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function formatArticle(article) {
  return {
    title:       article.title       || null,
    description: article.description || null,
    source:      article.source && article.source.name ? article.source.name : null,
    publishedAt: article.publishedAt  || null,
    url:         article.url          || null
  };
}

function getApiKey() {
  var key = process.env.NEWS_API_KEY;
  if (!key || key === 'your_newsapi_key_here') {
    throw new Error('NEWS_API_KEY is not set. Add it to your .env file.');
  }
  return key;
}

/* ─────────────────────────────────────────
   INDIVIDUAL CATEGORY FETCHERS
───────────────────────────────────────── */

/**
 * Fetch general business headlines from NewsAPI top-headlines endpoint.
 * @returns {Promise<Array>} raw article objects
 */
async function fetchBusinessNews() {
  var res = await axios.get(NEWS_API_BASE + '/top-headlines', {
    params: {
      category: 'business',
      language: 'en',
      pageSize: 20,
      apiKey: getApiKey()
    },
    timeout: 10000
  });
  return res.data.articles || [];
}

/**
 * Fetch geopolitical news using keyword search.
 * @returns {Promise<Array>} raw article objects
 */
async function fetchGeopoliticalNews() {
  var res = await axios.get(NEWS_API_BASE + '/everything', {
    params: {
      q:        GEOPOLITICAL_TERMS.join(' OR '),
      sortBy:   'publishedAt',
      language: 'en',
      pageSize: 20,
      apiKey:   getApiKey()
    },
    timeout: 10000
  });
  return res.data.articles || [];
}

/**
 * Fetch corporate news using keyword search.
 * @returns {Promise<Array>} raw article objects
 */
async function fetchCorporateNews() {
  var res = await axios.get(NEWS_API_BASE + '/everything', {
    params: {
      q:        CORPORATE_TERMS.join(' OR '),
      sortBy:   'publishedAt',
      language: 'en',
      pageSize: 20,
      apiKey:   getApiKey()
    },
    timeout: 10000
  });
  return res.data.articles || [];
}

/* ─────────────────────────────────────────
   MAIN EXPORT: fetchLatestNews()
───────────────────────────────────────── */

/**
 * Fetches the top 20 most recent articles across all three categories.
 * Uses Promise.allSettled so a failure in one category does not crash the others.
 *
 * @returns {Promise<Array>} up to 20 formatted articles sorted newest-first,
 *   each with: title, description, source, publishedAt, url
 */
async function fetchLatestNews() {
  var results = await Promise.allSettled([
    fetchBusinessNews(),
    fetchGeopoliticalNews(),
    fetchCorporateNews()
  ]);

  /* Log partial failures without throwing */
  results.forEach(function(r, i) {
    if (r.status === 'rejected') {
      var labels = ['business', 'geopolitical', 'corporate'];
      console.error('[newsMonitor] ' + labels[i] + ' fetch failed:', r.reason && r.reason.message);
    }
  });

  /* Merge all fulfilled results */
  var allArticles = results
    .filter(function(r) { return r.status === 'fulfilled'; })
    .reduce(function(acc, r) { return acc.concat(r.value); }, []);

  /* Deduplicate by URL */
  var seen = new Set();
  var unique = allArticles.filter(function(a) {
    if (!a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  /* Sort newest-first, take top 20, format */
  return unique
    .sort(function(a, b) { return new Date(b.publishedAt) - new Date(a.publishedAt); })
    .slice(0, 20)
    .map(formatArticle);
}

module.exports = {
  fetchLatestNews,
  fetchBusinessNews,
  fetchGeopoliticalNews,
  fetchCorporateNews
};
