# How to Troubleshoot WiredTiger Cache Full Errors in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, WiredTiger, Troubleshooting, Cache, Performance

Description: Diagnose and resolve WiredTiger cache full errors in MongoDB, including identifying root causes, immediate mitigation steps, and long-term fixes.

---

When WiredTiger's cache fills faster than eviction can reclaim space, MongoDB logs cache-full errors and application writes stall or fail. This guide covers how to diagnose these errors and resolve them systematically.

## Identifying Cache Full Errors

Look for these patterns in MongoDB logs:

```bash
grep -i "cache" /var/log/mongodb/mongod.log | grep -iE "evict|full|pressure|blocked"
```

Common log messages:

```text
[conn] WiredTiger cache eviction blocked: cache full
[eviction] aggressive cache eviction: application threads helping evict
[eviction] cache overflow: cache full but dirty bytes continue to grow
```

In `serverStatus`, check the critical counter:

```javascript
const cache = db.serverStatus().wiredTiger.cache;
print("App thread evictions:", cache["pages evicted by application threads"]);
print("Cache used %:", (cache["bytes currently in the cache"] / cache["maximum bytes configured"] * 100).toFixed(1));
print("Dirty %:", (cache["tracked dirty bytes in the cache"] / cache["maximum bytes configured"] * 100).toFixed(1));
```

## Root Cause 1: Cache Too Small

The most common cause. Check if the working set exceeds cache size:

```javascript
const dbStats = db.stats(1024 * 1024); // in MB
print("Data size (MB):", dbStats.dataSize);
print("Storage size (MB):", dbStats.storageSize);

const cacheGB = db.serverStatus().wiredTiger.cache["maximum bytes configured"] / 1073741824;
print("Cache size (GB):", cacheGB.toFixed(2));
```

**Fix:** Increase cache size:

```javascript
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "cache_size=8G"
});
```

Update `mongod.conf` and restart for permanence.

## Root Cause 2: Slow Eviction

Eviction threads cannot keep up with write rate. Check the ratio of background vs application evictions:

```javascript
const cache = db.serverStatus().wiredTiger.cache;
const bg  = cache["pages evicted by background eviction"];
const app = cache["pages evicted by application threads"];
print(`BG evictions: ${bg}, App evictions: ${app}`);
```

**Fix:** Add more eviction threads:

```javascript
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "eviction=(threads_min=4,threads_max=8)"
});
```

## Root Cause 3: Long-Running Transactions Pinning Pages

Transactions pin old page versions in cache. Check for long-running operations:

```javascript
db.adminCommand({ currentOp: 1, active: true }).inprog
  .filter(op => op.secs_running > 10)
  .forEach(op => print(`OpID: ${op.opid}, Secs: ${op.secs_running}, Type: ${op.type}`));
```

Kill long-running offenders:

```javascript
db.adminCommand({ killOp: 1, op: <opid> });
```

**Fix:** Set a transaction timeout:

```javascript
db.adminCommand({ setParameter: 1, transactionLifetimeLimitSeconds: 30 });
```

## Root Cause 4: Index Build Consuming Cache

Index builds can consume significant cache. Monitor with:

```javascript
db.currentOp({ "command.createIndexes": { $exists: true } });
```

If a large index build is underway, it can fill the cache quickly. Consider running index builds during low-traffic windows.

## Immediate Mitigation Checklist

```bash
# 1. Increase cache at runtime
mongosh --eval "db.adminCommand({ setParameter: 1, wiredTigerEngineRuntimeConfig: 'cache_size=8G' })"

# 2. Increase eviction threads at runtime
mongosh --eval "db.adminCommand({ setParameter: 1, wiredTigerEngineRuntimeConfig: 'eviction=(threads_max=8)' })"

# 3. Kill long-running operations
mongosh --eval "db.adminCommand({ currentOp: 1, active: true })"
```

## Summary

WiredTiger cache full errors stem from one of four root causes: cache is too small for the working set, eviction threads cannot keep up with write rate, long-running transactions pin old page versions, or large index builds spike cache usage. Start by checking cache utilization and application thread eviction counts, then apply the appropriate fix. For production systems, monitor these metrics proactively with alerts at 80% cache utilization.
