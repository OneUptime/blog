# How to Configure Concurrent Read and Write Transactions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Concurrency, WiredTiger, Performance

Description: Learn how MongoDB manages concurrent read and write transactions through WiredTiger's ticket system and how to tune concurrency limits for your workload.

---

MongoDB controls how many simultaneous read and write operations can be active at once using a concurrency ticket system. Understanding and tuning these limits prevents operations from queuing unnecessarily and improves throughput under load.

## The WiredTiger Ticket System

WiredTiger uses a fixed pool of tickets to control concurrency:
- **Read tickets**: allow read operations (find, aggregate, getMore) to enter storage
- **Write tickets**: allow write operations (insert, update, delete) to enter storage

When all tickets of a type are in use, new operations of that type queue until a ticket is released. This is the primary mechanism preventing unbounded concurrent access to storage.

## Checking Current Ticket Usage

```javascript
const ct = db.serverStatus().wiredTiger.concurrentTransactions;
printjson({
  reads: {
    total:     ct.read.out + ct.read.available,
    inUse:     ct.read.out,
    available: ct.read.available
  },
  writes: {
    total:     ct.write.out + ct.write.available,
    inUse:     ct.write.out,
    available: ct.write.available
  }
});
```

If `available` consistently approaches 0, operations are queuing.

## Default Ticket Counts

| Ticket Type | Default Count |
|-------------|---------------|
| Read        | 128           |
| Write       | 128           |

## Adjusting Ticket Counts

```javascript
// Increase write concurrency for write-heavy workloads
db.adminCommand({
  setParameter: 1,
  wiredTigerConcurrentWriteTransactions: 256
});

// Increase read concurrency for read-heavy workloads
db.adminCommand({
  setParameter: 1,
  wiredTigerConcurrentReadTransactions: 256
});
```

In `mongod.conf`:

```yaml
setParameter:
  wiredTigerConcurrentReadTransactions: 256
  wiredTigerConcurrentWriteTransactions: 128
```

## When to Increase vs Decrease Ticket Counts

Increasing tickets allows more concurrent operations but increases contention for shared resources (cache, I/O). More is not always better.

**Increase tickets when:**
- `available` count drops to 0 frequently
- Operations queue despite CPU and disk I/O being underutilized
- You have many fast, independent operations (high IOPS, low contention)

**Decrease tickets (or keep default) when:**
- High ticket counts cause I/O saturation
- Many write conflicts occur (high contention workload)
- CPU is at max capacity

## Monitoring Queue Depth

```javascript
// Check if operations are waiting for tickets
const serverStatus = db.serverStatus();
const queued = {
  readsQueued:  serverStatus.globalLock.currentQueue.readers,
  writesQueued: serverStatus.globalLock.currentQueue.writers
};
printjson(queued);
```

A consistently non-zero queue indicates saturation.

## Multi-Document Transaction Concurrency

Multi-document transactions hold a write ticket for their entire duration. Long transactions with high write ticket usage can starve other writes.

```javascript
// Check for long-running transactions holding tickets
db.adminCommand({ currentOp: 1, active: true }).inprog
  .filter(op => op.transaction && op.secs_running > 5)
  .forEach(op => print("Long transaction:", op.opid, "- running", op.secs_running, "secs"));
```

Limit transaction duration:

```javascript
db.adminCommand({ setParameter: 1, transactionLifetimeLimitSeconds: 30 });
```

## Read Concern and Ticket Usage

Operations using `readConcern: "linearizable"` hold a read ticket longer than `"local"` or `"majority"` because they must wait for the primary to confirm it is still primary. Avoid linearizable read concern in high-throughput scenarios:

```javascript
// Avoid in high-throughput code paths
db.getCollection("orders").findOne(
  { _id: orderId },
  { readConcern: { level: "linearizable" } }  // holds ticket longer
);

// Prefer
db.getCollection("orders").findOne(
  { _id: orderId },
  { readConcern: { level: "majority" } }  // returns faster
);
```

## Summary

MongoDB's WiredTiger ticket system limits concurrent read and write operations to 128 each by default. When tickets are exhausted, operations queue. Increase ticket counts if you see `available` consistently near 0 with underutilized CPU and disk. Monitor `globalLock.currentQueue` for active queueing. Long-running transactions hold tickets for their full duration, so set `transactionLifetimeLimitSeconds` to prevent transaction runaway from blocking other writes.
