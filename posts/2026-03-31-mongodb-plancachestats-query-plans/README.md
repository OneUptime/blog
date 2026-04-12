# How to Use $planCacheStats to Analyze Query Plans in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Performance, $planCacheStats, Query Optimization

Description: Learn how to use $planCacheStats in MongoDB to inspect cached query plans, understand plan selection, and troubleshoot slow queries with winning plan analysis.

---

MongoDB's query planner caches winning query plans to avoid re-evaluating all candidate plans on every execution. The `$planCacheStats` aggregation stage exposes this cache, showing you which plans are stored, how they were selected, and how they perform over time.

## Basic Usage

`$planCacheStats` must be the first stage in the pipeline and returns one document per cached plan entry:

```js
db.orders.aggregate([
  { $planCacheStats: {} }
]);
```

Each result document contains:

- `queryHash` - a hash identifying the query shape
- `planCacheKey` - a hash that includes index information
- `isActive` - whether this is the currently active plan
- `works` - number of work units performed during trial
- `timeOfCreation` - when the plan was cached

## Viewing Active Plans Only

Filter to see only the plans currently being used:

```js
db.orders.aggregate([
  { $planCacheStats: {} },
  { $match: { isActive: true } },
  { $project: { queryHash: 1, planCacheKey: 1, "createdFromQuery.query": 1, "cachedPlan.inputStage.indexName": 1 } }
]);
```

## Finding Plans With High Work Counts

Plans with high `works` values indicate queries that required many steps to complete, which may signal a missing index:

```js
db.orders.aggregate([
  { $planCacheStats: {} },
  { $sort: { works: -1 } },
  { $limit: 5 },
  { $project: { queryHash: 1, works: 1, "createdFromQuery.query": 1 } }
]);
```

## Inspecting the Winning Plan Details

A winning plan entry contains a nested `cachedPlan` tree. Here is how to extract the stage type and index used:

```js
db.orders.aggregate([
  { $planCacheStats: {} },
  { $match: { isActive: true } },
  {
    $project: {
      queryHash: 1,
      winningStage:   "$cachedPlan.stage",
      indexUsed:      "$cachedPlan.inputStage.indexName",
      direction:      "$cachedPlan.inputStage.direction",
      worksEstimate:  "$works"
    }
  }
]);
```

## Clearing the Plan Cache

When you add a new index or change query patterns, stale cached plans can cause regressions. Clear the cache for a collection:

```js
// Clear all cached plans for the collection
db.orders.getPlanCache().clear();

// Clear cached plans for a specific query shape
db.orders.getPlanCache().clearPlansByQuery(
  { status: "pending", region: "us-east" },  // query
  {},                                         // projection
  { status: 1, region: 1 }                   // sort
);
```

## Using explain() Alongside $planCacheStats

`$planCacheStats` shows the cached state; `explain()` shows what the planner would choose right now. Use both together when diagnosing regressions:

```js
// Check the current winning plan for a query
db.orders.find({ status: "pending" }).explain("executionStats");

// Then compare with the cached entry
db.orders.aggregate([
  { $planCacheStats: {} },
  { $match: { "createdFromQuery.query.status": "pending" } }
]);
```

## Common Findings and Actions

| Finding | Action |
|---------|--------|
| High `works` on COLLSCAN stage | Add an index on the query fields |
| Plan uses the wrong index | Use a hint or clear the cache |
| Cache entry is missing | Query shape may not meet caching thresholds |
| Multiple inactive entries | Old plans from before an index was added |

## Summary

`$planCacheStats` gives you direct visibility into MongoDB's plan cache, allowing you to verify which index a query is using, spot queries that scan too many documents, and confirm that new indexes have been adopted. Pair it with `explain()` and `$indexStats` for a complete picture of query performance in your cluster.
