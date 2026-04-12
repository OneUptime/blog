# How to Index for Text Search with Filters in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Text Search, Index, Filter, Full-Text

Description: Combine MongoDB text indexes with equality filters to build efficient full-text search with category and status constraints using compound text indexes.

---

## The Challenge

A standalone text index on a collection works well for pure text search. But most production queries combine text search with additional filters (e.g., search within a category, or only in active records). This requires understanding how compound text indexes work.

## Simple Text Index

```javascript
// Create a text index on title and body fields
db.articles.createIndex({ title: "text", body: "text" });

// Basic text search
db.articles.find({ $text: { $search: "mongodb performance" } });
```

## Compound Text Index with Filter Fields

To support text search with equality filters, create a compound index with the filter fields as a prefix before the text component:

```javascript
// Compound index: filter fields + text fields
db.articles.createIndex({
  category: 1,
  status: 1,
  title: "text",
  body: "text",
});
```

This allows MongoDB to use the index for both the equality filter and the text search:

```javascript
// Efficient: uses the compound text index
db.articles.find({
  category: "technology",
  status: "published",
  $text: { $search: "mongodb sharding" },
});
```

## Text Index Limitations

Only one text index is allowed per collection. You cannot create two separate text indexes:

```javascript
// This FAILS if a text index already exists
db.articles.createIndex({ comments: "text" }); // Error: too many text indexes
```

To include multiple fields in text search, list all of them in a single compound text index:

```javascript
db.articles.createIndex({
  status: 1,
  title: "text",
  body: "text",
  tags: "text", // Also searchable
});
```

## Text Search Scoring and Sorting

MongoDB assigns a relevance score to each document. Retrieve and sort by score:

```javascript
db.articles.find(
  {
    status: "published",
    $text: { $search: "performance tuning" },
  },
  {
    score: { $meta: "textScore" }, // Project the score
  }
).sort({ score: { $meta: "textScore" } }); // Sort by relevance
```

## Wildcard Text Index

For collections with many text fields you do not know in advance, use a wildcard text index:

```javascript
db.articles.createIndex({ "$**": "text" });
```

This indexes all string fields but cannot be combined with other index types in a compound index.

## Filter Fields Must Be Prefix in the Index

Equality filter fields in a compound text index must appear as a prefix before the text components for the index to be used efficiently:

```javascript
// WRONG order - filter fields after text fields are not used for filtering
db.articles.createIndex({ title: "text", body: "text", category: 1 });

// CORRECT order - filter fields as prefix
db.articles.createIndex({ category: 1, title: "text", body: "text" });
```

## Verify Index Usage

```javascript
db.articles.find({ category: "tech", $text: { $search: "index" } }).explain("executionStats");
```

Look for:

```json
{
  "winningPlan": {
    "stage": "TEXT_MATCH",
    "inputStage": {
      "stage": "TEXT_OR",
      "inputStage": {
        "stage": "IXSCAN"
      }
    }
  }
}
```

The `IXSCAN` inside `TEXT_OR` confirms the text index is used.

## Summary

MongoDB compound text indexes allow you to combine full-text search with equality filters by placing the equality filter fields as a prefix before the text fields in the index definition. Each collection is limited to one text index, so include all searchable fields in a single text index. Use `$meta: "textScore"` to project and sort by relevance. Verify index usage by checking for the `TEXT_MATCH` and `IXSCAN` stages in `explain()` output.
