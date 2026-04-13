# How to Handle MongoDB Memory Pressure Situations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Memory, Performance

Description: Diagnose and resolve MongoDB memory pressure by tuning WiredTiger cache, controlling sort memory, and managing the working set to fit in RAM.

---

## Recognizing Memory Pressure

Memory pressure in MongoDB manifests as high disk I/O (evicting pages from cache), increasing query latency, and WiredTiger cache dirty bytes approaching the eviction threshold. The key signals:

```bash
# Check if MongoDB is evicting pages aggressively
mongosh --eval "db.serverStatus().wiredTiger.cache"
```

```javascript
var cache = db.serverStatus().wiredTiger.cache
var dirty   = cache['tracked dirty bytes in the cache']
var max     = cache['maximum bytes configured']
var evicted = cache['modified pages evicted'] + cache['unmodified pages evicted']
print(`Dirty: ${(dirty/1024/1024).toFixed(1)} MB`)
print(`Max:   ${(max/1024/1024).toFixed(1)} MB`)
print(`Dirty%: ${(dirty/max*100).toFixed(1)}%`)
print(`Evictions: ${evicted}`)
```

Dirty cache above 20% or high eviction counts indicate memory pressure.

## Tuning the WiredTiger Cache Size

By default, WiredTiger uses 50% of (RAM - 1 GB), or 256 MB, whichever is larger. Increase it in `mongod.conf`:

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8
```

Only allocate memory that leaves sufficient headroom for the OS, index builds, and sort operations. A rough guide: `cacheSizeGB = (totalRAM * 0.6) - 2`.

## Controlling Sort Memory

In-memory sorts that exceed the sort memory limit (100 MB by default, controlled by `internalQueryMaxBlockingSortMemoryUsageBytes`) spill to disk when `allowDiskUseByDefault` is enabled. Check for this:

```javascript
db.system.profile.find({ "usedDisk": true }).limit(5).pretty()
```

Fix by adding the correct index:

```javascript
// Before: collection scan + in-memory sort
db.events.find({ userId: 'u1' }).sort({ createdAt: -1 })

// After: add compound index to support sort
db.events.createIndex({ userId: 1, createdAt: -1 })
```

## Reducing the Working Set

If your working set (frequently accessed data) exceeds available cache, MongoDB constantly evicts and re-reads pages. Strategies:

**1. Archive old data:**

```javascript
// Move old records to an archive collection
const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
const oldDocs = await db.events.find({ createdAt: { $lt: cutoff } }).toArray()
await db.events_archive.insertMany(oldDocs)
await db.events.deleteMany({ createdAt: { $lt: cutoff } })
```

**2. Project only needed fields:**

```javascript
// Only return fields you need to reduce document size in cache
db.users.find({ active: true }, { name: 1, email: 1, _id: 0 })
```

**3. Use partial indexes to reduce index memory footprint:**

```javascript
db.orders.createIndex(
  { userId: 1, createdAt: -1 },
  { partialFilterExpression: { status: { $in: ['pending', 'processing'] } } }
)
```

## Monitoring Memory Over Time

```bash
# Track cache metrics every 10 seconds
mongostat --uri "mongodb://localhost:27017" -n 60 10 | \
  grep -E "insert|query|update|delete|flushes|dirty"
```

Set up a Prometheus alert for dirty cache:

```yaml
- alert: MongoDBHighDirtyCache
  expr: |
    mongodb_ss_wt_cache_bytes_dirty /
    mongodb_ss_wt_cache_max_bytes > 0.2
  for: 5m
  annotations:
    summary: "WiredTiger dirty cache above 20%"
```

## Summary

MongoDB memory pressure is diagnosed through WiredTiger cache metrics (dirty percentage and eviction count) and resolved through a combination of cache size tuning, working set reduction (archiving old data, projecting fewer fields), proper indexing to eliminate in-memory sorts, and partial indexes to shrink index memory footprint. Monitor these metrics continuously and alert before pressure becomes an outage.
