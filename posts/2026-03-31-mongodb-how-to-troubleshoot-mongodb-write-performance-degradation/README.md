# How to Troubleshoot MongoDB Write Performance Degradation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Performance, Troubleshooting, WiredTiger, Index

Description: Learn how to diagnose and fix MongoDB write performance degradation caused by index overhead, write concern settings, and WiredTiger cache pressure.

---

## Identifying Write Performance Issues

Symptoms of write degradation:
- Insert/update latency increasing over time
- Write operations queuing up in `currentOp`
- High write lock wait times
- Replication lag growing on secondaries

Start with `serverStatus` to get an overview:

```javascript
const status = db.adminCommand({ serverStatus: 1 })

// Check operation counts and latency
status.opcounters
/*
{
  insert: 1284592,
  query: 8294031,
  update: 945022,
  delete: 12840
}
*/

// Check for queued write operations
status.globalLock.currentQueue
/*
{
  total: 48,    // HIGH = write contention
  readers: 2,
  writers: 46
}
*/
```

## Too Many Indexes

Each additional index on a collection adds overhead to every write. A collection with 15 indexes will have significantly slower inserts than one with 3 indexes.

```javascript
// List all indexes and identify unused ones
db.orders.getIndexes()

// Check index usage statistics
db.orders.aggregate([{ $indexStats: {} }]).forEach(idx => {
  print(`${idx.name}: ${idx.accesses.ops} operations since ${idx.accesses.since}`)
})

// Remove indexes with 0 operations (if they are not needed for writes/constraints)
db.orders.dropIndex("old_field_1")
db.orders.dropIndex("legacy_compound_1")
```

## Write Concern Impact

Stricter write concerns block the client until more replicas acknowledge:

```javascript
// w: 1 - acknowledged by primary only
await db.collection("events").insertOne(event, { writeConcern: { w: 1 } })

// w: "majority" (default since MongoDB 5.0) - waits for majority of replica set to acknowledge
await db.collection("criticalData").insertOne(data, { writeConcern: { w: "majority" } })

// w: 0 - fire and forget - fastest but no guarantee
await db.collection("metrics").insertOne(metric, { writeConcern: { w: 0 } })

// Measure the difference
console.time("w1")
await db.collection("test").insertOne({ x: 1 }, { writeConcern: { w: 1 } })
console.timeEnd("w1")

console.time("wMajority")
await db.collection("test").insertOne({ x: 1 }, { writeConcern: { w: "majority" } })
console.timeEnd("wMajority")
// w: "majority" is typically 1-10ms slower depending on replication lag
```

## WiredTiger Cache Pressure

When WiredTiger cache is under pressure, application threads stall during eviction:

```javascript
// Check WiredTiger cache stats
const wt = db.serverStatus().wiredTiger.cache
console.log("Cache in use:", wt["bytes currently in the cache"])
console.log("Max cache:", wt["maximum bytes configured"])
console.log("Dirty bytes:", wt["tracked dirty bytes in the cache"])
console.log("Pages evicted by app threads:", wt["pages evicted by application threads"])
// "pages evicted by application threads" > 0 = cache pressure stalling writes
```

Fix cache pressure:

```bash
# Increase WiredTiger cache size in mongod.conf
# storage:
#   wiredTiger:
#     engineConfig:
#       cacheSizeGB: 8  # default is 50% of RAM - 1GB

# Or reduce working set size
# - Archive old data
# - Add indexes to reduce full scans (which thrash cache)
# - Add RAM to the server
```

## Document-Level Locking and Hot Documents

MongoDB uses document-level locking. High-contention updates to the same documents (hot documents) cause lock queuing:

```javascript
// PROBLEM: many threads updating the same counter document
// This causes lock contention on the single counter document
await db.collection("counters").updateOne(
  { _id: "globalCounter" },
  { $inc: { value: 1 } }
)

// SOLUTION: Use multiple counter shards to distribute contention
const SHARD_COUNT = 16
const shard = Math.floor(Math.random() * SHARD_COUNT)

await db.collection("counters").updateOne(
  { _id: `globalCounter_${shard}` },
  { $inc: { value: 1 } },
  { upsert: true }
)

// Sum all shards to get the total
const total = await db.collection("counters").aggregate([
  { $match: { _id: /^globalCounter_/ } },
  { $group: { _id: null, total: { $sum: "$value" } } }
]).toArray()
```

## Bulk Writes for Throughput

Individual inserts have per-operation overhead. Batch them:

```javascript
// SLOW: individual inserts
for (const event of events) {
  await db.collection("events").insertOne(event)
}

// FAST: batch inserts
await db.collection("events").insertMany(events, { ordered: false })

// For mixed operations, use bulkWrite
const ops = events.map(e => ({ insertOne: { document: e } }))
await db.collection("events").bulkWrite(ops, { ordered: false })
```

## Profiling Slow Writes

```javascript
// Enable write profiling
db.setProfilingLevel(1, { slowms: 50 })

// Find slow write operations
db.system.profile.find({
  op: { $in: ["insert", "update", "remove"] },
  millis: { $gt: 50 }
}).sort({ millis: -1 }).limit(20)
```

## Checking for Index Builds During Writes

Running index builds slow down write operations:

```javascript
// Check if an index is being built
db.adminCommand({ currentOp: true })
  .inprog
  .filter(op => op.command && op.command.createIndexes)
  .forEach(op => print("Index building on:", op.command.createIndexes))
```

## Oplog Application on Secondaries

Write performance degradation on primaries can sometimes be caused by secondary overload:

```javascript
// Check secondary oplog application rate
// Connect to secondary (directConnection)
db.adminCommand({ replSetGetStatus: 1 }).members
  .filter(m => m.stateStr === "SECONDARY")
  .forEach(m => {
    print(`${m.name}: lag=${m.optimeDate}`)
  })

// High replication lag -> secondary falling behind ->
// Primary may hold back if write concern requires secondary acknowledgment
```

## Summary

MongoDB write performance degradation is most commonly caused by too many indexes (remove unused ones), inappropriate write concern levels (use `w: 1` for non-critical writes), WiredTiger cache pressure (increase cache size or reduce working set), and hot document contention (shard counters and high-write documents). Use `serverStatus`, the profiler, and `currentOp` to isolate the bottleneck before applying fixes.
