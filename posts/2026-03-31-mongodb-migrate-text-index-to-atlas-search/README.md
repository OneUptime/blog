# How to Migrate from Text Indexes to Atlas Search in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Migration

Description: Migrate from MongoDB text indexes to Atlas Search for richer full-text search features, better relevance ranking, and support for fuzzy matching and facets.

---

MongoDB's built-in `$text` operator and text indexes provide basic full-text search. Atlas Search replaces them with a Lucene-based engine offering relevance scoring, fuzzy matching, synonyms, highlighting, and faceted navigation. This guide walks through the migration path.

## Current Text Index Usage

A typical text index and query looks like this:

```javascript
// Existing text index
db.articles.createIndex({ title: "text", body: "text" });

// Existing query
db.articles.find(
  { $text: { $search: "mongodb performance" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } }).limit(10);
```

## Step 1: Create an Atlas Search Index

In the Atlas UI or via the API, create a search index that covers the same fields:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.english"
      },
      "body": {
        "type": "string",
        "analyzer": "lucene.english"
      }
    }
  }
}
```

Wait for the index status to reach READY before testing queries.

## Step 2: Rewrite Queries to Use $search

Replace `$text` find queries with `$search` aggregation stages:

```javascript
// Before - text index
db.articles.find(
  { $text: { $search: "mongodb performance" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });

// After - Atlas Search
db.articles.aggregate([
  {
    $search: {
      index: "default",
      text: {
        query: "mongodb performance",
        path: ["title", "body"]
      }
    }
  },
  { $project: { title: 1, body: 1, score: { $meta: "searchScore" } } },
  { $limit: 10 }
]);
```

## Step 3: Map $text Options to $search Equivalents

| $text option | $search equivalent |
|---|---|
| `$language` | `analyzer` field in index definition |
| `$caseSensitive: false` | Default (case insensitive) |
| `$diacriticSensitive: false` | `icuFolding` token filter in custom analyzer |
| Phrase with quotes | `phrase` operator |

Phrase search example:

```javascript
// Before
db.articles.find({ $text: { $search: "\"exact phrase\"" } });

// After
db.articles.aggregate([
  {
    $search: {
      phrase: {
        query: "exact phrase",
        path: "title"
      }
    }
  }
]);
```

## Step 4: Handle Negation

`$text` supports negation with a `-` prefix. In Atlas Search, use `compound` with a `mustNot` clause:

```javascript
// Before: search "mongodb" but not "deprecated"
db.articles.find({ $text: { $search: "mongodb -deprecated" } });

// After
db.articles.aggregate([
  {
    $search: {
      compound: {
        must: [{ text: { query: "mongodb", path: "title" } }],
        mustNot: [{ text: { query: "deprecated", path: "title" } }]
      }
    }
  }
]);
```

## Step 5: Remove Text Indexes After Cutover

Once Atlas Search queries are validated in production, drop the old text indexes to reclaim memory and storage:

```javascript
db.articles.dropIndex("title_text_body_text");
```

Verify no application code still references `$text`:

```bash
grep -r "\$text" ./src --include="*.js"
```

## Step 6: Leverage Atlas Search Features

After migration, take advantage of features not available with text indexes:

- Fuzzy matching: `fuzzy: { maxEdits: 1 }`
- Synonyms: `synonyms: "my_mapping"`
- Highlighting: `highlight: { path: "body" }`
- Facets: `$searchMeta` with facet operator
- Autocomplete: `autocomplete` operator

## Summary

Migrating from text indexes to Atlas Search involves creating a matching search index, rewriting `$text` queries as `$search` aggregations, and mapping negation and phrase syntax to compound operators. The migration unlocks significantly richer search capabilities including fuzzy matching, synonyms, and faceting that are not possible with the basic text index operator.
