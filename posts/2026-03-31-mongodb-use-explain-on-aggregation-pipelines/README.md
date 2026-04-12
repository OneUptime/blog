# How to Use explain() on Aggregation Pipelines in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Performance, EXPLAIN, Index

Description: Learn how to use explain() on MongoDB aggregation pipelines to analyze query plans, confirm index usage, and identify performance bottlenecks in each stage.

---

## What explain() Does for Aggregation Pipelines

The `explain()` method exposes MongoDB's internal execution plan for an aggregation pipeline. It shows which indexes were used, how many documents were examined versus returned, whether sort operations used indexes or spilled to disk, and how each stage was processed. This makes it the primary tool for understanding and improving aggregation performance.

## Basic explain() Usage

Call `explain()` on the collection before `.aggregate()`, passing the verbosity level as an argument.

```javascript
// queryPlanner: shows the plan without executing the query
db.orders.explain("queryPlanner").aggregate([
  { $match: { status: "shipped" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
]);

// executionStats: executes the query and returns runtime statistics
db.orders.explain("executionStats").aggregate([
  { $match: { status: "shipped" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
]);
```

## Reading the Winning Plan

In the `queryPlanner` section, look at `winningPlan` to see the execution strategy. Key stage types to recognize:

```text
IXSCAN   - Index scan (good, uses an index)
COLLSCAN - Collection scan (bad for large collections)
FETCH    - Document fetch after index scan
SORT     - In-memory sort (may be slow)
```

```javascript
const result = db.sales.explain("queryPlanner").aggregate([
  { $match: { region: "US", year: 2025 } },
  { $sort: { amount: -1 } }
]);

// Access the winning plan
printjson(result.queryPlanner.winningPlan);
```

## Checking executionStats for Performance Data

With `executionStats`, you get actual runtime numbers:

```javascript
const stats = db.events.explain("executionStats").aggregate([
  { $match: { level: "error" } },
  { $group: { _id: "$service", count: { $sum: 1 } } }
]);

printjson(stats.executionStats);
```

Key fields to examine:

```text
nReturned          - Documents returned by the stage
totalDocsExamined  - Total documents scanned
totalKeysExamined  - Index keys examined
executionTimeMillis - Total execution time
```

A high ratio of `totalDocsExamined` to `nReturned` indicates poor selectivity or a missing index.

For stages that can spill to disk (like `$sort` and `$group`), check the stage-level `usedDisk` field in the explain output. If `usedDisk` is `true`, the stage exceeded the memory limit and wrote temporary data to disk.

## Identifying Whether $match Uses an Index

If `$match` is the first stage and an appropriate index exists, the explain output shows `IXSCAN`. If it shows `COLLSCAN`, create a suitable index.

```javascript
// Check if index is used
db.orders.createIndex({ status: 1 });

db.orders.explain("executionStats").aggregate([
  { $match: { status: "pending" } },
  { $count: "total" }
]);
// Look for: "stage": "IXSCAN" in winningPlan
```

## Detecting Blocking Sort Stages

A `$sort` stage that cannot use an index must load all documents into memory before returning results. The explain output shows `SORT` and `SORT_KEY_GENERATOR` stages when this occurs.

```javascript
db.products.explain("executionStats").aggregate([
  { $match: { category: "electronics" } },
  { $sort: { price: -1 } }   // Will this use an index?
]);
// If winningPlan shows SORT, create: { category: 1, price: -1 }
db.products.createIndex({ category: 1, price: -1 });
```

## Summary

Using `explain()` on MongoDB aggregation pipelines is essential for production performance tuning. The `executionStats` verbosity level provides the most actionable data, showing document counts, scan ratios, and whether disk spill occurred. Look for `COLLSCAN` as an indicator of missing indexes, high `totalDocsExamined` to `nReturned` ratios as indicators of poor filter selectivity, and `SORT` stages as indicators of sorts that need supporting compound indexes.
