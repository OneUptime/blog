# How to Read the queryPlanner Output in MongoDB explain()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query Optimization, Explain Plan, Performance, Indexing

Description: Learn how to interpret MongoDB's queryPlanner explain output to understand which indexes are chosen, how query stages are structured, and why plans are selected.

---

## What Is the queryPlanner Output

When you call `explain()` on a MongoDB query, the `queryPlanner` section describes the query plan the optimizer chose without actually executing the query. It shows which index was selected, how stages are chained, and what the rejected alternatives were - all without touching real data.

## Running explain with queryPlanner

```javascript
// Default mode = "queryPlanner"
db.orders.explain().find({ status: "pending", customerId: "cust-123" });

// Explicit mode
db.orders.explain("queryPlanner").find({ status: "pending", customerId: "cust-123" });

// As a command
db.runCommand({
  explain: {
    find: "orders",
    filter: { status: "pending", customerId: "cust-123" }
  },
  verbosity: "queryPlanner"
});
```

## Sample queryPlanner Output

```javascript
{
  "queryPlanner": {
    "plannerVersion": 1,
    "namespace": "mydb.orders",
    "indexFilterSet": false,
    "parsedQuery": {
      "$and": [
        { "customerId": { "$eq": "cust-123" } },
        { "status": { "$eq": "pending" } }
      ]
    },
    "queryHash": "A1B2C3D4",
    "planCacheKey": "E5F6G7H8",
    "winningPlan": {
      "stage": "FETCH",
      "filter": { "status": { "$eq": "pending" } },
      "inputStage": {
        "stage": "IXSCAN",
        "keyPattern": { "customerId": 1 },
        "indexName": "customerId_1",
        "isMultiKey": false,
        "multiKeyPaths": { "customerId": [] },
        "isUnique": false,
        "isSparse": false,
        "isPartial": false,
        "indexVersion": 2,
        "direction": "forward",
        "indexBounds": {
          "customerId": [ "[\"cust-123\", \"cust-123\"]" ]
        }
      }
    },
    "rejectedPlans": [
      {
        "stage": "COLLSCAN",
        "filter": { ... },
        "direction": "forward"
      }
    ]
  }
}
```

## Key Fields Explained

### namespace

```text
"namespace": "mydb.orders"
```
Tells you the database and collection being queried.

### parsedQuery

```javascript
"parsedQuery": {
  "$and": [
    { "customerId": { "$eq": "cust-123" } },
    { "status": { "$eq": "pending" } }
  ]
}
```
The normalized form of your query filter. Useful for seeing how MongoDB internally re-writes your query.

### winningPlan Stages

```text
Common stage types:
- COLLSCAN    : full collection scan (no index)
- IXSCAN      : index scan
- FETCH       : retrieve full documents from collection using record IDs from index
- SORT        : in-memory sort (no index supports sort)
- SORT_MERGE  : merge sorted streams from multiple index scans ($or or index intersection)
- PROJECTION_SIMPLE : apply a projection
- LIMIT       : limit result count
- SKIP        : skip documents
- SHARD_MERGE : merge results across shards
- SHARDING_FILTER : filter orphan documents on shards
```

### Reading a Nested Plan Tree

Plans are read bottom-up (innermost = executed first):

```javascript
{
  "stage": "LIMIT",                    // Step 3: apply limit
  "limitAmount": 10,
  "inputStage": {
    "stage": "FETCH",                  // Step 2: fetch full docs
    "inputStage": {
      "stage": "IXSCAN",               // Step 1: scan index
      "indexName": "customerId_status",
      "indexBounds": { ... }
    }
  }
}
```

## Reading IXSCAN Details

```javascript
{
  "stage": "IXSCAN",
  "keyPattern": { "customerId": 1, "status": 1 },  // index definition
  "indexName": "customerId_status_1",
  "isMultiKey": false,      // true if index is on an array field
  "isUnique": false,
  "isSparse": false,
  "isPartial": false,
  "direction": "forward",   // "backward" if sorting descending
  "indexBounds": {
    "customerId": [ "[\"cust-123\", \"cust-123\"]" ],
    "status": [ "[\"pending\", \"pending\"]" ]
  }
}
```

`indexBounds` tells you exactly which portion of the index is being scanned. Tight bounds (equality) are more efficient than range bounds.

## Identifying a Covered Query

A query is "covered" when no FETCH stage is needed - all data comes from the index:

```javascript
// Covered query - only requests fields in the index
db.orders.explain().find(
  { customerId: "cust-123" },
  { _id: 0, customerId: 1, status: 1 }
);

// Look for: no FETCH stage above IXSCAN
// winningPlan.stage should be PROJECTION_COVERED -> IXSCAN
```

## Understanding rejectedPlans

```javascript
"rejectedPlans": [
  {
    "stage": "FETCH",
    "inputStage": {
      "stage": "IXSCAN",
      "indexName": "status_1",
      "indexBounds": {
        "status": [ "[\"pending\", \"pending\"]" ]
      }
    }
  }
]
```
The optimizer considered the `status_1` index but rejected it (probably because it's less selective than `customerId_1`). If you see a better plan in `rejectedPlans`, you may want to use a hint.

## indexFilterSet

```text
"indexFilterSet": false
```
If `true`, an index filter (set via `planCacheSetFilter`) is limiting which indexes the planner considers. This can explain why an expected index isn't being used.

## queryHash and planCacheKey

```text
"queryHash": "A1B2C3D4"
"planCacheKey": "E5F6G7H8"
```
`queryHash` identifies queries with the same shape. `planCacheKey` identifies the plan cache entry including current indexes. Use these to correlate slow query logs with plan cache entries.

## Common Red Flags in queryPlanner

```text
COLLSCAN as winningPlan  -> No usable index. Add an index.
SORT stage above IXSCAN  -> Index does not support sort. Use a compound index.
isMultiKey: true         -> Array field in index. More overhead.
indexBounds: [MinKey, MaxKey] -> Full index scan, not a selective lookup.
```

## Summary

The `queryPlanner` output shows which plan MongoDB chose and why, without executing the query. Read the `winningPlan` tree bottom-up to follow execution flow, check `indexBounds` for selectivity, look for FETCH stages that could be eliminated with covered queries, and inspect `rejectedPlans` to understand what alternatives the optimizer considered. This is the first tool to reach for when investigating unexpectedly slow queries.
