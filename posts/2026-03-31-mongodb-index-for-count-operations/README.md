# How to Index for Count Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Count, Index, Performance, Aggregation

Description: Learn how to use indexes to speed up MongoDB count operations, the difference between countDocuments and estimatedDocumentCount, and when to use a counter pattern.

---

## Count Methods in MongoDB

MongoDB provides three ways to count documents, each with different performance characteristics:

```javascript
// 1. estimatedDocumentCount() - fastest, uses collection metadata
db.orders.estimatedDocumentCount();

// 2. countDocuments() - accurate, uses query predicates with indexes
db.orders.countDocuments({ status: "pending" });

// 3. Aggregation $count - flexible, integrates with pipelines
db.orders.aggregate([{ $match: { status: "pending" } }, { $count: "total" }]);
```

## estimatedDocumentCount

`estimatedDocumentCount()` reads from collection metadata and does not scan any documents. It is O(1) but returns an estimate (may be slightly off after unclean shutdowns):

```javascript
// Near-instant, no index needed
const total = await db.collection("orders").estimatedDocumentCount();
```

Use this for displaying rough collection sizes, not for filtered counts.

## countDocuments with Indexes

`countDocuments()` with a filter uses indexes just like `find()`. Create an index on the fields you filter on:

```javascript
// Index to support counting by status
db.orders.createIndex({ status: 1 });

// Uses the index - efficient
db.orders.countDocuments({ status: "pending" });

// Compound index for multi-field count
db.orders.createIndex({ userId: 1, status: 1 });
db.orders.countDocuments({ userId: "u123", status: "completed" });
```

## Covered Count (Fastest Filtered Count)

A count query can be "covered" if all filter fields are in the index and MongoDB does not need to fetch documents:

```javascript
// This count is covered by the compound index
db.orders.createIndex({ status: 1, createdAt: 1 });

db.orders.explain("executionStats").countDocuments({ status: "pending" });
```

Look for `totalDocsExamined: 0` in the explain output - this confirms a covered count that reads only index entries.

## Verify with explain()

```javascript
db.orders.explain("executionStats").countDocuments({ status: "pending" });
```

Key fields:

```json
{
  "executionStats": {
    "nReturned": 0,
    "totalDocsExamined": 0,
    "totalKeysExamined": 847,
    "executionTimeMillis": 1
  },
  "winningPlan": {
    "stage": "COUNT_SCAN"
  }
}
```

`COUNT_SCAN` with `totalDocsExamined: 0` is the ideal outcome for a filtered count.

## Counter Pattern for High-Frequency Counts

For counts that are queried many times per second (e.g., unread message count, cart item count), maintain a counter document instead of running `countDocuments` on each request:

```javascript
// Counter document
db.counters.insertOne({ key: "pending_orders", count: 0 });

// Increment when an order is created
db.counters.updateOne({ key: "pending_orders" }, { $inc: { count: 1 } });

// Decrement when order is processed
db.counters.updateOne({ key: "pending_orders" }, { $inc: { count: -1 } });

// O(1) count read
const result = await db.collection("counters").findOne({ key: "pending_orders" });
console.log(result.count);
```

Reconcile the counter periodically to handle drift:

```javascript
const actual = await db.collection("orders").countDocuments({ status: "pending" });
await db.collection("counters").updateOne(
  { key: "pending_orders" },
  { $set: { count: actual } }
);
```

## Count in Aggregation

Use `$count` in a pipeline for counts after complex filtering:

```javascript
db.orders.aggregate([
  { $match: { status: "completed", createdAt: { $gte: new Date("2026-01-01") } } },
  { $group: { _id: "$userId" } },
  { $count: "uniqueCustomers" },
]);

// Index to support the $match
db.orders.createIndex({ status: 1, createdAt: -1 });
```

## Summary

`estimatedDocumentCount()` is O(1) but approximate. `countDocuments()` with a filter uses indexes exactly like `find()` - create indexes on your filter fields for efficient counts. A covered count (all filter fields in the index, no document fetches) is the fastest filtered count. For very high-frequency count reads, maintain a denormalized counter document using `$inc` and reconcile it periodically with the actual count.
