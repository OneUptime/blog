# How to Monitor Write Performance in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Performance, Monitoring, Write Concern, Profiler

Description: Learn how to monitor MongoDB write performance using serverStatus, the database profiler, currentOp, and slow query logs to identify and resolve write bottlenecks.

---

## Key Metrics for Write Performance

Monitoring write performance in MongoDB requires tracking several categories of metrics: operation latency, queue depth, replication lag, and write concern behavior. Collecting these metrics proactively allows you to detect bottlenecks before they impact users.

## Using serverStatus for Write Metrics

The `db.serverStatus()` command exposes comprehensive real-time write statistics.

```javascript
const status = db.serverStatus();

// Write operation counts
printjson(status.opcounters);
// { insert: N, update: N, delete: N, ... }

// Latency histogram for writes
printjson(status.opLatencies.writes);
// { ops: N, latency: N (microseconds), histogram: [...] }

// Lock wait times (high values indicate contention)
printjson(status.locks);

// WiredTiger write cache stats
printjson(status.wiredTiger.cache);
```

## Enabling the Database Profiler

The profiler logs slow operations to the `system.profile` collection. Enable it at level 1 to capture only operations exceeding a time threshold.

```javascript
// Profile operations slower than 100ms
db.setProfilingLevel(1, { slowms: 100 });

// Profile all operations (level 2 - use only for debugging)
db.setProfilingLevel(2);

// Query profiler results for slow writes
db.system.profile.find({
  op: { $in: ["insert", "update", "remove"] },
  millis: { $gt: 100 }
}).sort({ ts: -1 }).limit(20).pretty();
```

## Using currentOp to Inspect Active Writes

The `currentOp` command shows writes currently in progress. Use it to detect long-running or blocked write operations.

```javascript
// Show active write operations running longer than 5 seconds
db.adminCommand({
  currentOp: true,
  op: { $in: ["insert", "update", "remove"] },
  secs_running: { $gt: 5 }
});
```

## Tracking Replication Lag

For replica sets, replication lag directly affects `w: "majority"` write latency. High lag increases the time writes spend waiting for acknowledgment.

```javascript
// Check replication lag on each secondary
rs.printSecondaryReplicationInfo();

// Detailed replica set status
const status = rs.status();
const primary = status.members.find(m => m.stateStr === "PRIMARY");
status.members.forEach(m => {
  const lag = m.stateStr !== "PRIMARY"
    ? Math.round((primary.optimeDate - m.optimeDate) / 1000) + "s"
    : "N/A (primary)";
  print(`${m.name}: state=${m.stateStr}, lag=${lag}`);
});
```

## Monitoring Write Concern Timeouts

Track write concern timeout errors in your application logs and serverStatus:

```javascript
const status = db.serverStatus();
printjson(status.metrics.getLastError);
// Shows: wtime (wait time stats), wtimeouts (timeout count)
```

A rising `wtimeouts` count indicates that secondaries are lagging and `w: "majority"` writes are timing out.

## Using explain() to Analyze Write Plan

For update and delete operations, `explain()` shows whether the write used an index or required a collection scan.

```javascript
db.orders.explain("executionStats").updateMany(
  { status: "pending", createdAt: { $lt: new Date("2025-01-01") } },
  { $set: { status: "expired" } }
);
// Look for IXSCAN vs COLLSCAN in the winning plan
```

## Summary

Monitoring MongoDB write performance requires a combination of real-time metrics from `serverStatus`, slow operation analysis from the profiler, and active operation inspection via `currentOp`. Pay particular attention to replication lag when using `w: "majority"` write concerns, lock wait times as indicators of write contention, and write latency histograms to detect p99 outliers. Set the profiler threshold to capture operations above your SLO rather than logging everything, which has a significant performance cost.
