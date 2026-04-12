# How to Use New Features in MongoDB 7.0 (Compound Wildcard Indexes, AutoMerger)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Wildcard Index, AutoMerger, Feature, Version

Description: Explore MongoDB 7.0's key new features including compound wildcard indexes for dynamic schemas and the AutoMerger for sharded clusters.

---

## Introduction

MongoDB 7.0 introduced compound wildcard indexes, the AutoMerger for automated chunk consolidation in sharded clusters, improved `$lookup` performance, and enhanced time series collection capabilities. This post covers the two most impactful features for schema flexibility and sharding operations.

## Compound Wildcard Indexes

MongoDB 4.2 introduced wildcard indexes, but they could not be combined with other fields in a single index. MongoDB 7.0 lifts this restriction, allowing you to create compound indexes that include both specific field paths and a wildcard component.

### Creating a Compound Wildcard Index

```javascript
db.products.createIndex({
  category: 1,
  "attributes.$**": 1
})
```

This index covers queries that filter on `category` plus any field within the `attributes` subdocument.

### Use Case: Dynamic Attribute Schemas

Compound wildcard indexes are particularly useful when documents have a fixed set of common fields plus a variable set of attributes:

```json
{
  "_id": ObjectId("..."),
  "category": "Electronics",
  "name": "Bluetooth Speaker",
  "attributes": {
    "color": "black",
    "batteryLife": 20,
    "bluetooth": "5.0"
  }
}
```

A query like `{ category: "Electronics", "attributes.color": "black" }` can now use the compound wildcard index without requiring separate indexes for each attribute.

### Checking Index Usage

```javascript
db.products.find({
  category: "Electronics",
  "attributes.batteryLife": { $gte: 10 }
}).explain("executionStats")
```

Look for `IXSCAN` on the compound wildcard index in the `winningPlan`.

### Limitations

- A compound wildcard index can contain only one wildcard term.
- The non-wildcard fields in a compound wildcard index cannot be multikey (array-valued) fields.
- Covered queries on the wildcard portion are only supported when the query specifies exactly one field covered by the wildcard, the projection explicitly excludes `_id` and includes only that field, and the field is never an array.

## AutoMerger

In sharded clusters, chunk splitting over time creates many small chunks, increasing routing overhead and memory usage in `mongos`. MongoDB 7.0 introduces the AutoMerger background process that automatically merges adjacent chunks on the same shard when they can be safely combined.

### Enabling and Disabling AutoMerger

AutoMerger is enabled by default in MongoDB 7.0. To disable it globally:

```javascript
sh.stopAutoMerger()
```

To re-enable it globally:

```javascript
sh.startAutoMerger()
```

To disable it for a specific collection:

```javascript
sh.disableAutoMerger("mydb.orders")
```

To re-enable for a specific collection:

```javascript
sh.enableAutoMerger("mydb.orders")
```

### Manual Merge Trigger

If you want to trigger a merge immediately instead of waiting for the AutoMerger schedule:

```javascript
db.adminCommand({
  mergeAllChunksOnShard: "mydb.orders",
  shard: "shard01"
})
```

## Additional MongoDB 7.0 Highlights

- Slot-based query execution engine (SBE) now supports `$lookup`, `$group`, `$unwind`, and additional aggregation stages, improving pipeline performance.
- Time series collections support creating a TTL index with a `partialFilterExpression` on the `metaField`.
- The `mongosh` shell introduces `sh.stopAutoMerger()` and `sh.startAutoMerger()` helper methods for cluster-wide AutoMerger control.

## Summary

MongoDB 7.0's compound wildcard indexes solve the dynamic-schema indexing problem by allowing a single index to cover queries across variable subdocument fields alongside fixed fields. The AutoMerger eliminates manual chunk consolidation tasks for sharded clusters by automatically merging adjacent chunks. Together these features reduce operational overhead and improve query performance for both flexible-schema and high-scale deployments.
