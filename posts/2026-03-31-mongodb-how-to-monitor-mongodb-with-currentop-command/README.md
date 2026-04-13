# How to Monitor MongoDB with currentOp Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Performance, Operation

Description: Learn how to use MongoDB's currentOp command to inspect active operations, identify long-running queries, and kill problematic operations in real time.

---

## Overview

The `currentOp` command returns a document containing information about all operations currently in progress on a MongoDB server. It is an essential tool for diagnosing performance problems, identifying slow queries, and understanding what work the database is doing at any given moment.

## Running currentOp

Connect via mongosh and run:

```javascript
// Show all in-progress operations
db.currentOp()

// Alternative admin command syntax (deprecated since MongoDB 4.2)
db.adminCommand({ currentOp: 1 })
```

## Understanding the Output

Each operation in `currentOp().inprog` contains fields like:

```javascript
{
  opid: 12345,
  type: "op",
  host: "mongo1:27017",
  desc: "conn42",
  connectionId: 42,
  client: "10.0.0.5:52341",
  appName: "myapp",
  clientMetadata: { ... },
  active: true,
  currentOpTime: "2026-03-31T10:00:00.000Z",
  effectiveUsers: [{ user: "appuser", db: "mydb" }],
  op: "query",
  ns: "mydb.orders",
  command: {
    find: "orders",
    filter: { status: "pending" },
    sort: { createdAt: -1 }
  },
  numYields: 15,
  locks: { Global: "r", Database: "r", Collection: "r" },
  waitingForLock: false,
  secs_running: 45,
  microsecs_running: 45123456,
  planSummary: "COLLSCAN",
  msg: "",
  progress: { done: 0, total: 0 }
}
```

Key fields:
- `opid` - operation identifier used to kill the operation
- `secs_running` - how long the operation has been running
- `planSummary` - execution plan (COLLSCAN indicates a full collection scan)
- `waitingForLock` - true if the operation is blocked waiting for a lock
- `op` - operation type: query, insert, update, remove, command, getmore

## Filtering Operations

The `currentOp` command accepts a filter document:

```javascript
// Show only operations running longer than 5 seconds
db.currentOp({ secs_running: { $gt: 5 } })

// Show only write operations
db.currentOp({ op: { $in: ["insert", "update", "remove"] } })

// Show operations waiting for locks
db.currentOp({ waitingForLock: true })

// Show operations on a specific collection
db.currentOp({ ns: "mydb.orders" })

// Show operations from a specific client
db.currentOp({ "client": "10.0.0.5:52341" })

// Combine filters
db.currentOp({
  active: true,
  secs_running: { $gte: 10 },
  op: "query"
})
```

## Finding Slow Queries

The most common use of `currentOp` is identifying queries that have been running too long:

```javascript
// Find all queries running more than 30 seconds
let slowOps = db.currentOp({ secs_running: { $gt: 30 } }).inprog;

slowOps.forEach(function(op) {
  print("OpID:", op.opid);
  print("Running for:", op.secs_running, "seconds");
  print("Namespace:", op.ns);
  print("Plan:", op.planSummary);
  printjson(op.command);
  print("---");
});
```

## Killing a Long-Running Operation

Once you identify a problematic operation, use `killOp` to terminate it:

```javascript
// Kill a specific operation by opid
db.killOp(12345)

// Kill all operations running more than 60 seconds (use with caution)
let longOps = db.currentOp({ secs_running: { $gt: 60 } }).inprog;

longOps.forEach(function(op) {
  if (op.opid) {
    print("Killing opid:", op.opid, "running for", op.secs_running, "seconds");
    db.killOp(op.opid);
  }
});
```

## Monitoring Idle Connections

Find connections that are open but not doing anything:

```javascript
// Find idle connections (not active)
db.currentOp({ active: false })
```

## Including All Operations

By default, `currentOp` only shows active operations. Use `$all` to include idle connections:

```javascript
// Include idle and system operations
db.currentOp({ "$all": true })
```

## Checking for Lock Contention

Identify operations that are blocked waiting for locks:

```javascript
let blocked = db.currentOp({ waitingForLock: true }).inprog;
print("Operations waiting for locks:", blocked.length);
blocked.forEach(function(op) {
  print("OpID:", op.opid, "| Op:", op.op, "| NS:", op.ns, "| Waiting:", op.secs_running, "s");
});
```

## Creating a Continuous Monitor

```javascript
// continuous-monitor.js
function monitorOps(thresholdSecs) {
  while (true) {
    let ops = db.currentOp({ secs_running: { $gt: thresholdSecs } }).inprog;
    if (ops.length > 0) {
      print(new Date(), "- Found", ops.length, "slow operations:");
      ops.forEach(function(op) {
        print("  opid:", op.opid, "| secs:", op.secs_running, "| ns:", op.ns, "| plan:", op.planSummary);
      });
    }
    sleep(5000);
  }
}

monitorOps(10);
```

## Summary

The `currentOp` command is the primary tool for real-time inspection of MongoDB server activity. It lets you filter operations by duration, type, namespace, and lock status. Combined with `killOp`, it provides a way to immediately address runaway queries and lock contention. Regular use of `currentOp` during performance investigations reveals which operations are most resource-intensive and guides indexing and query optimization efforts.
