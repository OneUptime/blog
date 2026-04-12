# How to Create a Text Index on Multiple Fields in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Text Search, Index, Full-Text Search

Description: Learn how to create MongoDB text indexes spanning multiple fields, set field weights for relevance tuning, and query them with $text to power full-text search features.

---

MongoDB text indexes enable full-text search across string fields. A single collection can have only one text index, but that index can cover multiple fields with different weights. This lets you build relevance-ranked search across titles, descriptions, tags, and other text content in a single query.

## Creating a Multi-Field Text Index

```javascript
// Index on name, description, and tags with equal weight
db.products.createIndex({
  name: "text",
  description: "text",
  tags: "text"
});
```

## Creating a Weighted Text Index

Field weights control how much each field contributes to the relevance score. The default weight is 1. Higher weights mean matches in that field rank higher.

```javascript
db.articles.createIndex(
  {
    title: "text",
    summary: "text",
    body: "text",
    tags: "text"
  },
  {
    weights: {
      title: 10,    // title matches count 10x
      summary: 5,   // summary matches count 5x
      tags: 3,      // tag matches count 3x
      body: 1       // body matches count 1x (default)
    },
    name: "articles_text_search"  // optional custom index name
  }
);
```

## Querying the Text Index

Use the `$text` operator with `$search` to run full-text queries:

```javascript
// Basic full-text search
db.articles.find({ $text: { $search: "mongodb performance" } });

// Search and sort by relevance score
db.articles.find(
  { $text: { $search: "mongodb performance" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });
```

## Phrase Search

Wrap phrases in double quotes to match exact phrases:

```javascript
db.articles.find({
  $text: { $search: '"full text search"' }
});
```

## Excluding Words

Prefix a word with `-` to exclude documents containing it:

```javascript
// Find documents about "indexes" but not "compound"
db.articles.find({
  $text: { $search: "indexes -compound" }
});
```

## Combining Text Search with Other Filters

```javascript
db.articles.find({
  $text: { $search: "performance tuning" },
  status: "published",
  publishedAt: { $gte: new Date("2025-01-01") }
},
{
  score: { $meta: "textScore" }
}).sort({ score: { $meta: "textScore" } }).limit(10);
```

## Using $text in Aggregation

```javascript
db.articles.aggregate([
  {
    $match: {
      $text: { $search: "mongodb index performance" }
    }
  },
  {
    $project: {
      title: 1,
      summary: 1,
      score: { $meta: "textScore" }
    }
  },
  { $sort: { score: -1 } },
  { $limit: 10 }
]);
```

## Wildcard Text Index

Index all string fields in a collection with the wildcard specifier:

```javascript
db.products.createIndex({ "$**": "text" });
```

This is convenient for dynamic schemas but uses more storage and may index fields you do not want to search.

## Checking Index Definition

```javascript
db.articles.getIndexes();
```

Look for `{ "key": { "_fts": "text", "_ftsx": 1 } }` with a `weights` field.

## Language Support

Specify a language for stemming and stop words:

```javascript
db.articles.createIndex(
  { title: "text", body: "text" },
  { default_language: "french" }
);

// Or per-document language
db.articles.createIndex(
  { title: "text", body: "text" },
  { language_override: "lang" }
);
```

## Limitations to Know

```text
- One text index per collection
- $text queries cannot use hint() to force a particular index
- Text queries must match whole words (no partial-word matching)
- Diacritics and case are ignored by default
```

For more advanced search features (fuzzy matching, autocomplete, facets), consider MongoDB Atlas Search.

## Summary

A multi-field MongoDB text index allows full-text search across multiple string fields in a single query. Use `weights` to tune relevance so matches in high-priority fields like titles rank above matches in body text. Query with `$text: { $search: "..." }` and sort by `{ $meta: "textScore" }` to return the most relevant results first.
