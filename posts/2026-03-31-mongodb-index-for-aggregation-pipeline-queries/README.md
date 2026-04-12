# How to Index for Aggregation Pipeline Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Index, Pipeline, Performance

Description: Learn which aggregation pipeline stages benefit from indexes, how to position $match and $sort to use indexes, and how to read aggregation explain output.

---

## How Indexes Apply to Aggregation

In MongoDB aggregation pipelines, only the initial stages can use indexes efficiently. Once data passes through a stage that transforms or reshapes documents, subsequent stages operate on the in-memory result set. The two stages that can use indexes at the beginning of a pipeline are `$match` and `$sort`, and a compound index can cover both when they appear as the first stages.

## Place $match First

Always place `$match` as the first stage to leverage indexes and reduce the working document set:

```javascript
// GOOD - $match first reduces documents before grouping
db.orders.aggregate([
  { $match: { status: "completed", createdAt: { $gte: new Date("2026-01-01") } } },
  { $group: { _id: "$userId", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } },
]);

// BAD - $group first processes all documents
db.orders.aggregate([
  { $group: { _id: "$userId", total: { $sum: "$amount" } } },
  { $match: { total: { $gt: 1000 } } },
]);
```

## Index for $match in Aggregation

Create the same indexes you would for `find()` queries, since `$match` uses them identically:

```javascript
// Support the $match in the pipeline above
db.orders.createIndex({ status: 1, createdAt: -1 });
```

## Place $sort After $match, Before $group

When `$sort` appears before `$group`, MongoDB can use an index for sorting:

```javascript
// $sort uses index if it appears early in the pipeline
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $sort: { createdAt: -1 } }, // Uses index if available
  { $limit: 100 },
  { $group: { _id: "$userId", lastOrder: { $first: "$createdAt" } } },
]);

// Supporting compound index (ESR rule)
db.orders.createIndex({ status: 1, createdAt: -1 });
```

## Verify with explain()

```javascript
db.orders.explain("executionStats").aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$userId", total: { $sum: "$amount" } } },
]);
```

Look for `IXSCAN` in the query planner section:

```json
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "PROJECTION_SIMPLE",
      "inputStage": {
        "stage": "FETCH",
        "inputStage": {
          "stage": "IXSCAN",
          "indexName": "status_1_createdAt_-1"
        }
      }
    }
  }
}
```

## $group Does Not Use Indexes

`$group` always performs an in-memory operation. Reducing the document set before `$group` with `$match` is the only way to speed up grouping operations.

## allowDiskUse for Large Pipelines

For aggregations that exceed the 100 MB in-memory limit:

```javascript
db.orders.aggregate(
  [
    { $match: { status: "completed" } },
    { $group: { _id: "$product", revenue: { $sum: "$amount" } } },
    { $sort: { revenue: -1 } },
  ],
  { allowDiskUse: true }
);
```

## $lookup and Indexes on the Foreign Collection

`$lookup` performs a join. The index must exist on the `from` collection's `foreignField`:

```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user",
    },
  },
]);

// Index on users._id already exists (it's the _id index)
// For non-_id foreign fields, create an index explicitly
db.users.createIndex({ externalId: 1 });
```

## Summary

Aggregation pipeline performance depends heavily on stage ordering. Place `$match` first to use indexes and reduce document volume. Follow with `$sort` before `$group` when sorted intermediate results matter. The `$group` stage always operates in memory - minimize the document set entering it. Use `explain()` on aggregation pipelines to verify `IXSCAN` in the winning plan, and enable `allowDiskUse` for pipelines exceeding the 100 MB memory limit.
