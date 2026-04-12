# How to Monitor MongoDB Lock Percentage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Lock, Performance, Concurrency

Description: Learn how to monitor MongoDB lock metrics using serverStatus to detect lock contention, identify operations holding locks, and diagnose write bottlenecks.

---

MongoDB uses intent locks at the global, database, and collection levels to coordinate concurrent operations. High lock wait times or lock contention indicates write-heavy workloads, long-running operations blocking other requests, or schema design issues causing excessive locking.

## Reading Lock Metrics from serverStatus

```javascript
db.adminCommand({ serverStatus: 1 }).locks
```

Output includes lock metrics per resource:

```json
{
  "Global": {
    "acquireCount": {
      "r": 1234567,
      "w": 456789,
      "R": 123,
      "W": 456
    },
    "acquireWaitCount": {
      "r": 12,
      "w": 456,
      "R": 0,
      "W": 23
    },
    "timeAcquiringMicros": {
      "r": 12345,
      "w": 987654,
      "R": 0,
      "W": 234567
    }
  }
}
```

Lock mode abbreviations:
- `r` - intent shared (IS) lock
- `w` - intent exclusive (IX) lock
- `R` - shared (S) lock
- `W` - exclusive (X) lock (rare at global level; DDL operations)

## Calculating Lock Wait Percentage

The lock percentage measures what fraction of lock requests had to wait:

```python
import pymongo

client = pymongo.MongoClient("mongodb://localhost:27017")

def get_lock_metrics():
    status = client.admin.command("serverStatus")
    locks = status.get("locks", {})

    results = {}
    for resource, data in locks.items():
        acquire = data.get("acquireCount", {})
        wait = data.get("acquireWaitCount", {})
        time_us = data.get("timeAcquiringMicros", {})

        for mode in ["r", "w", "R", "W"]:
            total = acquire.get(mode, 0)
            waited = wait.get(mode, 0)
            wait_us = time_us.get(mode, 0)

            if total > 0:
                pct = (waited / total) * 100
                avg_wait_ms = (wait_us / max(waited, 1)) / 1000
                key = f"{resource}.{mode}"
                results[key] = {
                    "total_acquires": total,
                    "wait_count": waited,
                    "wait_pct": round(pct, 2),
                    "avg_wait_ms": round(avg_wait_ms, 3)
                }

    return results

metrics = get_lock_metrics()
for key, data in metrics.items():
    if data["wait_pct"] > 1:
        print(f"{key}: wait={data['wait_pct']}% avg_wait={data['avg_wait_ms']}ms")
```

## Identifying Operations Holding Locks

When lock waits are high, use `currentOp` to find the blocking operation:

```javascript
// Find long-running operations
db.adminCommand({
  currentOp: true,
  active: true,
  secs_running: { $gt: 5 }
})
```

Look for the operation with a high `secs_running` value - it is likely holding locks that other operations are waiting for.

## Finding Operations Waiting for Locks

```javascript
db.adminCommand({ currentOp: 1 }).inprog.filter(op =>
  op.waitingForLock === true
)
```

## Killing a Lock-Holding Operation

If a long-running operation is blocking others:

```javascript
// Get the operation ID from currentOp
db.adminCommand({ killOp: 1, op: <opid> })
```

## Global Lock Wait Time

The `globalLock` section shows overall wait time:

```javascript
const gl = db.adminCommand({ serverStatus: 1 }).globalLock

printjson({
  totalTime: gl.totalTime,
  currentQueue: gl.currentQueue,
  activeClients: gl.activeClients
})
```

```json
{
  "totalTime": 12345678901,
  "currentQueue": { "total": 5, "readers": 2, "writers": 3 },
  "activeClients": { "total": 15, "readers": 10, "writers": 5 }
}
```

A non-zero `currentQueue.writers` means write operations are queued waiting for locks.

## Reducing Lock Contention

1. **Use short transactions** - long-running transactions hold locks longer
2. **Avoid large bulk updates** - break into smaller batches
3. **Add WiredTiger concurrency tickets** - tune `wiredTigerConcurrentReadTransactions` and `wiredTigerConcurrentWriteTransactions`
4. **Index your queries** - un-indexed updates scan and hold locks on more data

```javascript
db.adminCommand({
  setParameter: 1,
  wiredTigerConcurrentWriteTransactions: 128
})
```

## Summary

MongoDB lock metrics from `serverStatus().locks` expose how often operations wait for locks and how long those waits take. High write lock wait percentages indicate contention from long-running writes or transactions. Use `currentOp` to identify the blocking operation, consider killing it with `killOp` if it is runaway, and address root causes by using smaller transactions, adding indexes to make updates more targeted, and tuning WiredTiger concurrency ticket settings.
