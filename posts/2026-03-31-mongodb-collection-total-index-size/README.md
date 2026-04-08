# How to Use db.collection.totalIndexSize() in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Storage, Performance, Collection

Description: Learn how db.collection.totalIndexSize() returns the total disk space used by all indexes on a collection and how to use it for index management.

---

## Overview

`db.collection.totalIndexSize()` returns the total size in bytes of all indexes associated with a collection. Understanding index storage is critical because over-indexing can significantly increase memory pressure - MongoDB attempts to keep indexes in RAM for fast lookups, so bloated indexes can degrade query performance.

```javascript
db.orders.totalIndexSize()
// Returns: 5242880  (bytes)
```

## Comparing with Per-Index Sizes

To understand which specific indexes are consuming the most space, use `stats()` alongside `totalIndexSize()`:

```javascript
const stats = db.orders.stats();
print(`Total index size: ${stats.totalIndexSize} bytes`);
print('Per-index breakdown:');
Object.entries(stats.indexSizes).forEach(([name, size]) => {
  const pct = ((size / stats.totalIndexSize) * 100).toFixed(1);
  print(`  ${name}: ${size} bytes (${pct}%)`);
});
```

## Identifying Memory Pressure

MongoDB's WiredTiger cache should ideally hold all working-set indexes. Compare index size against the cache size:

```javascript
const indexBytes  = db.orders.totalIndexSize();
const serverStatus = db.adminCommand({ serverStatus: 1 });
const cacheBytes  = serverStatus.wiredTiger.cache['maximum bytes configured'];

const indexMB = (indexBytes / (1024 * 1024)).toFixed(2);
const cacheMB = (cacheBytes / (1024 * 1024)).toFixed(2);
const pct     = ((indexBytes / cacheBytes) * 100).toFixed(1);

print(`Index size:  ${indexMB} MB`);
print(`Cache size:  ${cacheMB} MB`);
print(`Indexes are ${pct}% of cache`);
```

If indexes exceed available cache, MongoDB will page indexes from disk, causing latency spikes.

## Finding Unused Indexes

Large `totalIndexSize()` combined with unused indexes means wasted resources. Find candidates for removal:

```javascript
db.orders.aggregate([{ $indexStats: {} }]).forEach(stat => {
  print(`${stat.name}: accesses=${stat.accesses.ops}`);
});
```

Any index with zero or near-zero `accesses.ops` since the last server restart is a candidate for removal.

## Shrinking Index Size

If `totalIndexSize()` is too large, consider:

1. **Remove unused indexes** - Drop indexes that `$indexStats` shows are never used.
2. **Use partial indexes** - Index only documents that match a filter condition.
3. **Use sparse indexes** - Skip documents that lack the indexed field to reduce the number of indexed entries.

```javascript
// Partial index example - only index active orders
db.orders.createIndex(
  { createdAt: -1 },
  { partialFilterExpression: { status: 'active' } }
);
```

## Monitoring Index Size Trends

Log `totalIndexSize()` over time to track growth:

```javascript
db.metrics.insertOne({
  ts: new Date(),
  collection: 'orders',
  totalIndexBytes: db.orders.totalIndexSize()
});
```

## Summary

`db.collection.totalIndexSize()` provides a fast way to measure the aggregate storage footprint of all indexes on a collection. Use it alongside `$indexStats` to audit index usage, identify bloat, and decide which indexes to drop. Keeping index sizes in check reduces memory pressure and helps MongoDB serve queries from the WiredTiger cache rather than disk.
