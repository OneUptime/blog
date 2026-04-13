# How to Detect Sort in Memory in MongoDB Explain Plans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query Optimization, Explain Plan, Sorting, Indexing

Description: Learn how to detect in-memory sorts in MongoDB explain plans, understand their performance impact, and fix them with appropriate compound indexes.

---

## What Is an In-Memory Sort

An in-memory sort occurs when MongoDB cannot satisfy a query's sort requirement using an index and must load all matching documents into a buffer, sort them, then return results. This is significantly more expensive than an index-backed sort because:

- All qualifying documents must be loaded into RAM
- There is a 100MB default memory limit (controlled by `internalQueryMaxBlockingSortMemoryUsageBytes`; 32MB in versions before 4.4)
- Without `allowDiskUse`, the query fails if the sort exceeds this limit; with `allowDiskUse`, MongoDB spills to disk
- It blocks further result delivery until the entire sort completes

## Detecting a SORT Stage

Look for a `SORT` stage in the `winningPlan` tree:

```javascript
db.orders.explain("executionStats").find(
  { status: "pending" },
  {}
).sort({ createdAt: -1 });
```

```javascript
// In-memory sort detected - look for SORT stage
{
  "winningPlan": {
    "stage": "SORT",                        // <-- in-memory sort
    "sortPattern": { "createdAt": -1 },
    "memLimit": 104857600,                   // 100MB limit (default since MongoDB 4.4)
    "type": "simple",
    "inputStage": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",
        "indexName": "status_1",
        "indexBounds": {
          "status": [ "[\"pending\", \"pending\"]" ]
        }
      }
    }
  }
}
```

The `SORT` stage above the `FETCH`/`IXSCAN` stages means: first scan the index for matching docs, fetch them, then sort in memory.

## Execution Stats When Sort Is Present

```javascript
{
  "executionStats": {
    "nReturned": 1000,
    "executionTimeMillis": 245,
    "totalDocsExamined": 1000,
    "executionStages": {
      "stage": "SORT",
      "nReturned": 1000,
      "executionTimeMillisEstimate": 230,
      "memUsage": 2847200,      // bytes used by sort buffer
      "memLimit": 104857600,    // 100MB default limit (since MongoDB 4.4)
      "sortPattern": { "createdAt": -1 },
      "inputStage": { ... }
    }
  }
}
```

`memUsage` tells you how much RAM the sort consumed. If this approaches `memLimit`, the query will fail without `allowDiskUse(true)`.

## Contrast: Index-Backed Sort (No SORT Stage)

```javascript
// After adding a compound index: { status: 1, createdAt: -1 }
{
  "winningPlan": {
    "stage": "FETCH",           // No SORT stage
    "inputStage": {
      "stage": "IXSCAN",
      "indexName": "status_createdAt_1",
      "direction": "forward",   // index scan delivers pre-sorted docs
      "indexBounds": {
        "status": [ "[\"pending\", \"pending\"]" ],
        "createdAt": [ "[MaxKey, MinKey]" ]
      }
    }
  }
}
```

No `SORT` stage = sort satisfied by index. This is always preferable.

## Fixing In-Memory Sorts with Compound Indexes

### Rule: Equality fields first, then sort fields

```javascript
// Query: filter on status, sort by createdAt
db.orders.find({ status: "pending" }).sort({ createdAt: -1 });

// Wrong index - sort can't use this
db.orders.createIndex({ createdAt: -1 });         // only sort field

// Right index - equality field before sort field
db.orders.createIndex({ status: 1, createdAt: -1 });
```

### Rule: Direction must match or be exactly reversed

```javascript
// Query sorts by { a: 1, b: -1 }
// These indexes CAN satisfy the sort:
{ a: 1, b: -1 }    // exact match
{ a: -1, b: 1 }    // exact reverse

// These CANNOT (mixed direction mismatch):
{ a: 1, b: 1 }
{ a: -1, b: -1 }
```

## Range Filter + Sort (The ESR Rule)

For queries with equality, sort, and range components, follow the ESR (Equality-Sort-Range) order in compound indexes:

```javascript
// Query: find by status (equality), sort by date, filter by amount range
db.orders.find({
  status: "pending",          // equality
  amount: { $gte: 100 }       // range
}).sort({ createdAt: -1 });   // sort

// WRONG order - range before sort blocks index-backed sort
db.orders.createIndex({ status: 1, amount: 1, createdAt: -1 });

// RIGHT order - ESR: equality, sort, range
db.orders.createIndex({ status: 1, createdAt: -1, amount: 1 });
```

## Checking SORT_KEY_GENERATOR Stage

In MongoDB 5.0+, a `SORT_KEY_GENERATOR` stage appears as part of in-memory sort processing to extract sort key values from documents:

```javascript
{
  "stage": "SORT",
  "inputStage": {
    "stage": "SORT_KEY_GENERATOR",
    "inputStage": {
      "stage": "FETCH",
      "inputStage": { "stage": "IXSCAN" }
    }
  }
}
```

This is still an in-memory sort - `SORT_KEY_GENERATOR` just extracts the sort key values before the actual sort.

## Script to Audit Slow Queries for In-Memory Sorts

```javascript
// Check current operations and explain slow queries (MongoDB 4.2+)
db.currentOp({ active: true, secs_running: { $gte: 1 } }).inprog.forEach(op => {
  if (op.op === "query" && op.command) {
    const plan = db.getSiblingDB(op.ns.split(".")[0])
      .getCollection(op.ns.split(".")[1])
      .explain("queryPlanner")
      .find(op.command.filter || {});

    const hasSort = JSON.stringify(plan).includes('"stage":"SORT"');
    if (hasSort) {
      print(`SORT stage detected for query on ${op.ns}`);
    }
  }
});
```

## Summary

In-memory sorts appear as `SORT` stages in MongoDB explain plans and indicate that no index covers the query's sort requirements. Detect them by checking `winningPlan` for a `SORT` stage and monitor `memUsage` in `executionStats` to anticipate memory limit violations (100MB by default since MongoDB 4.4). Fix them by creating compound indexes that place equality filter fields first, followed by sort fields, and range filter fields last - the ESR rule. Index-backed sorts eliminate the `SORT` stage entirely and allow MongoDB to stream results without loading all matching documents into memory.
