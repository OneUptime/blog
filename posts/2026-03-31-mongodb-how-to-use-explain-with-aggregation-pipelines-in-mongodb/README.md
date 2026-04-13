# How to Use explain() with Aggregation Pipelines in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Explain Plan, Query Optimization, Performance

Description: Learn how to use explain() with MongoDB aggregation pipelines to analyze stage execution, identify index usage, and optimize slow aggregation queries.

---

## Running explain on Aggregation Pipelines

MongoDB supports three methods for explaining aggregation pipelines:

```javascript
// Method 1: cursor.explain() - preferred
db.orders.explain("executionStats").aggregate([
  { $match: { status: "pending" } },
  { $group: { _id: "$region", total: { $sum: "$amount" } } }
]);

// Method 2: aggregate with explain option
db.orders.aggregate([
  { $match: { status: "pending" } },
  { $group: { _id: "$region", total: { $sum: "$amount" } } }
], { explain: true });

// Method 3: explain command
db.runCommand({
  explain: {
    aggregate: "orders",
    pipeline: [
      { $match: { status: "pending" } },
      { $group: { _id: "$region", total: { $sum: "$amount" } } }
    ],
    cursor: {}
  },
  verbosity: "executionStats"
});
```

## Aggregation Explain Output Structure

```javascript
{
  "queryPlanner": {
    "namespace": "mydb.orders",
    "parsedQuery": {},
    "optimizedPipeline": true,         // pipeline was optimized/rewritten
    "winningPlan": {
      "stage": "GROUP",                // aggregation stages appear here
      "inputStage": {
        "stage": "FETCH",
        "inputStage": {
          "stage": "IXSCAN",
          "indexName": "status_1"
        }
      }
    }
  },
  "executionStats": {
    "nReturned": 4,
    "executionTimeMillis": 18,
    "totalKeysExamined": 1500,
    "totalDocsExamined": 1500,
    "executionStages": { ... }
  },
  "stages": [           // detailed stage breakdown
    {
      "$cursor": {      // the find portion of the pipeline
        "queryPlanner": { ... },
        "executionStats": { ... }
      }
    },
    {
      "$group": {       // the aggregation stage
        "nReturned": 4,
        "timing": { "nReturned": 4, "executionTimeMillisEstimate": 5 }
      }
    }
  ]
}
```

## Key Aggregation Stages in Explain Output

```text
$cursor / IXSCAN   - the initial find/scan stage
GROUP              - $group accumulation
SORT               - $sort (in-memory if no index)
PROJECTION_SIMPLE  - $project
SKIP               - $skip
LIMIT              - $limit
LOOKUP             - $lookup join
UNWIND             - $unwind array elements
ADD_FIELDS         - $addFields
```

## Example 1 - Checking if $match Uses an Index

The most important optimization is ensuring `$match` at the start of a pipeline uses an index:

```javascript
// Query
db.sales.explain("executionStats").aggregate([
  { $match: { region: "west", date: { $gte: new Date("2026-01-01") } } },
  { $group: { _id: "$product", revenue: { $sum: "$amount" } } }
]);
```

```javascript
// Look for IXSCAN in the $cursor stage
"stages": [
  {
    "$cursor": {
      "queryPlanner": {
        "winningPlan": {
          "stage": "FETCH",
          "inputStage": {
            "stage": "IXSCAN",           // GOOD: index used
            "indexName": "region_date_1",
            "indexBounds": {
              "region": ["[\"west\", \"west\"]"],
              "date": ["[new Date(1767225600000), new Date(MaxKey)]"]
            }
          }
        }
      },
      "executionStats": {
        "totalDocsExamined": 2300,       // only 2300 of 500000 docs examined
        "nReturned": 2300
      }
    }
  },
  { "$group": { "nReturned": 12 } }
]
```

## Example 2 - Detecting an Unoptimized Pipeline

When `$match` filters on a field computed by a preceding `$addFields` or `$project`, no index can satisfy the filter. Note that if a `$match` does not depend on computed fields, MongoDB's optimizer may automatically reorder it before `$addFields` or `$project`:

```javascript
// BAD: $match on a computed field cannot use an index
db.orders.explain("executionStats").aggregate([
  { $addFields: { fullName: { $concat: ["$firstName", " ", "$lastName"] } } },
  { $match: { fullName: "John Doe" } }   // computed field, no index possible
]);

// GOOD: $match on indexed fields first, then compute
db.orders.explain("executionStats").aggregate([
  { $match: { status: "pending" } },  // uses index on status
  { $addFields: { fullName: { $concat: ["$firstName", " ", "$lastName"] } } }
]);
```

## Example 3 - $lookup Explain Analysis

```javascript
db.orders.explain("executionStats").aggregate([
  { $match: { status: "pending" } },
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer"
    }
  }
]);
```

```javascript
// Check the LOOKUP stage for index usage
{
  "$lookup": {
    "from": "customers",
    "as": "customer",
    "unwinding": false,
    "foreignFieldIsArray": false,
    "execution": {
      "totalDocsExamined": 1500,
      "indexesUsed": ["_id_"],    // GOOD: _id index used for joins
      "nReturned": 1500
    }
  }
}
```

If `indexesUsed` is empty in the `$lookup` stage, add an index on the `foreignField`.

## Example 4 - Identifying $sort Memory Usage

```javascript
db.orders.explain("executionStats").aggregate([
  { $match: { status: "pending" } },
  { $sort: { amount: -1 } },        // no index on amount
  { $limit: 10 }
]);
```

```javascript
{
  "stage": "SORT",
  "memLimit": 104857600,             // 100MB limit (default since MongoDB 4.4)
  "memUsage": 8340000,              // 8MB used
  "sortPattern": { "amount": -1 },
  "inputStage": { ... }
}
```

High `memUsage` here means you should add an index on the sort field or reorder the pipeline to limit data before sorting.

## Example 5 - Using allowDiskUse with explain

```javascript
// For large aggregations that need disk
db.orders.explain("executionStats").aggregate(
  [
    { $match: { year: 2025 } },
    { $group: { _id: "$category", docs: { $push: "$$ROOT" } } }
  ],
  { allowDiskUse: true }
);
```

## Checking optimizedPipeline Flag

```javascript
{
  "queryPlanner": {
    "optimizedPipeline": true   // MongoDB rewrote your pipeline
  }
}
```

When `optimizedPipeline: true`, MongoDB has internally reordered or merged stages. Your pipeline `{ $sort, $limit }` may have been converted to a top-N sort internally.

## Summary

Using `explain()` with MongoDB aggregation pipelines reveals how each stage executes, whether `$match` stages use indexes, how much memory `$sort` stages consume, and whether `$lookup` joins are indexed. Always put `$match` with indexed fields at the start of your pipeline, check `totalDocsExamined` in the `$cursor` stage to verify index selectivity, and look for `SORT` stages with high `memUsage` that indicate candidates for index-backed sorts or pipeline reordering.
