# How to Use allowDiskUse for Large Aggregation Pipelines in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Performance, Memory, Pipeline

Description: Learn when and how to use allowDiskUse in MongoDB aggregation pipelines to process large datasets that exceed the 100 MB in-memory limit without errors.

---

MongoDB limits each aggregation pipeline stage to 100 MB of RAM. When a stage like `$sort` or `$group` processes more data than this, MongoDB throws a memory limit error. `allowDiskUse` lets the pipeline spill intermediate results to disk.

## The Error You Are Solving

```text
MongoServerError: PlanExecutor error during aggregation::
Executor error: OperationFailed: Sort exceeded memory limit of 104857600 bytes,
but did not opt in to external sorting.
```

## Enabling allowDiskUse

Pass `{ allowDiskUse: true }` as the second argument to `aggregate`:

```javascript
db.orders.aggregate(
  [
    { $match: { year: 2025 } },
    {
      $group: {
        _id: "$customerId",
        totalSpend: { $sum: "$amount" },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { totalSpend: -1 } }
  ],
  { allowDiskUse: true }
)
```

## Using allowDiskUse in Drivers

**Node.js:**

```javascript
const cursor = db.collection("orders").aggregate(pipeline, {
  allowDiskUse: true
})
```

**Python (PyMongo):**

```python
cursor = db.orders.aggregate(pipeline, allowDiskUse=True)
```

**Go:**

```go
opts := options.Aggregate().SetAllowDiskUse(true)
cursor, err := coll.Aggregate(ctx, pipeline, opts)
```

## Stages That Benefit from allowDiskUse

| Stage    | Memory-intensive because...                       |
|----------|--------------------------------------------------|
| `$sort`  | Must order all documents in the stage             |
| `$group` | Accumulates grouped values before outputting      |
| `$bucket` / `$bucketAuto` | Groups documents into buckets   |
| `$setWindowFields` | Maintains window state across documents |

## Performance Impact

Disk spilling is significantly slower than in-memory processing. Use `allowDiskUse` as a safety net, not a permanent solution. Always try to reduce the pipeline input first:

```javascript
// Before: groups all 50M orders
db.orders.aggregate([
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } }
], { allowDiskUse: true })

// After: filter first to reduce input
db.orders.aggregate([
  { $match: { status: "completed", year: 2025 } },  // reduces to 5M
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } }
], { allowDiskUse: true })
```

## Disabling allowDiskUse Globally (Security)

Starting with MongoDB 6.0, `allowDiskUseByDefault` is `true` by default, meaning aggregation stages can spill to disk without explicitly setting `allowDiskUse: true`. To disable this behavior and require explicit opt-in, set the parameter to `false`:

```javascript
db.adminCommand({
  setParameter: 1,
  allowDiskUseByDefault: false
})
```

On MongoDB versions before 6.0, `allowDiskUse` must be explicitly set per aggregation call.

## When to Use allowDiskUse vs. Creating an Index

- **Create an index** when the expensive stage is `$sort` and the sort fields can be indexed.
- **Use allowDiskUse** for `$group` stages on high-cardinality fields where an index cannot help.
- **Use `$out` or `$merge`** to precompute expensive aggregations and cache results as a collection.

## Summary

Enable `allowDiskUse: true` in `aggregate()` to allow pipeline stages to spill intermediate data to disk when they exceed 100 MB of RAM. It solves memory limit errors for large `$sort` and `$group` operations, but always combine it with upstream `$match` filtering to reduce the data volume and minimize disk I/O.
