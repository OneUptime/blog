# How to Interpret keysExamined, docsExamined, and nReturned in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Profiler, Query Optimization, Index, Performance

Description: Learn what keysExamined, docsExamined, and nReturned mean in MongoDB profiler output, and use their ratios to identify inefficient queries and missing indexes.

---

Three metrics in MongoDB's profiler output and `explain()` results reveal query efficiency at a glance: `keysExamined`, `docsExamined`, and `nReturned`. Understanding their relationships helps you quickly identify whether a query uses indexes effectively.

## What Each Metric Means

| Metric         | Definition                                                      |
|----------------|-----------------------------------------------------------------|
| `keysExamined` | Number of index keys scanned to find matching documents         |
| `docsExamined` | Number of documents read from the collection (post-index scan)  |
| `nReturned`    | Number of documents returned to the client                      |

## Reading These from the Profiler

```javascript
// Find recent slow operations with these metrics
db.system.profile.find(
  { op: "query" },
  { ns: 1, millis: 1, keysExamined: 1, docsExamined: 1, nreturned: 1, planSummary: 1 }
).sort({ millis: -1 }).limit(10);
```

Sample output:

```javascript
{
  "ns": "mydb.orders",
  "millis": 340,
  "keysExamined": 45000,
  "docsExamined": 45000,
  "nreturned": 12,
  "planSummary": "IXSCAN { status: 1 }"
}
```

This is terrible: 45,000 index keys and documents examined to return 12. The index on `status` is not selective enough.

## The Three Efficiency Ratios

### 1. Index Efficiency: keysExamined / nReturned

```text
Ideal: 1.0 (each index key leads to a returned document)
Good: < 10
Acceptable: < 100
Problem: > 1000
```

A ratio of 45,000 / 12 = 3,750 means the index is scanning far more keys than needed - the index may have low selectivity or not match the query well.

### 2. Fetch Efficiency: docsExamined / nReturned

```text
Ideal: 1.0 (all fetched documents are returned)
Good: < 5
Problem: > 100
```

High `docsExamined / nReturned` with `planSummary: "IXSCAN"` means the index narrows results but many documents are still filtered out after fetching - the index isn't selective enough.

### 3. Covered Query Check: docsExamined == 0?

If `docsExamined` is 0 and the query returns results, it is a **covered query** - the result came entirely from the index without reading any documents. This is optimal.

## Diagnosing with explain()

```javascript
db.orders.find({ status: "pending", userId: "user-42" })
  .explain("executionStats");
```

Key fields in `executionStats`:

```javascript
{
  "nReturned": 12,
  "totalKeysExamined": 45000,
  "totalDocsExamined": 45000,
  "executionTimeMillis": 340,
  "executionStages": {
    "stage": "FETCH",
    "inputStage": {
      "stage": "IXSCAN"  // index used but poor selectivity
    }
  }
}
```

## Common Patterns and Fixes

### Pattern 1: COLLSCAN with High docsExamined

```javascript
// Problem: no index on status
db.orders.find({ status: "pending" });
// docsExamined = totalDocs, nReturned = few

// Fix: create index
db.orders.createIndex({ status: 1 });
```

### Pattern 2: IXSCAN but High docsExamined/nReturned

```javascript
// Index exists but low selectivity
db.orders.find({ country: "US" });
// 60% of documents are US - index scan examines 60%, returns 60%
// Ratio is 1.0 but both are high numbers

// Fix: add more selective fields to the index
db.orders.createIndex({ country: 1, status: 1 });
```

### Pattern 3: keysExamined > docsExamined (Multi-key Index)

When a field is an array, each array element is an index key. `keysExamined` can exceed `docsExamined`.

## Setting Alerts Based on These Ratios

```javascript
// Find all queries with examine-to-return ratio > 100
db.system.profile.find({
  $expr: {
    $gt: [
      { $divide: ["$docsExamined", { $max: ["$nreturned", 1] }] },
      100
    ]
  }
}).sort({ millis: -1 }).limit(20);
```

## Summary

`keysExamined / nReturned` measures index selectivity and `docsExamined / nReturned` measures fetch efficiency. Both ratios should be as close to 1.0 as possible. A COLLSCAN with thousands of docs examined for a handful of results is always a signal to add an index. A covered query with `docsExamined = 0` is the most efficient possible outcome. Use these ratios as your primary lens when triaging slow query profiler data.
