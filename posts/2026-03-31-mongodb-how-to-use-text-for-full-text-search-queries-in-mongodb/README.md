# How to Use $text for Full-Text Search Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $text, Full-Text Search, Text Index, Search, Node.js

Description: Learn how to use MongoDB's $text operator with text indexes to perform full-text search, including phrase search, word exclusion, and relevance scoring.

---

## What Is Full-Text Search in MongoDB?

MongoDB's `$text` operator performs full-text search on fields that have a text index. It tokenizes the search string, applies stemming, ignores stop words, and matches documents containing any of the search terms.

Full-text search is more powerful than `$regex` for natural language search because it understands word boundaries, handles plurals via stemming, and supports sorting results by relevance score.

## Creating a Text Index

Before using `$text`, you must create a text index on the fields you want to search:

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('blog');
const posts = db.collection('posts');

// Single field text index
await posts.createIndex({ content: 'text' });

// Multi-field text index (most common)
await posts.createIndex({
  title: 'text',
  content: 'text',
  tags: 'text',
});

// With field weights (title matches weighted 10x more than content)
await posts.createIndex(
  { title: 'text', content: 'text' },
  { weights: { title: 10, content: 1 }, name: 'posts_text_idx' }
);

// Wildcard text index - indexes ALL string fields
await posts.createIndex({ '$**': 'text' });
```

Only one text index is allowed per collection.

## Basic Text Search

```javascript
// Search for posts containing 'mongodb'
const results = await posts.find({
  $text: { $search: 'mongodb' }
}).toArray();

// Multiple words (OR logic by default)
const orResults = await posts.find({
  $text: { $search: 'mongodb performance optimization' }
}).toArray();
// Returns docs containing 'mongodb' OR 'performance' OR 'optimization'
```

## Phrase Search

Wrap phrases in escaped quotes for exact phrase matching:

```javascript
// Exact phrase search
const phraseResults = await posts.find({
  $text: { $search: '"full text search"' }
}).toArray();
// Returns docs containing the exact phrase "full text search"
```

## Word Exclusion

Prefix a word with `-` to exclude it:

```javascript
// Docs with 'mongodb' but NOT 'deprecated'
const excluded = await posts.find({
  $text: { $search: 'mongodb -deprecated' }
}).toArray();

// Search for Redis caching but exclude Python examples
const filtered = await posts.find({
  $text: { $search: 'redis caching -python' }
}).toArray();
```

## Case-Insensitive and Diacritic Search

By default, text search is case-insensitive. For diacritic sensitivity:

```javascript
await posts.find({
  $text: {
    $search: 'café',
    $diacriticSensitive: true,  // 'café' != 'cafe'
  }
}).toArray();
```

## Sorting by Relevance Score

Use the `$meta: 'textScore'` projection to get relevance scores and sort by them:

```javascript
const results = await posts.find(
  { $text: { $search: 'mongodb indexing performance' } },
  { projection: { title: 1, score: { $meta: 'textScore' } } }
)
.sort({ score: { $meta: 'textScore' } })
.toArray();

results.forEach(r => {
  console.log(`[${r.score.toFixed(2)}] ${r.title}`);
});
```

## Combining $text with Other Filters

```javascript
// Text search + additional filters
const recent = await posts.find({
  $text: { $search: 'performance tuning' },
  status: 'published',
  createdAt: { $gte: new Date('2024-01-01') },
}).sort({ score: { $meta: 'textScore' } }).toArray();
```

## Language-Specific Text Search

```javascript
// Spanish text search (stemming for Spanish words)
const results = await posts.find({
  $text: {
    $search: 'rendimiento',
    $language: 'spanish',
  }
}).toArray();

// Disable language-specific stemming
const exact = await posts.find({
  $text: {
    $search: 'running',
    $language: 'none',  // 'running' won't match 'run'
  }
}).toArray();
```

## Aggregation with $text

```javascript
// Text search in aggregation pipeline
const results = await db.collection('articles').aggregate([
  {
    $match: {
      $text: { $search: 'mongodb tutorial' }
    }
  },
  {
    $project: {
      title: 1,
      author: 1,
      score: { $meta: 'textScore' },
    }
  },
  { $sort: { score: { $meta: 'textScore' } } },
  { $limit: 10 },
]).toArray();
```

## PyMongo Usage

```python
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['blog']
posts = db['posts']

# Create text index
posts.create_index([('title', 'text'), ('content', 'text')])

# Search
results = list(posts.find(
    {'$text': {'$search': 'mongodb performance'}},
    {'title': 1, 'score': {'$meta': 'textScore'}}
).sort([('score', {'$meta': 'textScore'})]))

# Phrase search
phrase_results = list(posts.find(
    {'$text': {'$search': '"query optimization"'}}
))

# Word exclusion
filtered = list(posts.find(
    {'$text': {'$search': 'mongodb -tutorial'}}
))
```

## Limitations of MongoDB Text Search

| Limitation | Details |
|------------|---------|
| One text index per collection | Cannot have multiple text indexes |
| No prefix or wildcard within `$search` | Use `$regex` for that |
| No result highlighting | No built-in way to highlight matching text |
| Limited relevance tuning | Only field weights, no custom scoring |

For advanced search needs, consider Elasticsearch or Atlas Search.

## Summary

MongoDB's `$text` operator provides built-in full-text search through text indexes. Create a compound text index on the fields you want to search, use quoted phrases for exact matches, and prefix words with `-` to exclude them. Always project and sort by `$meta: 'textScore'` to surface the most relevant results first. For language-specific search, configure the `$language` option or create a language-specific text index.
