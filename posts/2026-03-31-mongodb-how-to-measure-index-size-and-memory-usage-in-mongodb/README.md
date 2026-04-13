# How to Measure Index Size and Memory Usage in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Indexing, Performance, Memory, WiredTiger

Description: Learn how to measure index sizes and memory usage in MongoDB using built-in commands and understand how to keep indexes in RAM for optimal performance.

---

## Why Index Size and Memory Usage Matter

MongoDB's WiredTiger storage engine caches frequently accessed data and indexes in RAM. When indexes fit in memory, queries are fast. When indexes exceed available RAM, MongoDB must read from disk, causing significant performance degradation.

## Checking Index Sizes for a Collection

Use `db.collection.stats()` to see individual index sizes:

```javascript
db.orders.stats({ indexDetails: true })
```

The output includes `indexSizes` with sizes in bytes for each index:

```javascript
db.orders.stats().indexSizes
// Example output:
// {
//   "_id_": 12345678,
//   "customerId_1_createdAt_-1": 8765432,
//   "status_1": 4321098
// }
```

## Getting Total Index Size

```javascript
// Total index size in bytes for the collection
db.orders.totalIndexSize()

// In megabytes
db.orders.totalIndexSize() / (1024 * 1024)
```

## Checking Database-Level Index Sizes

To see index sizes across all collections in a database:

```javascript
db.stats()
// Look for indexSize field (in bytes by default)

// In megabytes
db.stats(1024 * 1024)
// Returns dataSize, storageSize, indexSize in MB
```

## Using serverStatus for WiredTiger Cache

Check how much of your cache is used by indexes:

```javascript
db.serverStatus().wiredTiger.cache
```

Key fields to monitor:

```text
"bytes currently in the cache"       - total cache used
"tracked bytes belonging to leaf pages in the cache" - leaf page data in cache
"pages read into cache"              - disk reads (high = indexes not in RAM)
"pages evicted from cache"           - evictions (high = memory pressure)
```

## Checking Index Usage with indexStats

See which indexes are actually being used and how often:

```javascript
db.orders.aggregate([{ $indexStats: {} }])
```

Example output:

```javascript
[
  {
    name: "customerId_1",
    key: { customerId: 1 },
    accesses: { ops: 15420, since: ISODate("2026-01-01T00:00:00Z") },
    spec: { key: { customerId: 1 }, name: "customerId_1" }
  }
]
```

## Estimating Required Index Memory

As a rough estimate, compound indexes on numeric fields use about 20-30 bytes per document entry. String fields depend on string length. Use the current index size as your baseline:

```javascript
// Script to list all indexes with sizes across all collections
db.getCollectionNames().forEach(function(coll) {
  var stats = db[coll].stats();
  print(coll + ":");
  printjson(stats.indexSizes);
});
```

## Comparing Index Size to Available RAM

```javascript
var totalIndexSize = 0;
db.getCollectionNames().forEach(function(coll) {
  totalIndexSize += db[coll].totalIndexSize();
});
print("Total index size (MB): " + (totalIndexSize / 1024 / 1024).toFixed(2));

// Compare to WiredTiger cache size
var cacheBytes = db.serverStatus().wiredTiger.cache["maximum bytes configured"];
print("WiredTiger cache (MB): " + (cacheBytes / 1024 / 1024).toFixed(2));
```

If total index size approaches or exceeds cache size, consider:
- Dropping unused indexes
- Using partial indexes to reduce index size
- Increasing server RAM

## Monitoring Index Memory with Atlas or Ops Manager

In MongoDB Atlas, navigate to Metrics > Index Size to view historical index size trends. Set alerts when index size exceeds 75% of available RAM.

## Summary

Measure index sizes using `db.collection.stats().indexSizes` and `db.collection.totalIndexSize()`. Monitor WiredTiger cache pressure with `db.serverStatus().wiredTiger.cache`. Keeping working indexes in RAM is critical for query performance - when indexes exceed available cache, reads spill to disk and latency increases significantly. Regularly audit index sizes and drop unused indexes to maintain a lean, memory-efficient index set.
