# How to Implement Full-Text Search with Weighted Fields in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Full-Text Search, Text Index, Weighted Fields, Search

Description: Learn how to implement full-text search in MongoDB with field weights, relevance scoring, and wildcard text indexes for flexible document search.

---

## Introduction

MongoDB's built-in text search supports multi-field full-text indexing with configurable field weights. Higher weights increase a field's influence on the relevance score - making a match in the `title` worth more than a match in the `body`. This enables relevance-ranked search results without a separate search engine. For more advanced search requirements, MongoDB Atlas Search (built on Lucene) provides additional capabilities.

## Creating a Text Index with Field Weights

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
      title: 10,    // Title matches are most important
      tags: 5,      // Tags are second
      summary: 3,   // Summary is third
      body: 1       // Body matches have base weight
    },
    name: "article_text_index",
    default_language: "english"
  }
);
```

## Running a Text Search Query

```javascript
// Search for "machine learning"
db.articles.find(
  { $text: { $search: "machine learning" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });
```

The `$meta: "textScore"` projection adds the computed relevance score to each result.

## Search Operators

```text
"phrase search"   - Exact phrase (use quotes)
word1 word2       - Either word matches (OR behavior by default)
-excluded         - Exclude documents containing this word
"exact" -"not this" - Combine inclusion and exclusion
```

```javascript
// Search for "database" but NOT "relational"
db.articles.find({
  $text: { $search: "database -relational" }
});

// Search for exact phrase "machine learning"
db.articles.find({
  $text: { $search: '"machine learning"' }
});

// Search for "mongodb" OR "nosql"
db.articles.find({
  $text: { $search: "mongodb nosql" }
});
```

## Sorting by Relevance Score

Always project the `textScore` and sort by it for relevance-ranked results:

```javascript
db.articles.aggregate([
  { $match: { $text: { $search: "mongodb performance" } } },
  { $addFields: { score: { $meta: "textScore" } } },
  { $sort: { score: -1 } },
  { $limit: 10 },
  {
    $project: {
      title: 1,
      summary: 1,
      score: 1
    }
  }
]);
```

## Combining Text Search with Other Filters

```javascript
// Search "performance" in published articles only
db.articles.find(
  {
    $text: { $search: "performance" },
    status: "published",
    publishedAt: { $gte: new Date("2025-01-01") }
  },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });
```

## Wildcard Text Index

Index all string fields in every document:

```javascript
db.documents.createIndex({ "$**": "text" });
```

Useful when documents have varying fields and you want to search across all text content.

## Language Support

```javascript
// Search in Spanish
db.articles.find({
  $text: {
    $search: "computadora",
    $language: "spanish"
  }
});

// Create multilingual index
db.articles.createIndex(
  { title: "text", body: "text" },
  { default_language: "none" } // No stemming - good for multilingual content
);
```

## Checking Text Index Usage

Verify the text index is being used:

```javascript
db.articles.find(
  { $text: { $search: "mongodb" } },
  { score: { $meta: "textScore" } }
).explain("executionStats");
// winningPlan.stage should be "TEXT"
```

## Limitations of Text Indexes

```text
- Only one text index per collection
- $text must be a top-level query operator - it cannot be nested inside $or or $nor
- Case insensitive and diacritic insensitive (by default)
- No substring matching - only full words (use regex for substring)
- Not suitable for complex relevance tuning - use Atlas Search for that
```

## Practical Full-Text Search Endpoint (Node.js)

```javascript
async function searchArticles(query, page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize;

  const [results, total] = await Promise.all([
    db.collection("articles").aggregate([
      { $match: { $text: { $search: query }, status: "published" } },
      { $addFields: { score: { $meta: "textScore" } } },
      { $sort: { score: -1 } },
      { $skip: skip },
      { $limit: pageSize },
      { $project: { title: 1, summary: 1, slug: 1, score: 1 } }
    ]).toArray(),
    db.collection("articles").countDocuments({ $text: { $search: query }, status: "published" })
  ]);

  return { results, total, page, pageSize };
}
```

## Summary

MongoDB's weighted text indexes enable relevance-ranked full-text search by assigning higher importance to matches in key fields like title and tags. Use `$meta: "textScore"` in projections and sort by it for relevance ordering. Combine `$text` with other query operators to filter by additional criteria, and use the wildcard text index `"$**"` when document schemas are dynamic. For more advanced relevance tuning, faceted search, and fuzzy matching, consider upgrading to MongoDB Atlas Search.
