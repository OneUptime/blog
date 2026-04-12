# How to Troubleshoot MongoDB High Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Memory, WiredTiger, Performance, Troubleshooting

Description: Diagnose MongoDB high memory usage by inspecting WiredTiger cache, connection pools, and index memory, then apply targeted configuration changes.

---

## Overview

MongoDB's WiredTiger storage engine uses a configurable cache to hold frequently accessed data in memory. High memory usage is usually expected behavior, but unbounded growth, OOM kills, or swap usage indicate a problem. This guide covers how to diagnose and resolve common memory issues.

## Step 1: Measure Current Memory Usage

```bash
# Check overall process memory
ps aux | grep mongod | grep -v grep | awk '{print "RSS:", $6/1024, "MB", "VSZ:", $5/1024, "MB"}'

# Detailed memory stats from MongoDB
mongosh --eval 'db.runCommand({ serverStatus: 1 }).mem'
```

```javascript
// In mongosh
const stats = db.runCommand({ serverStatus: 1 });
printjson({
  resident: stats.mem.resident + ' MB',
  virtual: stats.mem.virtual + ' MB'
});
```

## Step 2: Inspect WiredTiger Cache

WiredTiger cache is the largest memory consumer. Check cache utilization.

```javascript
const wt = db.runCommand({ serverStatus: 1 }).wiredTiger.cache;

printjson({
  maxCacheGB: (wt['maximum bytes configured'] / 1e9).toFixed(2),
  currentCacheGB: (wt['bytes currently in the cache'] / 1e9).toFixed(2),
  dirtyGB: (wt['tracked dirty bytes in the cache'] / 1e9).toFixed(2),
  cacheFullPercent: (wt['bytes currently in the cache'] / wt['maximum bytes configured'] * 100).toFixed(1)
});
```

If `cacheFullPercent` is consistently above 95%, the cache is undersized for the working set.

## Step 3: Check Connection Count

Each MongoDB connection uses approximately 1 MB of memory. Too many connections is a common cause of high memory on busy application servers.

```javascript
const status = db.runCommand({ serverStatus: 1 });
printjson({
  current: status.connections.current,
  available: status.connections.available,
  totalCreated: status.connections.totalCreated
});
```

If `current` is unexpectedly high, review your application's connection pool settings.

```javascript
// Node.js driver - limit the pool size
const client = new MongoClient(uri, {
  maxPoolSize: 10,   // Max concurrent connections per server
  minPoolSize: 2
});
```

## Step 4: Inspect Index Memory

Indexes are stored in WiredTiger cache. Large or unused indexes waste cache space.

```javascript
// Check index sizes for a collection
db.orders.stats().indexSizes

// Find unused indexes using $indexStats
db.orders.aggregate([{ $indexStats: {} }]).forEach((idx) => {
  print(`${idx.name}: ${idx.accesses.ops} accesses`);
});
```

Drop indexes with zero or very low access counts.

```javascript
// Drop an unused index
db.orders.dropIndex('old_compound_index_name');
```

## Step 5: Adjust WiredTiger Cache Size

The default cache is 50% of (RAM - 1 GB), or 256 MB, whichever is larger. Lower it on memory-constrained systems.

```yaml
# In /etc/mongod.conf
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
```

Restart MongoDB after changing the cache size.

```bash
sudo systemctl restart mongod
```

## Step 6: Check for Memory Leaks with Aggregation

Aggregation pipelines that cannot use indexes may spill large intermediate results.

```javascript
// Enable disk use for large aggregations to avoid in-memory accumulation
db.orders.aggregate(
  [{ $group: { _id: '$customerId', total: { $sum: '$amount' } } }],
  { allowDiskUse: true }
);
```

## Monitoring Memory Over Time

```bash
# Watch resident memory every 5 seconds
watch -n 5 "mongosh --quiet --eval \
  'db.runCommand({serverStatus:1}).mem.resident + \" MB\"'"
```

## Summary

MongoDB high memory usage is usually driven by WiredTiger cache filling with a large working set, excessive connection counts, or large in-memory indexes. Monitor cache utilization with `serverStatus`, limit connection pool sizes in your application driver, drop unused indexes, and tune `cacheSizeGB` in `mongod.conf` to match available memory. Use `allowDiskUse: true` in aggregations to prevent large pipelines from consuming cache space.
