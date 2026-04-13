# How to Identify Fetch Stage Problems in MongoDB Explain Plans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Explain Plan, Fetch Stage, Index, Query Optimization

Description: Learn what the FETCH stage means in MongoDB explain plans, when it causes performance issues, and how to eliminate unnecessary fetches with covered queries.

---

The FETCH stage in MongoDB explain plans retrieves the actual document from the collection after the IXSCAN identifies matching index keys. While often necessary, an excessive or inefficient FETCH stage is a common source of query performance problems that can be fixed with projection and index design.

## What the FETCH Stage Does

In a typical query plan:

1. **IXSCAN** - scans the index to find matching key values
2. **FETCH** - loads the actual document from disk/cache for each matching key
3. (Optional) **SORT**, **PROJECTION**, etc.

The FETCH stage exists because indexes store a subset of fields - when you need fields not in the index, MongoDB must go back to the full document.

## Reading a FETCH Stage in explain()

```javascript
db.orders.find({ userId: "usr_123" }, { amount: 1, status: 1 })
  .explain("executionStats");
```

```json
{
  "winningPlan": {
    "stage": "PROJECTION_SIMPLE",
    "inputStage": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",
        "indexName": "userId_1"
      }
    }
  },
  "executionStats": {
    "nReturned": 150,
    "totalDocsExamined": 150,
    "totalKeysExamined": 150,
    "executionTimeMillis": 45
  }
}
```

Here, `totalDocsExamined: 150` equals `nReturned: 150` - the FETCH is precise, no waste.

## When FETCH Causes Problems: Fetch with Filter

The most problematic FETCH pattern occurs when the query has filter conditions that are not covered by the index. MongoDB must fetch the document to apply the remaining filter:

```javascript
// Index only on { userId: 1 }
// Query also filters on { status: "pending" } - not in index
db.orders.find({ userId: "usr_123", status: "pending" }).explain("executionStats");
```

```json
{
  "winningPlan": {
    "stage": "FETCH",
    "filter": { "status": { "$eq": "pending" } },
    "inputStage": { "stage": "IXSCAN", "indexName": "userId_1" }
  },
  "executionStats": {
    "nReturned": 15,
    "totalDocsExamined": 500,
    "totalKeysExamined": 500
  }
}
```

500 documents fetched to return only 15 - a 33x amplification factor. The `"filter"` field on the FETCH stage is the warning sign.

## Fix: Extend the Index to Include Filter Fields

Include all query filter fields in the index to eliminate the FETCH-with-filter:

```javascript
// Add status to the index to avoid post-fetch filtering
db.orders.createIndex({ userId: 1, status: 1 });
```

After this change:
- `totalDocsExamined: 15` = `nReturned: 15` - no wasteful fetching

## Eliminating FETCH Entirely: Covered Queries

A covered query serves the result entirely from the index with no FETCH stage. This requires the projection to include only indexed fields:

```javascript
// Index: { userId: 1, status: 1, amount: 1 }
db.orders.createIndex({ userId: 1, status: 1, amount: 1 });

// Query and projection both covered by the index
db.orders.find(
  { userId: "usr_123", status: "pending" },
  { userId: 1, status: 1, amount: 1, _id: 0 }
).explain("executionStats");
```

```json
{
  "winningPlan": {
    "stage": "PROJECTION_COVERED",
    "inputStage": { "stage": "IXSCAN" }
  },
  "executionStats": {
    "totalDocsExamined": 0
  }
}
```

`totalDocsExamined: 0` - the query never touched the collection. All data came from the index.

## When FETCH Is Unavoidable

FETCH is necessary when:
- You need fields not in the index
- You use `$regex`, `$where`, or other operators that require full document access
- The collection has large documents with many fields not in any index

In these cases, verify that `totalDocsExamined` is close to `nReturned`. A large ratio indicates the index selectivity is poor.

## Summary

The FETCH stage in MongoDB explain plans retrieves documents after the IXSCAN. A FETCH with a `filter` attribute is a red flag - it means the index was not selective enough and MongoDB is doing post-fetch filtering, examining many more documents than it returns. Fix this by extending the index to include all filter fields. For maximum performance on critical query paths, design indexes that enable covered queries, eliminating the FETCH stage entirely.
