# How to Troubleshoot MongoDB High CPU Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Troubleshooting, CPU, Performance, currentOp

Description: Learn how to diagnose and resolve high CPU usage in MongoDB by identifying slow queries, missing indexes, and inefficient aggregations.

---

## Common Causes of High CPU in MongoDB

- Full collection scans (missing indexes)
- Unanchored regex queries
- Complex in-memory sorts and grouping
- High connection counts with active operations
- Index builds running in the background
- JavaScript execution (`$where`, `$function`)
- High write throughput with frequent fsync

## Identifying the Culprit: currentOp

The first step is to see what MongoDB is doing right now:

```javascript
// Show all running operations longer than 1 second
db.adminCommand({
  currentOp: true,
  active: true,
  secs_running: { $gte: 1 }
})
```

Key fields to inspect:
- `op` - type of operation (query, update, command)
- `secs_running` - how long it has been running
- `ns` - namespace (database.collection)
- `command` - the actual query or command
- `planSummary` - `COLLSCAN` means no index

## Looking for COLLSCAN in Active Ops

```javascript
// Find operations doing full collection scans
db.adminCommand({
  currentOp: true,
  active: true,
  planSummary: /COLLSCAN/
})
```

A `COLLSCAN` means MongoDB is reading every document in the collection - this is almost always the cause of high CPU.

## System-Level CPU Check

```bash
# Check overall CPU usage
top -p $(pgrep mongod)

# Check per-core breakdown
mpstat -P ALL 1 5

# Check I/O wait vs user CPU
iostat -x 1 5
# High %user with low iowait = CPU-bound (likely query processing)
# High iowait = I/O bound (likely disk reads due to cache pressure)
```

## Profiling Slow Queries

Enable the MongoDB profiler to capture slow queries:

```javascript
// Enable profiling for queries slower than 100ms
db.setProfilingLevel(1, { slowms: 100 })

// After a few minutes, check the profiler output
db.system.profile.find().sort({ ts: -1 }).limit(20)

// Find the most CPU-intensive patterns
db.system.profile.aggregate([
  { $match: { ts: { $gte: new Date(Date.now() - 600000) } } },
  { $group: {
      _id: "$ns",
      count: { $sum: 1 },
      avgMillis: { $avg: "$millis" },
      maxMillis: { $max: "$millis" },
      totalMillis: { $sum: "$millis" }
  }},
  { $sort: { totalMillis: -1 } },
  { $limit: 10 }
])
```

## Finding Missing Indexes

```javascript
// Find collections with the most collection scans
db.adminCommand({ serverStatus: 1 }).metrics.queryExecutor

// Find queries from the profiler that performed collection scans
db.system.profile.find({
  planSummary: /COLLSCAN/
}).sort({ millis: -1 }).limit(10).forEach(op => {
  print(`COLLSCAN on ${op.ns}: ${op.millis}ms`)
  print(`  Query: ${JSON.stringify(op.command.filter || op.command.query)}`)
})
```

## Identifying Expensive Regex

```javascript
// Unanchored regexes cause full index scans or collection scans
// BAD: unanchored regex
db.users.find({ email: /example/ })  // scans all emails

// BETTER: anchored (uses index prefix)
db.users.find({ email: /^alice/ })   // uses email index

// BEST: equality match
db.users.find({ email: "alice@example.com" })

// Check profiler for regex queries
db.system.profile.find({
  "command.filter": { $exists: true },
  $where: "JSON.stringify(this.command.filter).includes('$regex')"
}).limit(10)
```

## Killing Runaway Operations

```javascript
// Kill a specific operation by opId
db.adminCommand({ killOp: 1, op: <opId> })

// Kill all operations running longer than 60 seconds (be careful!)
db.adminCommand({ currentOp: true, secs_running: { $gte: 60 } })
  .inprog
  .forEach(op => {
    print("Killing op:", op.opid, "running for:", op.secs_running, "sec")
    db.adminCommand({ killOp: 1, op: op.opid })
  })
```

## CPU Usage from Index Builds

Background index builds can spike CPU. Monitor them:

```javascript
// Check if an index build is in progress
db.adminCommand({ currentOp: true, $or: [
  { "command.createIndexes": { $exists: true } },
  { "command.commitIndexBuild": { $exists: true } }
]})

// View index build progress
db.adminCommand({ currentOp: true })
  .inprog
  .filter(op => op.msg && op.msg.includes("Index Build"))
  .forEach(op => print(op.msg, op.progress))
```

## Adding Indexes to Reduce CPU

```javascript
// After identifying the slow query, add an appropriate index
// Example: query on { status: "active", userId: "user123" }
db.orders.createIndex({ status: 1, userId: 1 })

// Verify the query now uses the index
db.orders.find({ status: "active", userId: "user123" }).explain("executionStats")
// Look for IXSCAN instead of COLLSCAN
```

## Summary

Diagnose MongoDB high CPU usage by running `currentOp` to find active slow operations with `COLLSCAN` plan summaries, enabling the profiler to capture a history of slow queries, and checking for unanchored regex patterns. Fix the root cause by adding appropriate indexes, rewriting queries to use indexed fields, and killing runaway operations. CPU usage should drop significantly after eliminating collection scans.
