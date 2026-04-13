# How to Create a Text Index for Full-Text Search in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Text Index, Full-Text Search, Search

Description: Learn how to create text indexes in MongoDB for full-text search, including single and multi-field indexes, weights, and $text query operators.

---

## Overview

A text index in MongoDB enables full-text search on string fields. Unlike regular indexes that support exact matches and ranges, text indexes tokenize, stem, and index words from string content, supporting `$text` queries that search for words and phrases across one or more fields.

## Creating a Basic Text Index

```javascript
// Index a single string field
db.articles.createIndex({ body: "text" })

// Index multiple fields
db.articles.createIndex({ title: "text", body: "text", summary: "text" })
```

Only one text index is allowed per collection. To index multiple fields, create a compound text index as shown above.

## Creating a Wildcard Text Index

To index all string fields in every document:

```javascript
db.articles.createIndex({ "$**": "text" })
```

## Querying with $text

```javascript
// Search for articles containing "mongodb"
db.articles.find({ $text: { $search: "mongodb" } })

// Search for phrase "full text search"
db.articles.find({ $text: { $search: "\"full text search\"" } })

// Exclude a word using minus prefix
db.articles.find({ $text: { $search: "mongodb -atlas" } })

// Case-insensitive by default; specify language
db.articles.find({ $text: { $search: "indexes", $language: "english" } })
```

## Sorting by Text Relevance Score

Use the `$meta` operator to project and sort by the text search score:

```javascript
db.articles.find(
  { $text: { $search: "mongodb indexing" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

## Weighted Text Index

Assign weights to fields to influence relevance scores:

```javascript
db.articles.createIndex(
  { title: "text", summary: "text", body: "text" },
  {
    weights: {
      title: 10,
      summary: 5,
      body: 1
    },
    name: "article_text_idx"
  }
)
```

With these weights, a match in the title contributes 10x more to the relevance score than a match in the body.

## Practical Example - Blog Search

```javascript
db.posts.insertMany([
  {
    title: "Getting Started with MongoDB",
    tags: ["mongodb", "database"],
    body: "MongoDB is a NoSQL database that stores data as documents."
  },
  {
    title: "Advanced MongoDB Aggregation",
    tags: ["mongodb", "aggregation"],
    body: "The aggregation pipeline processes data through stages."
  },
  {
    title: "PostgreSQL vs MongoDB",
    tags: ["comparison", "database"],
    body: "Comparing relational and document databases for web applications."
  }
])

// Create text index on title and body
db.posts.createIndex({ title: "text", body: "text" })

// Search for "aggregation"
db.posts.find(
  { $text: { $search: "aggregation" } },
  { score: { $meta: "textScore" }, title: 1 }
).sort({ score: { $meta: "textScore" } })
```

## Language Support

Text indexes support stemming for multiple languages:

```javascript
// Create a Spanish text index
db.contenido.createIndex(
  { texto: "text" },
  { default_language: "spanish" }
)

// Set language per document
db.articles.createIndex({ content: "text" })
db.articles.insertOne({
  content: "Las bases de datos son importantes",
  language: "spanish"
})
```

## Limitations and Considerations

```text
- Only one text index per collection
- Text indexes can be large - they store stems of all indexed words
- $text queries cannot use other index types in the same query
- Text index does not support $regex or $where
- Case-insensitive by default (diacritic insensitive by default)
- Use Atlas Search for more advanced full-text search features
```

## Checking if $text Query Used the Index

```javascript
db.articles.find({ $text: { $search: "mongodb" } }).explain("executionStats")
// Look for "TEXT" stage in winningPlan
// "totalDocsExamined" should be much less than collection size
```

## Summary

Text indexes in MongoDB enable full-text search by tokenizing and stemming string field content. Create them with `"text"` as the index type, and search with the `$text` operator. Weights control per-field relevance contributions, and `$meta: "textScore"` exposes relevance scores for sorting. Only one text index per collection is allowed, so plan your multi-field text index carefully based on which fields need to be searchable.
