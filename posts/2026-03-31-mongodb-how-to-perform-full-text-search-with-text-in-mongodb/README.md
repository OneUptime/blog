# How to Perform Full-Text Search with $text in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Full-Text Search, Text Index, $text Operator, Database

Description: Learn how to use MongoDB's $text operator with text indexes to perform efficient full-text search across string fields in your collections.

---

## Overview

MongoDB provides built-in full-text search capabilities through the `$text` operator. By creating a text index on one or more string fields, you can search for words and phrases across documents efficiently without scanning every document.

## Creating a Text Index

Before using `$text`, you must create a text index on the field(s) you want to search:

```javascript
// Single field text index
db.articles.createIndex({ content: "text" });

// Multi-field text index
db.articles.createIndex({ title: "text", content: "text", tags: "text" });

// Wildcard text index (indexes all string fields)
db.articles.createIndex({ "$**": "text" });
```

A collection can have only one text index. If you need to search multiple fields, include them all in a single compound text index.

## Basic $text Search

Once the index is in place, use `$text` with the `$search` field to find matching documents:

```javascript
// Find documents containing "mongodb"
db.articles.find({ $text: { $search: "mongodb" } });

// Find documents containing "full" or "text" (logical OR of terms)
db.articles.find({ $text: { $search: "full text" } });

// Find documents containing the exact phrase
db.articles.find({ $text: { $search: "\"full-text search\"" } });
```

## Excluding Words from Search

Prefix a word with a minus sign to exclude documents containing that word:

```javascript
// Find documents about "mongodb" but not "replication"
db.articles.find({
  $text: { $search: "mongodb -replication" }
});
```

## Case and Diacritic Sensitivity

By default, text search is case-insensitive and diacritic-insensitive. You can override these defaults:

```javascript
db.articles.find({
  $text: {
    $search: "MongoDB",
    $caseSensitive: true,
    $diacriticSensitive: true
  }
});
```

## Specifying a Language

MongoDB supports stemming and stop words for many languages. Specify the language to improve accuracy:

```javascript
db.articles.find({
  $text: {
    $search: "corriendo",
    $language: "es"
  }
});
```

You can also set the default language at index creation:

```javascript
db.articles.createIndex(
  { content: "text" },
  { default_language: "french" }
);
```

## Combining $text with Other Filters

`$text` can be combined with other query operators:

```javascript
// Full-text search with an additional filter
db.articles.find({
  $text: { $search: "performance" },
  status: "published",
  views: { $gt: 100 }
});
```

## Projecting and Sorting by Text Score

Use `$meta: "textScore"` to retrieve and sort by relevance:

```javascript
db.articles.find(
  { $text: { $search: "indexing performance" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });
```

## Counting Matching Documents

```javascript
db.articles.countDocuments({
  $text: { $search: "sharding" }
});
```

## Limitations to Know

- Only one text index per collection is allowed.
- The `$text` operator cannot be used in `$or` expressions unless all clauses in the `$or` array are indexed.
- Text indexes can be large and slow down write operations; use them selectively.
- Partial word matching (prefix search) is not supported by `$text` - use regex for that instead.

## Practical Example: Blog Search

```javascript
// Create the index
db.posts.createIndex({ title: "text", body: "text", tags: "text" });

// Search for posts about "performance tuning"
const results = await db.collection("posts").find(
  { $text: { $search: "performance tuning" } },
  { projection: { score: { $meta: "textScore" }, title: 1, _id: 0 } }
).sort({ score: { $meta: "textScore" } }).limit(10).toArray();

console.log(results);
```

## Summary

MongoDB's `$text` operator combined with a text index makes full-text search straightforward. You create a text index on string fields, then query using `$text` with `$search`. The operator supports phrase matching, word exclusion, language-aware stemming, and relevance scoring - covering most common search use cases without requiring a dedicated search engine.
