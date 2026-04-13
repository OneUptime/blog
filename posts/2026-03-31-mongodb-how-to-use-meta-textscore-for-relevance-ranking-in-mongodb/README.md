# How to Use $meta textScore for Relevance Ranking in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Full-Text Search, Text Score, Relevance Ranking, $meta

Description: Learn how to retrieve and sort MongoDB full-text search results by relevance score using the $meta textScore projection and sort expression.

---

## Overview

When running full-text search queries in MongoDB using `$text`, each matching document receives a relevance score based on how well it matches the search terms. The `$meta: "textScore"` expression lets you access this score for projection and sorting, enabling you to return the most relevant results first.

## Prerequisites

You need a text index on your collection before using `$text` and `$meta`:

```javascript
db.articles.createIndex({ title: "text", body: "text" });
```

## Projecting the Text Score

Add a computed field to the projection using `$meta: "textScore"`:

```javascript
db.articles.find(
  { $text: { $search: "mongodb performance" } },
  { score: { $meta: "textScore" }, title: 1, _id: 0 }
);
```

The field name (`score` in this example) can be anything you choose. The value is a floating-point number representing relevance.

## Sorting by Text Score

To return the most relevant documents first, sort by the text score:

```javascript
db.articles.find(
  { $text: { $search: "indexing optimization" } },
  { score: { $meta: "textScore" }, title: 1 }
).sort({ score: { $meta: "textScore" } });
```

The sort must reference the same `$meta: "textScore"` expression - it does not need to match the projected field name.

## Using $meta in the Aggregation Pipeline

You can also use text score within an aggregation pipeline:

```javascript
db.articles.aggregate([
  { $match: { $text: { $search: "replication failover" } } },
  {
    $addFields: {
      score: { $meta: "textScore" }
    }
  },
  { $sort: { score: -1 } },
  { $limit: 5 },
  { $project: { title: 1, score: 1, _id: 0 } }
]);
```

## Understanding How Score Is Calculated

MongoDB's text score is influenced by:

- Term frequency - how many times the search terms appear in the document
- Field weight - fields with higher weight contribute more to the score
- Number of words in the field - shorter fields score higher for matching terms

You can assign custom weights to fields at index creation time:

```javascript
db.articles.createIndex(
  { title: "text", body: "text" },
  { weights: { title: 10, body: 1 } }
);
```

With this configuration, a match in the `title` field is worth 10 times more than a match in `body`.

## Filtering Results by Minimum Score

Use a `$match` stage after computing the score to filter out low-relevance results:

```javascript
db.articles.aggregate([
  { $match: { $text: { $search: "sharding cluster" } } },
  { $addFields: { score: { $meta: "textScore" } } },
  { $match: { score: { $gt: 1.5 } } },
  { $sort: { score: -1 } },
  { $project: { title: 1, score: 1, _id: 0 } }
]);
```

## Practical Node.js Example

```javascript
const { MongoClient } = require("mongodb");

async function searchArticles(query) {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();

  const db = client.db("blog");
  const results = await db.collection("articles").find(
    { $text: { $search: query } },
    { projection: { score: { $meta: "textScore" }, title: 1, summary: 1 } }
  ).sort({ score: { $meta: "textScore" } }).limit(10).toArray();

  await client.close();
  return results;
}

searchArticles("performance tuning").then(console.log);
```

## Caveats

- `$meta: "textScore"` only works when combined with a `$text` query.
- If used without a `$text` query (MongoDB 4.4+), `$meta: "textScore"` returns a value without meaning rather than an error. In earlier versions, it requires a `$text` query.
- Scores are relative to the current result set and cannot be compared across different queries.

## Summary

MongoDB's `$meta: "textScore"` expression gives you access to the computed relevance score for each document in a full-text search. By including it in a projection and using it as a sort key, you can return results ordered by relevance. Custom field weights at index creation time let you fine-tune which fields matter most to your search ranking.
