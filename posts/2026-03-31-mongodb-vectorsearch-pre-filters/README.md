# How to Use Pre-Filters with $vectorSearch in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Vector Search, Atlas Search

Description: Apply pre-filters in MongoDB $vectorSearch to restrict the candidate set by field values before running ANN similarity search for faster and more relevant results.

---

Without filtering, `$vectorSearch` searches the entire collection for approximate nearest neighbors. Pre-filters let you restrict the search to a subset of documents - for example, only products in a specific category or documents owned by the current user - before the similarity comparison runs.

## Why Pre-Filter Matters

Running ANN over millions of documents is fast, but you often only want results matching a business constraint. A post-filter (`$match` after `$vectorSearch`) removes documents after retrieval, which wastes the candidate slots. Pre-filtering ensures all `numCandidates` slots are drawn from the relevant subset.

## Setting Up Filter Fields in the Index

Filter fields must be declared in the vector search index definition as `filter` type:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "category"
    },
    {
      "type": "filter",
      "path": "userId"
    },
    {
      "type": "filter",
      "path": "price"
    },
    {
      "type": "filter",
      "path": "inStock"
    }
  ]
}
```

## Basic Pre-Filter on a String Field

```javascript
db.products.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: userQueryEmbedding,
      numCandidates: 100,
      limit: 10,
      filter: {
        category: { $eq: "electronics" }
      }
    }
  },
  {
    $project: {
      name: 1,
      category: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

## Filtering on Multiple Fields

Combine conditions with standard MongoDB query operators:

```javascript
db.products.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: userQueryEmbedding,
      numCandidates: 150,
      limit: 10,
      filter: {
        $and: [
          { category: { $eq: "electronics" } },
          { inStock: { $eq: true } },
          { price: { $lte: 500 } }
        ]
      }
    }
  }
])
```

## Range Filter on a Date Field

```javascript
db.articles.aggregate([
  {
    $vectorSearch: {
      index: "article_vector_index",
      path: "embedding",
      queryVector: topicEmbedding,
      numCandidates: 100,
      limit: 5,
      filter: {
        publishedAt: {
          $gte: new Date("2024-01-01"),
          $lte: new Date("2024-12-31")
        }
      }
    }
  }
])
```

## User-Scoped Search

Restrict results to documents belonging to a specific user - useful in multi-tenant applications:

```javascript
db.notes.aggregate([
  {
    $vectorSearch: {
      index: "notes_vector_index",
      path: "embedding",
      queryVector: queryEmbedding,
      numCandidates: 50,
      limit: 10,
      filter: {
        userId: { $eq: currentUserId }
      }
    }
  }
])
```

## Adjusting numCandidates with Filters

When you pre-filter aggressively, increase `numCandidates` to ensure enough results survive. A common rule is `numCandidates = limit * 10` normally, but with a highly selective filter (less than 5% of documents match) you may need `numCandidates = limit * 20` or more:

```javascript
// Very selective filter - increase numCandidates
{
  $vectorSearch: {
    numCandidates: 200,  // higher than usual
    limit: 10,
    filter: { rareCategory: { $eq: "limited-edition" } }
  }
}
```

## Supported Filter Operators

Atlas pre-filter supports: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`, `$and`, `$or`, and `$not`. Array fields can also be filtered using these operators.

## Summary

Pre-filters in `$vectorSearch` restrict the ANN candidate pool to documents matching specific field conditions before similarity scoring. Declare filterable fields as `filter` type in the vector index, pass the `filter` option in `$vectorSearch`, and increase `numCandidates` proportionally when your filter is highly selective. This produces both faster queries and more business-relevant results.
