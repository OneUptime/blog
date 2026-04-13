# How to Handle Large Intermediate Results in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Memory, Performance, Pipeline

Description: Learn techniques to handle large intermediate result sets in MongoDB aggregation pipelines without hitting memory limits or causing performance issues.

---

## The 100MB Memory Limit

By default, each stage in a MongoDB aggregation pipeline is limited to 100MB of RAM. When a stage like `$group` or `$sort` accumulates more data than this limit, MongoDB throws an error unless you explicitly enable disk usage. Understanding why this happens and how to avoid it is key to building efficient pipelines.

## Using allowDiskUse for Spill-to-Disk

The quickest fix is enabling disk-based processing, but this comes at a performance cost:

```javascript
db.events.aggregate(
    [
        { $match: { year: 2024 } },
        { $group: { _id: "$userId", eventCount: { $sum: 1 } } },
        { $sort: { eventCount: -1 } }
    ],
    { allowDiskUse: true }
);
```

Use `allowDiskUse` as a safety net, not a primary strategy. Disk I/O is orders of magnitude slower than memory operations.

## Reduce Data Early with $match and $project

Move `$match` to the very first stage to filter documents before any grouping or sorting:

```javascript
// BAD: $group processes all documents, then $match filters
db.events.aggregate([
    { $group: { _id: "$userId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 100 } } }
]);

// GOOD: $match filters before $group, reducing intermediate data
db.events.aggregate([
    { $match: { status: "active", createdAt: { $gte: new Date("2024-01-01") } } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 100 } } }
]);
```

Similarly, use `$project` early to drop fields you do not need:

```javascript
db.orders.aggregate([
    { $match: { status: "shipped" } },
    {
        $project: {
            customerId: 1,
            amount: 1
            // Only include the fields needed; all others are excluded automatically
        }
    },
    { $group: { _id: "$customerId", total: { $sum: "$amount" } } }
]);
```

## Avoiding $unwind on Large Arrays

`$unwind` multiplies documents by the number of array elements, which can rapidly inflate intermediate result sizes:

```javascript
// BAD: $unwind on large arrays before $group
db.orders.aggregate([
    { $unwind: "$lineItems" },  // Can expand 1M orders to 10M+ documents
    { $group: { _id: "$lineItems.productId", revenue: { $sum: "$lineItems.price" } } }
]);

// BETTER: Use $reduce or accumulator operators without $unwind
db.orders.aggregate([
    {
        $group: {
            _id: null,
            // Use $push and then process in application if needed
            totalRevenue: {
                $sum: {
                    $reduce: {
                        input: "$lineItems",
                        initialValue: 0,
                        in: { $add: ["$$value", "$$this.price"] }
                    }
                }
            }
        }
    }
]);
```

## Chunking Large Aggregations with $bucket

For large datasets, use `$bucket` or `$bucketAuto` to process data in segments:

```javascript
// Process sales data in monthly buckets
db.orders.aggregate([
    { $match: { year: 2024 } },
    {
        $bucket: {
            groupBy: "$month",
            boundaries: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
            default: "Other",
            output: {
                count: { $sum: 1 },
                revenue: { $sum: "$amount" }
            }
        }
    }
]);
```

## Using $merge to Write Intermediate Results

For very large aggregations, write intermediate results to a staging collection and run a second pipeline:

```javascript
// Step 1: Aggregate and write to staging collection
await db.collection('events').aggregate([
    { $match: { year: 2024 } },
    { $group: { _id: { userId: "$userId", month: "$month" }, count: { $sum: 1 } } },
    { $merge: { into: "events_monthly_staging", whenMatched: "replace" } }
]).toArray();

// Step 2: Run summary aggregation on staging collection
const summary = await db.collection('events_monthly_staging').aggregate([
    { $group: { _id: "$_id.userId", totalEvents: { $sum: "$count" } } },
    { $sort: { totalEvents: -1 } },
    { $limit: 100 }
]).toArray();
```

## Cursor-Based Processing for Very Large Results

For aggregations that produce too many output documents, use a cursor with batched processing:

```javascript
const cursor = db.collection('orders').aggregate(
    [
        { $match: { status: "completed" } },
        { $group: { _id: "$region", total: { $sum: "$amount" } } }
    ],
    { allowDiskUse: true, batchSize: 500 }
);

for await (const doc of cursor) {
    await processRegionData(doc);
}
```

## Summary

Handling large intermediate results in MongoDB aggregation requires a combination of filtering early with `$match`, projecting away unused fields, avoiding unnecessary `$unwind`, and using `$merge` to stage results for multi-step pipelines. When pipelines must process large datasets, enable `allowDiskUse` as a fallback but invest in proper indexing and pipeline restructuring for long-term performance.
