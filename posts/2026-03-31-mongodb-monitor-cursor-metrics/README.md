# How to Monitor MongoDB Cursor Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Cursor, Performance, Metric

Description: Learn how to monitor MongoDB cursor metrics from serverStatus to detect cursor leaks, high open cursor counts, and timed-out cursors that waste server resources.

---

MongoDB cursors represent server-side state for open query result sets. Each open cursor consumes server memory. Leaked cursors (those never closed by the client) accumulate until the cursor timeout (10 minutes by default) expires them. Monitoring cursor metrics helps detect driver bugs, connection leaks, and inefficient result iteration patterns.

## Reading Cursor Metrics

```javascript
db.adminCommand({ serverStatus: 1 }).metrics.cursor
```

Output:

```json
{
  "timedOut": 1234,
  "open": {
    "noTimeout": 5,
    "pinned": 2,
    "multiTarget": 0,
    "singleTarget": 18,
    "total": 25
  }
}
```

## Key Metrics Explained

```text
open.total        - Total open cursors right now
open.singleTarget - Cursors targeting a single shard (mongos only)
open.pinned       - Cursors currently in active use by an operation (pinned to prevent deletion)
open.noTimeout    - Cursors with noCursorTimeout=true set (never expire)
timedOut          - Cumulative cursors that expired after timeout
```

## Monitoring Cursor Metrics in Python

```python
import pymongo
import time

client = pymongo.MongoClient("mongodb://localhost:27017")

def get_cursor_metrics():
    status = client.admin.command("serverStatus")
    cursor = status["metrics"]["cursor"]
    return {
        "open_total": cursor["open"]["total"],
        "open_pinned": cursor["open"]["pinned"],
        "open_no_timeout": cursor["open"]["noTimeout"],
        "timed_out": cursor["timedOut"],
    }

prev_timed_out = get_cursor_metrics()["timed_out"]

while True:
    metrics = get_cursor_metrics()
    new_timeouts = metrics["timed_out"] - prev_timed_out

    print(
        f"Cursors: open={metrics['open_total']}  "
        f"pinned={metrics['open_pinned']}  "
        f"noTimeout={metrics['open_no_timeout']}  "
        f"new_timeouts={new_timeouts}"
    )

    if metrics["open_total"] > 500:
        print("  WARNING: High open cursor count - check for cursor leaks")
    if new_timeouts > 10:
        print("  WARNING: Cursors timing out - clients may not be closing cursors properly")

    prev_timed_out = metrics["timed_out"]
    time.sleep(30)
```

## Finding Open Cursors with currentOp

List all currently open cursors:

```javascript
db.adminCommand({
  aggregate: 1,
  pipeline: [{ $currentOp: { idleCursors: true } }],
  cursor: {}
}).cursor.firstBatch.forEach(op => {
  if (op.type === "idleCursor") {
    print(JSON.stringify({
      cursorId: op.cursor.cursorId,
      ns: op.ns,
      appName: op.clientMetadata?.application?.name,
      createdDate: op.cursor.createdDate,
      lastAccessDate: op.cursor.lastAccessDate
    }))
  }
})
```

## Investigating Cursor Leaks

Cursor leaks occur when application code iterates a cursor but never closes it. In Python with pymongo:

```python
# BAD - cursor may not be closed if exception occurs
cursor = collection.find({})
for doc in cursor:
    process(doc)

# GOOD - context manager ensures cursor closes
with collection.find({}) as cursor:
    for doc in cursor:
        process(doc)

# Also acceptable - exhaust the cursor
docs = list(collection.find({}))  # cursor auto-closed on exhaustion
```

## Checking noTimeout Cursors

Cursors created with `noCursorTimeout=True` never expire and can accumulate indefinitely:

```python
# Avoid unless absolutely necessary
cursor = collection.find({}, no_cursor_timeout=True)
# Must manually call cursor.close() or use context manager
```

Find all noTimeout cursors in your profiler:

```javascript
db.adminCommand({ serverStatus: 1 }).metrics.cursor.open.noTimeout
```

## Configuring Cursor Timeout

The default cursor timeout is 10 minutes (600,000ms). Adjust in `mongod.conf`:

```yaml
setParameter:
  cursorTimeoutMillis: 300000  # 5 minutes
```

Or at runtime:

```javascript
db.adminCommand({ setParameter: 1, cursorTimeoutMillis: 300000 })
```

## Alert on Cursor Metrics

```python
metrics = get_cursor_metrics()

if metrics["open_total"] > 1000:
    print(f"CRITICAL: {metrics['open_total']} open cursors - investigate cursor leak")

if metrics["open_no_timeout"] > 50:
    print(f"WARNING: {metrics['open_no_timeout']} noTimeout cursors - verify they are necessary")
```

## Summary

MongoDB cursor metrics from `serverStatus().metrics.cursor` expose open cursor counts and cumulative timeouts. A growing `open.total` with rising `timedOut` indicates clients are not closing cursors after use. Monitor `open.noTimeout` separately since these cursors accumulate without bounds. In application code, always close cursors explicitly or use context managers to ensure proper cleanup. Set Prometheus alerts on `open.total` exceeding a threshold relevant to your expected cursor usage patterns.
