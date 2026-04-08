# How to Monitor MongoDB Performance with db.currentOp()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Performance, Operation, Diagnostic

Description: Learn how to use db.currentOp() in MongoDB to inspect currently running operations, identify long-running queries, and diagnose performance bottlenecks in real time.

---

## Overview

`db.currentOp()` returns a document listing all active operations in the MongoDB instance at the moment of the call. It is the primary tool for real-time operational visibility into what the server is currently doing.

```mermaid
flowchart TD
    A[mongod process] --> B[Active Operations Queue]
    B --> C[db.currentOp()]
    C --> D[Query Operations]
    C --> E[Write Operations]
    C --> F[Index Builds]
    C --> G[Admin Commands]
```

## Basic Usage

```javascript
// Return all currently active operations
db.currentOp()

// Return all operations including idle connections
db.currentOp(true)

// Return only active operations (not idle)
db.currentOp({ "$ownOps": false, "active": true })
```

## Output Structure

Each entry in the `inprog` array describes one operation:

```javascript
{
  "inprog": [
    {
      "opid": 12345,
      "type": "op",
      "active": true,
      "op": "query",
      "ns": "shop.orders",
      "command": {
        "find": "orders",
        "filter": { "status": "pending" },
        "lsid": { ... }
      },
      "secs_running": 15,
      "microsecs_running": 15043211,
      "planSummary": "COLLSCAN",
      "numYields": 120,
      "locks": {
        "Global": { "acquireCount": { "r": 1 } },
        "Database": { "acquireCount": { "r": 1 } },
        "Collection": { "acquireCount": { "r": 1 } }
      },
      "waitingForLock": false,
      "client": "192.168.1.100:54321",
      "threadId": "0x7f...",
      "connectionId": 42,
      "desc": "conn42"
    }
  ],
  "ok": 1
}
```

### Key Fields

| Field | Description |
|---|---|
| `opid` | Operation ID (used with `db.killOp()`) |
| `op` | Operation type: `none`, `query`, `insert`, `update`, `remove`, `command`, `getmore`, `killcursors` |
| `ns` | Namespace: `database.collection` |
| `secs_running` | Elapsed seconds since operation started |
| `planSummary` | Execution plan: `COLLSCAN` (bad) or `IXSCAN` (good) |
| `numYields` | Number of times operation yielded to allow others to proceed |
| `waitingForLock` | Whether the operation is blocked waiting for a lock |
| `client` | IP and port of the connecting client |

## Filtering Operations

### Find Operations Running Longer than N Seconds

```javascript
db.currentOp({
  "active": true,
  "secs_running": { "$gt": 5 }
})
```

### Find Collection Scans (No Index)

```javascript
db.currentOp({
  "active": true,
  "planSummary": "COLLSCAN"
})
```

### Find Operations Waiting for a Lock

```javascript
db.currentOp({
  "waitingForLock": true
})
```

### Find Operations on a Specific Database

```javascript
db.currentOp({
  "ns": /^shop\./
})
```

### Find Operations from a Specific Client IP

```javascript
db.currentOp({
  "client": { "$regex": "^192.168.1.100" }
})
```

### Find Index Builds

```javascript
db.currentOp({
  "command.createIndexes": { "$exists": true }
})
```

## Using $currentOp Aggregation Stage

In MongoDB 3.6+, `$currentOp` is available as an aggregation stage against the `admin` database, providing more filtering flexibility:

```javascript
db.adminCommand({
  aggregate: 1,
  pipeline: [
    {
      $currentOp: {
        allUsers: true,
        idleConnections: false
      }
    },
    {
      $match: {
        secs_running: { $gt: 10 },
        op: { $in: ["query", "update", "remove"] }
      }
    },
    {
      $project: {
        opid: 1,
        op: 1,
        ns: 1,
        secs_running: 1,
        planSummary: 1,
        client: 1
      }
    }
  ],
  cursor: {}
})
```

## $currentOp Options

| Option | Description |
|---|---|
| `allUsers` | Include operations from all users (requires `inprog` privilege) |
| `idleConnections` | Include idle connections in results |
| `idleCursors` | Include cursors that are open but not actively executing |
| `idleSessions` | Include idle session entries |
| `localOps` | On mongos, show only local operations rather than shard operations |

## Practical Monitoring Script

Print a summary of long-running operations every 5 seconds using mongosh:

```javascript
function watchLongOps(thresholdSecs) {
  while (true) {
    var ops = db.currentOp({
      "active": true,
      "secs_running": { "$gt": thresholdSecs }
    });
    if (ops.inprog.length > 0) {
      print("=== Long-Running Operations ===");
      ops.inprog.forEach(function(op) {
        print(
          "opid=" + op.opid +
          " op=" + op.op +
          " ns=" + op.ns +
          " secs=" + op.secs_running +
          " plan=" + op.planSummary +
          " client=" + op.client
        );
      });
    }
    sleep(5000);
  }
}

watchLongOps(3);
```

## Summary

`db.currentOp()` provides real-time visibility into everything currently running on a MongoDB server. Use it to identify long-running queries, collection scans lacking index coverage, lock contention, and runaway operations. The `secs_running`, `planSummary`, and `waitingForLock` fields are the most actionable signals for performance diagnosis. Combine it with `db.killOp(opid)` to terminate operations that are degrading cluster performance.
