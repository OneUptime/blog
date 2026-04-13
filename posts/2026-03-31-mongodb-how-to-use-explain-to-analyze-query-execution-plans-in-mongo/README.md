# How to Use explain() to Analyze Query Execution Plans in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, explain(), Query Execution Plan, Performance, Query Optimization

Description: Learn how to use MongoDB's explain() method to inspect query execution plans, identify collection scans, and optimize slow queries with proper indexing.

---

## Overview

`explain()` is MongoDB's primary tool for understanding how the query engine executes a query. It reveals whether indexes are used, how many documents are examined, and how long each stage takes. Mastering `explain()` is essential for diagnosing and fixing slow queries.

## Basic Usage

Chain `.explain()` on a `find()` cursor, or use `db.collection.explain()` before `find()`, `aggregate()`, `update()`, or `delete()`:

```javascript
// Returns the query plan without executing the query
db.orders.find({ status: "pending" }).explain();

// Equivalent using explain as a method on the collection
db.orders.explain().find({ status: "pending" });
```

## Verbosity Modes

`explain()` accepts a verbosity string that controls how much information is returned:

```javascript
// "queryPlanner" (default): shows winning plan, does not run the query
db.orders.find({ status: "pending" }).explain("queryPlanner");

// "executionStats": executes the query and returns runtime stats
db.orders.find({ status: "pending" }).explain("executionStats");

// "allPlansExecution": runs all candidate plans and shows stats for each
db.orders.find({ status: "pending" }).explain("allPlansExecution");
```

Use `"executionStats"` in most cases - it gives you actual document counts and execution time.

## Reading the Output

Key fields to look at in `executionStats` mode:

```javascript
db.orders.find({ customerId: "c123", status: "shipped" }).explain("executionStats");
```

```javascript
// Abbreviated output
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",           // index scan - good
        "indexName": "customerId_1_status_1"
      }
    }
  },
  "executionStats": {
    "nReturned": 5,                  // documents returned
    "totalKeysExamined": 5,          // index keys scanned
    "totalDocsExamined": 5,          // documents scanned
    "executionTimeMillis": 1         // query time in ms
  }
}
```

A well-optimized query has `totalDocsExamined` close to `nReturned`.

## Identifying a Collection Scan (COLLSCAN)

A `COLLSCAN` stage means MongoDB scanned every document - a red flag for large collections:

```javascript
// Before index: COLLSCAN
{
  "winningPlan": {
    "stage": "COLLSCAN"   // scans all documents
  },
  "executionStats": {
    "nReturned": 10,
    "totalDocsExamined": 500000   // examined 500k documents to return 10
  }
}

// After adding an index: IXSCAN
db.orders.createIndex({ status: 1, createdAt: -1 });
// Now returns IXSCAN with totalDocsExamined == nReturned
```

## Common Stage Names

| Stage | Meaning |
|---|---|
| `COLLSCAN` | Full collection scan - no index used |
| `IXSCAN` | Index scan |
| `FETCH` | Fetch documents by _id after IXSCAN |
| `SORT` | In-memory sort (not satisfied by an index) |
| `SORT_MERGE` | Merge sorted streams from index |
| `PROJECTION_SIMPLE` | Field projection applied |
| `LIMIT` | Documents limited |
| `SKIP` | Documents skipped |

## Analyzing Aggregation Pipelines

`explain()` also works with `aggregate()`:

```javascript
db.orders.explain("executionStats").aggregate([
  { $match: { status: "pending" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
]);
```

Look at the first `$match` stage - it should use an `IXSCAN` if indexed.

## Practical Workflow for Query Optimization

```javascript
// Step 1: Check the current plan
const plan = await db.collection("orders")
  .find({ region: "US", status: "shipped" })
  .explain("executionStats");

console.log(plan.executionStats.totalDocsExamined);
console.log(plan.executionStats.nReturned);

// If totalDocsExamined >> nReturned, add an index
// Step 2: Create the index
await db.collection("orders").createIndex({ region: 1, status: 1 });

// Step 3: Verify improvement
const plan2 = await db.collection("orders")
  .find({ region: "US", status: "shipped" })
  .explain("executionStats");

console.log(plan2.executionStats.totalDocsExamined);   // should now equal nReturned
```

## Explaining Updates and Deletes

```javascript
// Explain an update
db.orders.explain("executionStats").updateMany(
  { status: "pending", createdAt: { $lt: new Date("2026-01-01") } },
  { $set: { status: "expired" } }
);

// Explain a delete
db.orders.explain("executionStats").deleteMany({ status: "cancelled" });
```

## Summary

`explain()` in `executionStats` mode gives you concrete data about query performance - documents examined, keys scanned, and execution time. A healthy query shows `IXSCAN` with `totalDocsExamined` close to `nReturned`. Whenever you see `COLLSCAN` or a large ratio of examined-to-returned documents, use the information to design an appropriate index and verify the improvement by running `explain()` again.
