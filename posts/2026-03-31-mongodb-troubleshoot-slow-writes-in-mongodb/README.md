# How to Troubleshoot Slow Writes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write, Performance

Description: Diagnose and fix slow MongoDB write operations by tuning write concern, reducing index overhead, optimizing document structure, and fixing lock contention.

---

## What Causes Slow Writes in MongoDB

MongoDB write performance degrades from too many indexes (each write updates all of them), high write concern durability settings, document-level lock contention, large documents with frequent updates, and unbounded array growth. Identifying the root cause requires measuring at the right level.

## Step 1: Profile Slow Writes

```javascript
// Enable profiling for slow writes
db.setProfilingLevel(1, { slowms: 50 })

// Find slow inserts, updates, and deletes
db.system.profile.find({
  op: { $in: ['insert', 'update', 'remove', 'command'] },
}).sort({ millis: -1 }).limit(10).forEach(p => {
  print(`${p.millis}ms | ${p.op} | ${p.ns}`)
  printjson(p.command)
})
```

## Step 2: Check Index Overhead

Every index on a collection must be updated on every write. Find collections with too many indexes:

```javascript
db.getCollectionNames().forEach(name => {
  var indexes = db[name].getIndexes()
  if (indexes.length > 6) {
    print(`${name}: ${indexes.length} indexes`)
  }
})
```

Drop indexes that are never used:

```javascript
// Check usage since last startup
db.orders.aggregate([{ $indexStats: {} }]).forEach(stat => {
  if (stat.accesses.ops === 0) {
    print(`Unused index: ${stat.name}`)
  }
})

db.orders.dropIndex('idx_legacy_field_1')
```

## Step 3: Tune Write Concern

High write concern (`w: "majority"`, `j: true`) waits for data to be flushed to journal on a majority of nodes. For non-critical data, relax it:

```javascript
// Majority acknowledged write (slowest, safest)
await db.collection('audit_logs').insertOne(doc, {
  writeConcern: { w: 'majority', j: true },
})

// For non-critical data (faster)
await db.collection('click_events').insertOne(doc, {
  writeConcern: { w: 1, j: false },
})

// Fire-and-forget for telemetry (fastest, no durability guarantee)
await db.collection('metrics').insertOne(doc, {
  writeConcern: { w: 0 },
})
```

## Step 4: Use Bulk Writes

Individual writes per document are inefficient. Batch them:

```javascript
// Slow: one write per document
for (const doc of documents) {
  await collection.insertOne(doc)
}

// Fast: single bulk operation
await collection.bulkWrite(
  documents.map(doc => ({ insertOne: { document: doc } })),
  { ordered: false }
)
```

## Step 5: Fix Unbounded Array Growth

Appending to arrays indefinitely causes documents to grow, increasing memory and cache pressure, adding network overhead, and risking the 16MB BSON document size limit:

```javascript
// Bad: unbounded array on a document
db.users.updateOne(
  { _id: userId },
  { $push: { activityLog: { action: 'login', ts: new Date() } } }
)

// Better: use $push with $slice to cap the array size
db.users.updateOne(
  { _id: userId },
  { $push: { activityLog: {
    $each: [{ action: 'login', ts: new Date() }],
    $slice: -100,  // keep only last 100 entries
  } } }
)

// Best: move high-frequency events to a separate collection
db.activity_events.insertOne({ userId, action: 'login', ts: new Date() })
```

## Step 6: Investigate Lock Contention

```javascript
// Check for lock wait time
db.serverStatus().locks

// Check global write lock time
db.serverStatus().globalLock
```

If `currentQueue.writers` is high, a blocking operation is holding the write lock. Use `currentOp` to find it and kill it.

## Summary

Slow MongoDB writes stem from index overhead (too many indexes per write), high write concern durability requirements, individual document writes instead of bulk operations, and unbounded array growth causing document relocation. Profile first with the slow query log, then address the root cause: remove unused indexes, tune write concern per data criticality, batch writes, and redesign schemas that use unbounded arrays.
