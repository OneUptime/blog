# How to Read the executionStats Output in MongoDB explain()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Performance, Query Optimization, Index, EXPLAIN

Description: Understand the key fields in MongoDB executionStats output from explain() so you can diagnose slow queries and decide when an index is needed.

---

## Running explain() with executionStats

MongoDB's `explain()` method describes how a query was executed. Use the `"executionStats"` verbosity level to get runtime metrics:

```javascript
db.orders.find({ status: "pending" }).explain("executionStats");
```

This returns a document with a `executionStats` section containing detailed counts and timing information.

## Key Fields in executionStats

Here is a breakdown of the most important fields:

```json
{
  "executionStats": {
    "executionSuccess": true,
    "nReturned": 42,
    "executionTimeMillis": 5,
    "totalKeysExamined": 42,
    "totalDocsExamined": 42,
    "executionStages": { ... }
  }
}
```

- **nReturned**: Number of documents returned to the client.
- **executionTimeMillis**: Total time in milliseconds to execute the query.
- **totalKeysExamined**: How many index keys were scanned.
- **totalDocsExamined**: How many documents were loaded from disk or memory.

## The Golden Ratio: nReturned vs totalDocsExamined

The most telling signal is the ratio between `nReturned` and `totalDocsExamined`.

- If `nReturned == totalDocsExamined`, the query is efficient - it read only what it returned.
- If `totalDocsExamined >> nReturned`, MongoDB scanned far more documents than needed, indicating a missing or ineffective index.

Example of a bad query (full collection scan):

```json
{
  "nReturned": 5,
  "totalDocsExamined": 50000
}
```

This means MongoDB read 50,000 documents to find 5. Adding an index on the filter field would fix this.

## Understanding totalKeysExamined

When an index is used, `totalKeysExamined` shows how many index entries were read.

- `totalKeysExamined == nReturned`: A perfectly selective index.
- `totalKeysExamined > nReturned`: The index was used but some keys did not match the full query predicate (e.g., a multi-key scan followed by a filter).

## Reading the executionStages Tree

The `executionStages` field shows the physical plan as a tree of stages:

```javascript
db.orders.find({ status: "pending", region: "us-east" }).explain("executionStats");
```

```json
{
  "executionStages": {
    "stage": "FETCH",
    "nReturned": 42,
    "docsExamined": 42,
    "inputStage": {
      "stage": "IXSCAN",
      "nReturned": 42,
      "keysExamined": 42,
      "indexName": "status_1_region_1"
    }
  }
}
```

- **IXSCAN**: An index scan. Efficient.
- **COLLSCAN**: A collection scan. Usually means no index was used.
- **FETCH**: Retrieving full documents from the collection after an index scan. Normal and acceptable.
- **SORT**: An in-memory sort. Expensive if `usedDisk: true` appears.

## Spotting an In-Memory Sort

If MongoDB has to sort results in memory (no sort-supporting index), you will see:

```json
{
  "stage": "SORT",
  "usedDisk": false,
  "memLimit": 104857600
}
```

If `usedDisk` is `true`, the sort spilled to disk, which is very slow. Add a compound index that supports the sort order.

## Summary

The `executionStats` section of `explain()` is the primary tool for diagnosing query performance in MongoDB. Focus on the ratio of `nReturned` to `totalDocsExamined`, check for COLLSCAN stages, and watch for in-memory SORT operations. When these metrics point to inefficiency, adding a well-chosen index typically resolves the problem.
