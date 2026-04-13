# How to Monitor Bulk Operation Performance in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Bulk Operation, Performance, Monitoring, Profiling

Description: Monitor and optimize MongoDB bulk operation performance using timing instrumentation, the database profiler, and currentOp to identify bottlenecks.

---

## Overview

Bulk operations improve throughput by reducing round trips, but poorly sized batches, missing indexes, or write concern settings can still cause performance problems. Monitoring bulk operations requires instrumenting your application code and using MongoDB's built-in profiling tools.

## Instrumenting Bulk Operations in Application Code

Wrap every bulk execution in timing logic to capture baseline metrics.

```javascript
async function timedBulkWrite(col, operations) {
  const bulk = col.initializeUnorderedBulkOp();

  operations.forEach(({ filter, update }) => {
    bulk.find(filter).updateOne({ $set: update });
  });

  const start = Date.now();
  const result = await bulk.execute();
  const duration = Date.now() - start;

  const opsPerSecond = Math.round((operations.length / duration) * 1000);

  console.log({
    durationMs: duration,
    totalOps: operations.length,
    opsPerSecond,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount
  });

  return { result, durationMs: duration, opsPerSecond };
}
```

## Finding the Optimal Batch Size

Sending too few documents per batch wastes network round trips. Too many documents per batch increases memory pressure and latency spikes.

```javascript
async function benchmarkBatchSizes(col, allDocs) {
  const batchSizes = [100, 500, 1000, 5000, 10000];

  for (const size of batchSizes) {
    const batch = allDocs.slice(0, size);
    const bulk = col.initializeUnorderedBulkOp();
    batch.forEach((doc) => bulk.insert(doc));

    const start = Date.now();
    await bulk.execute();
    const ms = Date.now() - start;

    console.log(`Batch size ${size}: ${ms}ms (${Math.round((size / ms) * 1000)} ops/sec)`);

    // Clean up for the next benchmark pass
    await col.deleteMany({});
  }
}
```

## Using the Database Profiler

Enable profiling to capture slow bulk operations on the server side.

```javascript
// Set profiling level 1: log operations slower than 100ms
await db.command({ profile: 1, slowms: 100 });
```

Query the system profile collection after running your bulk operations.

```javascript
const slowOps = await db.collection('system.profile')
  .find({
    op: { $in: ['insert', 'update', 'delete'] },
    millis: { $gte: 100 }
  })
  .sort({ millis: -1 })
  .limit(20)
  .toArray();

slowOps.forEach((op) => {
  console.log(`${op.op} took ${op.millis}ms - ns: ${op.ns}`);
});
```

## Checking currentOp for Running Bulk Operations

If a bulk operation is taking too long, inspect it with `currentOp`.

```javascript
const ops = await db.admin().command({
  currentOp: true,
  active: true,
  secs_running: { $gte: 5 }
});

ops.inprog.forEach((op) => {
  console.log(`Op: ${op.op}, ns: ${op.ns}, secs: ${op.secs_running}`);
  if (op.locks) console.log('Locks:', op.locks);
});
```

## Monitoring with serverStatus

Track bulk write throughput at the server level using `serverStatus`.

```javascript
async function getWriteStats(db) {
  const status = await db.admin().command({ serverStatus: 1 });
  const { opcounters } = status;
  return {
    inserts: opcounters.insert,
    updates: opcounters.update,
    deletes: opcounters.delete
  };
}

// Take a snapshot before and after bulk execution
const before = await getWriteStats(db);
await timedBulkWrite(col, operations);
const after = await getWriteStats(db);

console.log('Inserts during bulk:', after.inserts - before.inserts);
```

## Key Performance Levers

- **Batch size**: Start at 1000 documents per batch and benchmark up or down.
- **Write concern**: Use `{ w: 1 }` for high-throughput scenarios where full replica acknowledgment is not required.
- **Indexes**: Bulk updates that cannot use an index will scan the entire collection for each document.
- **Ordered vs unordered**: Unordered batches parallelize better and are typically faster for independent operations.

## Summary

Monitor bulk operation performance by instrumenting execution time in application code, querying `system.profile` for slow server-side operations, and using `currentOp` to inspect in-flight batches. Benchmark different batch sizes to find the sweet spot, and use `serverStatus` opcounters to measure aggregate write throughput across your bulk workloads.
