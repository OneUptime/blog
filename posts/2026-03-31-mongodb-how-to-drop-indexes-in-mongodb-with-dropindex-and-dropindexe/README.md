# How to Drop Indexes in MongoDB with dropIndex() and dropIndexes()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, dropIndex, dropIndexes, Index Management

Description: Learn how to drop individual and multiple indexes in MongoDB using dropIndex() and dropIndexes() with examples for safe index removal.

---

## Overview

Over time, indexes that are no longer needed waste storage, consume memory, and slow down write operations. MongoDB provides `dropIndex()` to remove a single index and `dropIndexes()` to remove multiple or all non-`_id` indexes from a collection.

## dropIndex() - Remove a Single Index

You can identify the index to drop by its name or by the key specification:

```javascript
// Drop by index name
db.users.dropIndex("email_1")

// Drop by key specification
db.users.dropIndex({ email: 1 })

// Drop a compound index by key
db.orders.dropIndex({ customerId: 1, createdAt: -1 })

// Drop a named index
db.products.dropIndex("idx_category_price")
```

## Finding Index Names Before Dropping

```javascript
// List all indexes to find names
db.users.getIndexes()
// Returns:
// [
//   { key: { _id: 1 }, name: "_id_" },
//   { key: { email: 1 }, name: "email_1", unique: true },
//   { key: { username: 1 }, name: "username_1" },
//   { key: { createdAt: -1 }, name: "createdAt_-1" }
// ]
```

## dropIndexes() - Remove Multiple Indexes

```javascript
// Drop all non-_id indexes on the collection
db.users.dropIndexes()

// Drop specific indexes by name (array of names, MongoDB 4.2+)
db.users.dropIndexes(["email_1", "username_1"])

// Drop a single index by key specification
db.users.dropIndexes({ email: 1 })
```

## Cannot Drop the _id Index

The `_id` index is required and cannot be dropped:

```javascript
db.users.dropIndex("_id_")
// Error: cannot drop _id index
```

## Safe Index Removal Workflow

Before dropping an index in production, follow these steps:

```javascript
// Step 1: Check how frequently the index is used
db.orders.aggregate([{ $indexStats: {} }])
// Look at accesses.ops - low count suggests index is rarely used

// Step 2: Hide the index first to test impact
db.orders.hideIndex("old_status_idx")

// Step 3: Monitor application for 24-48 hours
// If no performance issues are observed...

// Step 4: Drop the index
db.orders.dropIndex("old_status_idx")
```

## Practical Example - Cleaning Up Redundant Indexes

```javascript
// Scenario: compound index makes single-field prefix index redundant
db.orders.getIndexes()
// [
//   { key: { customerId: 1 }, name: "customerId_1" },
//   { key: { customerId: 1, status: 1 }, name: "customerId_1_status_1" }
// ]

// The compound index can serve queries that would use customerId_1 alone
// (MongoDB can use the prefix of a compound index for single-field queries)
db.orders.dropIndex("customerId_1")
// Saves storage and write overhead with no query performance loss
```

## Dropping Indexes on a Sharded Collection

For sharded collections, run `dropIndex()` on the `mongos`:

```javascript
// Connect to mongos and drop the index
db.getSiblingDB("myapp").orders.dropIndex("old_index_1")
// MongoDB propagates the drop to all shards
```

## Checking Index Size Before Dropping

```javascript
// Check index sizes to prioritize which to drop
db.orders.stats().indexSizes
// {
//   "_id_": 2097152,
//   "status_1": 4194304,         // Large index on low-cardinality field
//   "customerId_1_status_1": 8388608
// }
```

## Bulk Index Cleanup Script

```javascript
// List indexes with their usage stats for cleanup decisions
const stats = db.orders.aggregate([{ $indexStats: {} }]).toArray();
stats.forEach(function(stat) {
  print(`Index: ${stat.name}, Ops: ${stat.accesses.ops}, Since: ${stat.accesses.since}`);
});
// Identify indexes with 0 ops and drop them after review
```

## Impact of Dropping Indexes

```text
Benefits of dropping unused indexes:
- Reduced storage usage
- Faster write operations (inserts, updates, deletes)
- Less memory pressure (working set smaller)
- Faster index builds if collection needs rebuilding

Risks:
- Queries that relied on the index will fall back to COLLSCAN
- Significant performance degradation if index was actively used
- Cannot undo a drop (must rebuild from scratch)
```

## Summary

Use `dropIndex()` with either the index name or key specification to remove a single index, and `dropIndexes()` with an array of names to remove multiple indexes at once. Always verify index usage with `$indexStats` before dropping, and consider hiding the index first to safely test the impact. Dropping indexes that are no longer needed improves write throughput, reduces storage, and lowers memory usage. The `_id` index is required and cannot be dropped.
