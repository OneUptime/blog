# How to Use $collStats and $indexStats for Performance Monitoring in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Performance, $collStats, $indexStats

Description: Learn how to use $collStats and $indexStats aggregation stages in MongoDB to monitor collection sizes, storage stats, and index usage in production.

---

MongoDB's `$collStats` and `$indexStats` are special aggregation stages that return storage and operational metadata about a collection without scanning actual documents. They are essential tools for understanding performance bottlenecks and identifying unused indexes.

## $collStats - Collection Statistics

`$collStats` must be the first stage in an aggregation pipeline. It returns one document per shard (or one document for unsharded collections).

### Storage and Count Stats

```js
db.orders.aggregate([
  {
    $collStats: {
      storageStats: {},
      count: {}
    }
  }
]);
```

Key fields in the result include:

- `storageStats.size` - uncompressed data size in bytes
- `storageStats.storageSize` - on-disk storage size
- `storageStats.totalIndexSize` - total size of all indexes
- `count.count` - total document count

### Latency Statistics

Track average read and write latency for a collection:

```js
db.orders.aggregate([
  {
    $collStats: {
      latencyStats: { histograms: true }
    }
  },
  {
    $project: {
      "latencyStats.reads.latency": 1,
      "latencyStats.writes.latency": 1
    }
  }
]);
```

### Query Execution Stats

```js
db.orders.aggregate([
  { $collStats: { queryExecStats: {} } }
]);
```

This returns `queryExecStats.collectionScans.total` and `queryExecStats.collectionScans.nonTailable` to help you determine how often collection scans are occurring.

## $indexStats - Index Usage Statistics

`$indexStats` returns one document per index on the collection, showing how many times each index has been used since the last server restart or since the index was created, whichever is more recent.

```js
db.orders.aggregate([
  { $indexStats: {} }
]);
```

Sample output for one index:

```text
{
  name: "status_1_createdAt_-1",
  key: { status: 1, createdAt: -1 },
  accesses: { ops: 14823, since: ISODate("2026-01-01T00:00:00Z") },
  host: "mongo1:27017"
}
```

### Finding Unused Indexes

Filter to show indexes with zero access operations:

```js
db.orders.aggregate([
  { $indexStats: {} },
  { $match: { "accesses.ops": { $eq: 0 } } },
  { $project: { name: 1, key: 1, "accesses.ops": 1 } }
]);
```

Unused indexes consume memory and slow down writes. After confirming an index is unused over a representative time window, you can drop it:

```js
db.orders.dropIndex("status_1_createdAt_-1");
```

## Combining Both Stages in a Script

```js
function collectionReport(collName) {
  const myDb = db.getSiblingDB("myApp");
  const stats = myDb[collName].aggregate([
    { $collStats: { storageStats: {}, count: {} } }
  ]).toArray()[0];

  const unusedIndexes = myDb[collName].aggregate([
    { $indexStats: {} },
    { $match: { "accesses.ops": 0 } }
  ]).toArray();

  print(`Collection: ${collName}`);
  print(`Documents: ${stats.count.count}`);
  print(`Storage: ${(stats.storageStats.size / 1024 / 1024).toFixed(2)} MB`);
  print(`Unused indexes: ${unusedIndexes.map(i => i.name).join(", ") || "none"}`);
}
```

## Summary

`$collStats` gives you a detailed snapshot of collection storage, document counts, and operation latency without reading documents. `$indexStats` reveals which indexes are actively used and which are idle. Together, they are the foundation of data-driven index management and storage optimization in MongoDB production environments.
