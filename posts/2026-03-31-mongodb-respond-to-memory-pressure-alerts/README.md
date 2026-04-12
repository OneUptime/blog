# How to Respond to MongoDB Memory Pressure Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Memory, Alert, Performance, WiredTiger

Description: Learn how to diagnose and resolve MongoDB memory pressure alerts by analyzing the WiredTiger cache, reducing working set size, and scaling memory appropriately.

---

## What Causes Memory Pressure in MongoDB

MongoDB's WiredTiger storage engine uses an in-memory cache (default: 50% of (RAM minus 1 GB)). When the working set exceeds the cache size, WiredTiger evicts pages to disk, increasing read latency dramatically. Atlas fires memory pressure alerts when the cache dirty bytes or eviction rate crosses a threshold.

## Step 1: Assess Current Memory Usage

```javascript
const ss = db.adminCommand({ serverStatus: 1 });
const wt = ss.wiredTiger.cache;

print("Cache size bytes:    ", wt["maximum bytes configured"]);
print("Currently in cache:  ", wt["bytes currently in the cache"]);
print("Dirty bytes:         ", wt["tracked dirty bytes in the cache"]);
print("Pages evicted:       ", wt["pages evicted by application threads"]);
print("Pages read into cache:", wt["pages read into cache"]);
```

A high `pages evicted by application threads` count means the application is blocking on eviction - a sign of severe cache pressure.

## Step 2: Identify the Working Set

The working set is the data and indexes accessed in a rolling time window. If indexes do not fit in cache, every query requires a disk read.

Check total index size vs. available cache:

```javascript
db.getCollectionNames().forEach(name => {
  const s = db[name].stats();
  if (s.totalIndexSize > 100 * 1024 * 1024) {
    print(name, "indexes:", (s.totalIndexSize / 1e9).toFixed(2) + " GB");
  }
});
```

If total indexes exceed the cache size, you will see persistent cache pressure.

## Step 3: Reduce the Working Set

### Remove unused indexes

```javascript
// Check index usage stats (MongoDB 3.2+)
db.orders.aggregate([{ $indexStats: {} }])
  .forEach(idx => {
    print(JSON.stringify(idx.name), "accesses:", idx.accesses.ops);
  });
```

Drop indexes with zero or very low access counts:

```javascript
db.orders.dropIndex("old_composite_idx");
```

### Project only needed fields

Reducing the size of returned documents reduces cache churn:

```javascript
// Fetch only needed fields
db.orders.find({ status: "pending" }, { customerId: 1, total: 1, createdAt: 1 });
```

### Use covered queries

When a query can be satisfied entirely from an index (no FETCH stage), documents never need to be loaded into cache:

```javascript
db.orders.createIndex({ status: 1, customerId: 1, total: 1 });
db.orders.find({ status: "pending" }, { customerId: 1, total: 1, _id: 0 })
  .explain(); // should show IXSCAN with no FETCH
```

## Step 4: Tune the WiredTiger Cache

Increase the cache size on self-managed MongoDB:

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8
```

On Atlas, scale up the tier to get more RAM. Atlas M30 gives 8 GB RAM, M50 gives 32 GB.

```bash
atlas clusters update MyCluster --tier M50
```

## Step 5: Monitor Cache Hit Rate

A healthy cache hit rate should be above 95%:

```javascript
const wt = db.adminCommand({ serverStatus: 1 }).wiredTiger.cache;
const reads = wt["pages read into cache"];
const hits  = wt["pages requested from the cache"];
const hitRate = ((hits - reads) / hits * 100).toFixed(1);
print("Cache hit rate:", hitRate + "%");
```

## Summary

MongoDB memory pressure is caused by a working set (data plus indexes) that exceeds the WiredTiger cache. Diagnose with `serverStatus` to check eviction rates and cache utilization. Reduce the working set by dropping unused indexes, projecting only needed fields, and using covered queries. Scale the WiredTiger cache size in the config file or upgrade the Atlas tier to get more RAM. Aim for a cache hit rate above 95% under normal load.
