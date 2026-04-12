# How to Monitor MongoDB Queue Length

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Queue, Concurrency, Performance

Description: Learn how to monitor MongoDB global lock queue length from serverStatus to detect when operations are backing up waiting for locks, signaling write bottlenecks.

---

MongoDB's global lock queue length indicates how many operations are waiting to acquire locks. A growing queue means the server cannot process requests as fast as they arrive - a clear sign of write contention, slow queries blocking others, or insufficient concurrency capacity.

## Reading Queue Length from serverStatus

```javascript
const gl = db.adminCommand({ serverStatus: 1 }).globalLock

printjson(gl.currentQueue)
```

Output:

```json
{
  "total": 8,
  "readers": 3,
  "writers": 5
}
```

- `readers` - read operations waiting for a lock
- `writers` - write operations waiting for a lock
- `total` - sum of both

## Monitoring Queue Length Over Time

```python
import pymongo
import time

client = pymongo.MongoClient("mongodb://localhost:27017")

def get_queue_metrics():
    status = client.admin.command("serverStatus")
    gl = status["globalLock"]
    queue = gl.get("currentQueue", {})
    clients = gl.get("activeClients", {})

    return {
        "queue_readers": queue.get("readers", 0),
        "queue_writers": queue.get("writers", 0),
        "queue_total": queue.get("total", 0),
        "active_readers": clients.get("readers", 0),
        "active_writers": clients.get("writers", 0),
    }

while True:
    metrics = get_queue_metrics()
    print(
        f"Queue: readers={metrics['queue_readers']}  "
        f"writers={metrics['queue_writers']}  "
        f"total={metrics['queue_total']}  "
        f"| Active: read={metrics['active_readers']}  "
        f"write={metrics['active_writers']}"
    )
    if metrics["queue_writers"] > 10:
        print("  WARNING: High write queue - check for long-running operations")
    time.sleep(5)
```

## WiredTiger Concurrency Tickets

MongoDB limits the number of concurrent read and write operations using WiredTiger tickets. When all tickets are in use, new operations queue. Check ticket availability:

```javascript
const wt = db.adminCommand({ serverStatus: 1 }).wiredTiger

printjson({
  readTicketsAvailable: wt.concurrentTransactions.read.available,
  writeTicketsAvailable: wt.concurrentTransactions.write.available,
  readTicketsOut: wt.concurrentTransactions.read.out,
  writeTicketsOut: wt.concurrentTransactions.write.out,
})
```

When `available` approaches 0, operations queue. Default ticket counts are 128 for both reads and writes.

## Monitoring WiredTiger Tickets

```python
def get_ticket_metrics():
    status = client.admin.command("serverStatus")
    tickets = status["wiredTiger"]["concurrentTransactions"]

    read_total = tickets["read"]["totalTickets"]
    write_total = tickets["write"]["totalTickets"]

    return {
        "read_available": tickets["read"]["available"],
        "read_out": tickets["read"]["out"],
        "read_total": read_total,
        "write_available": tickets["write"]["available"],
        "write_out": tickets["write"]["out"],
        "write_total": write_total,
        "write_utilization": tickets["write"]["out"] / write_total * 100,
    }

metrics = get_ticket_metrics()
print(f"Write tickets: {metrics['write_out']}/{metrics['write_total']} in use ({metrics['write_utilization']:.1f}%)")
print(f"Read tickets: {metrics['read_out']}/{metrics['read_total']} in use")
```

## Diagnosing What Is in the Queue

When the queue is non-zero, check what operations are waiting:

```javascript
// Operations waiting for locks
db.adminCommand({ currentOp: 1 }).inprog.filter(op => op.waitingForLock)

// Long-running operations that may be blocking others
db.adminCommand({ currentOp: 1 }).inprog
  .filter(op => op.active && op.secs_running > 10)
  .map(op => ({ opid: op.opid, op: op.op, ns: op.ns, secs: op.secs_running }))
```

## Adjusting WiredTiger Concurrency Tickets

If the default 128 tickets is too low for your workload, increase at runtime:

```javascript
db.adminCommand({
  setParameter: 1,
  wiredTigerConcurrentReadTransactions: 256
})

db.adminCommand({
  setParameter: 1,
  wiredTigerConcurrentWriteTransactions: 256
})
```

Set permanently in `mongod.conf`:

```yaml
setParameter:
  wiredTigerConcurrentReadTransactions: 256
  wiredTigerConcurrentWriteTransactions: 256
```

## Alert Thresholds

```python
metrics = get_queue_metrics()
ticket_metrics = get_ticket_metrics()

if metrics["queue_writers"] > 5:
    print(f"ALERT: {metrics['queue_writers']} operations queued for write locks")

if ticket_metrics["write_available"] < 10:
    print(f"ALERT: Only {ticket_metrics['write_available']} write tickets remaining")
```

## Summary

MongoDB queue length from `serverStatus().globalLock.currentQueue` measures how many operations are waiting for lock resources. A non-zero writer queue indicates write contention. When queues grow, use `currentOp` to identify blocking operations and check WiredTiger ticket availability with `serverStatus().wiredTiger.concurrentTransactions`. Address persistent queueing by killing runaway operations, increasing concurrency ticket limits, or scaling the hardware to handle the write workload.
