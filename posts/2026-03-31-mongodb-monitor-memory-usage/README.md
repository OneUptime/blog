# How to Monitor Memory Usage in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Memory, Monitoring, WiredTiger, Performance

Description: Learn how to monitor MongoDB memory usage using serverStatus, mongostat, and WiredTiger cache metrics to keep your deployment healthy.

---

## Understanding MongoDB Memory Usage

MongoDB memory consumption comes from three main areas: the WiredTiger cache (the primary working set), the filesystem cache (used by the OS to buffer data files), and internal process memory for connections, aggregation buffers, and sort operations.

Monitoring all three helps you distinguish between normal operation and a memory leak or misconfiguration.

## Using db.serverStatus() for Memory Metrics

The `serverStatus` command returns a comprehensive snapshot of memory usage:

```javascript
const status = db.runCommand({ serverStatus: 1 });

// Resident memory (physical RAM used by mongod process, in MB)
print("Resident MB:", status.mem.resident);

// Virtual memory
print("Virtual MB:", status.mem.virtual);

// WiredTiger cache details
const wt = status.wiredTiger.cache;
print("Cache used bytes:", wt["bytes currently in the cache"]);
print("Cache max bytes:", wt["maximum bytes configured"]);
print("Pages evicted:", wt["pages evicted by application threads"]);
```

Resident memory growing close to or beyond the WiredTiger cache limit plus OS overhead is a sign of memory pressure.

## Checking WiredTiger Cache Utilization

WiredTiger cache pressure is one of the most common causes of MongoDB slowdowns. Check cache fill percentage:

```javascript
const wt = db.serverStatus().wiredTiger.cache;
const used = wt["bytes currently in the cache"];
const max = wt["maximum bytes configured"];
const pct = ((used / max) * 100).toFixed(1);
print(`WiredTiger cache: ${pct}% full (${used} / ${max} bytes)`);
print("Dirty bytes:", wt["tracked dirty bytes in the cache"]);
print("Read into cache:", wt["bytes read into cache"]);
print("Written from cache:", wt["bytes written from cache"]);
```

If dirty bytes consistently exceed 5-10% of cache size, or if evictions are high, the cache is undersized for the workload.

## Using mongostat for Live Memory Monitoring

`mongostat` provides a real-time stream of key metrics including memory:

```bash
mongostat --uri "mongodb://localhost:27017" --rowcount 10
```

The `vsize` and `res` columns show virtual and resident memory in megabytes. Watch for steady growth in `res` that does not stabilize - this indicates a leak or unbounded cache growth.

## Monitoring with the mongo Shell in a Loop

For quick periodic checks, use a shell loop:

```javascript
setInterval(() => {
  const s = db.serverStatus();
  printjson({
    ts: new Date(),
    residentMB: s.mem.resident,
    virtualMB: s.mem.virtual,
    cacheUsedMB: Math.round(s.wiredTiger.cache["bytes currently in the cache"] / 1e6),
    dirtyMB: Math.round(s.wiredTiger.cache["tracked dirty bytes in the cache"] / 1e6)
  });
}, 5000);
```

## Identifying High Memory Collections

To find which collections are consuming the most memory (index + data), use `collStats`:

```javascript
db.getCollectionNames().forEach(name => {
  const stats = db[name].stats({ scale: 1024 * 1024 });
  if (stats.storageSize > 100) {
    print(`${name}: storageSize=${stats.storageSize}MB, totalIndexSize=${stats.totalIndexSize}MB`);
  }
});
```

Large index sizes in RAM can be a significant source of memory pressure if indexes do not fit in the WiredTiger cache.

## Summary

Monitor MongoDB memory by combining `db.serverStatus()` for WiredTiger cache metrics, `mongostat` for live trending, and per-collection `collStats` for sizing. Pay close attention to resident memory relative to cache size, dirty bytes percentage, and eviction rates. When cache pressure is high, either increase the `wiredTigerCacheSizeGB` setting or reduce working set size by archiving old data or adding indexes to reduce the number of documents scanned.
