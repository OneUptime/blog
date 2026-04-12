# How to Use $meta to Project Text Search Scores in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Text Search, Projection

Description: Learn how to use $meta in MongoDB projections to include text search relevance scores in query results and sort documents by relevance.

---

When you run a full-text search in MongoDB using `$text`, MongoDB computes a relevance score for each matching document. By default, this score is not included in the returned documents. The `$meta` projection operator lets you surface that score so you can display or sort by it.

## Setting Up a Text Index

Before using `$text` search, you need a text index on the fields you want to search:

```javascript
db.articles.createIndex({ title: "text", body: "text" })
```

Insert some sample articles:

```javascript
db.articles.insertMany([
  { title: "Introduction to MongoDB", body: "MongoDB is a NoSQL document database." },
  { title: "MongoDB Text Search Guide", body: "Learn how to use full-text search in MongoDB." },
  { title: "Database Performance Tips", body: "Optimize your MongoDB queries for speed." }
])
```

## Projecting the Text Score with $meta

Use `{ $meta: "textScore" }` in the projection to include the computed relevance score:

```javascript
db.articles.find(
  { $text: { $search: "MongoDB search" } },
  { title: 1, score: { $meta: "textScore" } }
)
```

Result:

```javascript
[
  { title: "MongoDB Text Search Guide", score: 1.5 },
  { title: "Introduction to MongoDB",   score: 0.75 },
  { title: "Database Performance Tips", score: 0.5 }
]
```

The field name `score` is arbitrary - you can name it anything. The value comes from MongoDB's internal text scoring algorithm, which weighs term frequency and field weights.

## Sorting by Text Score

To sort results by relevance (highest score first), reference `$meta: "textScore"` in the sort clause:

```javascript
db.articles.find(
  { $text: { $search: "MongoDB" } },
  { title: 1, score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

This ensures the most relevant documents appear first. Starting with MongoDB 4.4, you can sort by `{ $meta: "textScore" }` without including it in the projection. Including it in both projection and sort is still useful when you want to display the score alongside sorted results.

## Using $meta in the Aggregation Pipeline

The `$meta` expression also works inside aggregation `$project` and `$addFields` stages after a `$match` stage with `$text`:

```javascript
db.articles.aggregate([
  { $match: { $text: { $search: "MongoDB performance" } } },
  {
    $project: {
      title: 1,
      body: 1,
      relevance: { $meta: "textScore" }
    }
  },
  { $sort: { relevance: -1 } },
  { $limit: 5 }
])
```

This pipeline finds articles matching the search terms, adds a `relevance` field with the text score, sorts by it descending, and returns the top 5 results.

## Controlling Field Weights

You can assign different weights to fields when creating the text index, which affects the score:

```javascript
db.articles.createIndex(
  { title: "text", body: "text" },
  { weights: { title: 10, body: 1 } }
)
```

With these weights, a match in `title` contributes 10 times more to the score than a match in `body`. Re-run your text search to see the updated scores.

## Filtering by Minimum Score

MongoDB does not provide a direct `$minScore` operator, but you can filter after projecting the score using `$expr` or the aggregation `$match`:

```javascript
db.articles.aggregate([
  { $match: { $text: { $search: "MongoDB" } } },
  { $addFields: { score: { $meta: "textScore" } } },
  { $match: { score: { $gte: 1.0 } } },
  { $sort: { score: -1 } }
])
```

This pipeline discards documents with low relevance scores before returning results.

## Summary

The `$meta: "textScore"` projection in MongoDB exposes the relevance score computed during full-text searches, enabling you to sort and filter results by how well they match the search terms. Pair it with `$sort` using the same `$meta` expression to rank results by relevance, or use the aggregation pipeline for more control over scoring thresholds and field weights.
