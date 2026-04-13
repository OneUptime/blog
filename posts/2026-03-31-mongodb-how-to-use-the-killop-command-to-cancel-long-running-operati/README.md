# How to Use the killOp Command to Cancel Long-Running Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Operation, Performance, Administration, Diagnostic, Monitoring

Description: Learn how to use the killOp command in MongoDB to identify and cancel long-running operations that are blocking database performance.

---

## Introduction

Long-running operations in MongoDB can hold locks, consume resources, and degrade performance for other clients. The `killOp` command lets you terminate specific operations by their operation ID. Combined with `currentOp`, it gives you precise control over what is running on your server.

## Finding Long-Running Operations with currentOp

Before killing an operation, identify it using `currentOp`:

```javascript
db.currentOp({
  active: true,
  secs_running: { $gt: 30 },
  op: { $in: ["query", "update", "remove", "command"] }
});
```

This returns operations that have been running for more than 30 seconds. Note the `opid` field from the results.

## Killing a Specific Operation

Pass the `opid` to `killOp`:

```javascript
db.killOp(12345);
```

On a replica set or sharded cluster, include the shard name if needed:

```javascript
db.adminCommand({ killOp: 1, op: "shard01:12345" });
```

## Killing All Long-Running Operations Automatically

Use a script to kill all operations running longer than a threshold:

```javascript
function killLongRunning(thresholdSeconds = 60) {
  const ops = db.currentOp({
    active: true,
    secs_running: { $gt: thresholdSeconds },
    op: { $in: ["query", "update", "remove"] }
  });

  ops.inprog.forEach(op => {
    print(`Killing op ${op.opid} (${op.secs_running}s) on ${op.ns}`);
    db.killOp(op.opid);
  });

  print(`Killed ${ops.inprog.length} operations`);
}

killLongRunning(120);
```

## Identifying the Source of Slow Operations

Before killing, log relevant details for investigation:

```javascript
const ops = db.currentOp({ secs_running: { $gt: 60 } });
ops.inprog.forEach(op => {
  printjson({
    opid: op.opid,
    ns: op.ns,
    op: op.op,
    secs_running: op.secs_running,
    client: op.client,
    query: op.command
  });
});
```

## Excluding System Operations

Always filter out system operations to avoid disrupting internal processes:

```javascript
db.currentOp({
  active: true,
  secs_running: { $gt: 30 },
  "ns": { $not: /^admin|^local|^config/ }
});
```

## Using maxTimeMS as a Preventive Measure

Rather than reacting with `killOp`, set `maxTimeMS` on queries to auto-cancel slow operations. This limit is enforced server-side, so the server aborts the operation if it exceeds the specified time:

```javascript
db.orders.find({ status: "pending" }).maxTimeMS(5000).toArray();
```

## Summary

The `killOp` command combined with `currentOp` gives you precise control over long-running MongoDB operations. By scripting automatic termination of operations exceeding a time threshold, you can protect database performance during peak load. Setting `maxTimeMS` on queries is a complementary preventive approach that limits operation duration at the application level.
