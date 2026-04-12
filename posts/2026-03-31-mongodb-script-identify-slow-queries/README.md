# How to Write a Script to Identify Slow Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scripting, Performance, Slow Query, Profiler

Description: Learn how to write a script to identify slow MongoDB queries using the database profiler, system.profile collection, and currentOp for real-time detection.

---

## Overview

Slow queries degrade application performance and increase server load. MongoDB's built-in profiler records queries exceeding a configured threshold into the `system.profile` collection. A monitoring script can query this collection to surface the slowest operations, group them by query pattern, and suggest index improvements.

## Enabling the MongoDB Profiler

```javascript
// Profile queries slower than 100ms (level 1 = slow queries only)
db.setProfilingLevel(1, { slowms: 100 })

// Verify profiling is enabled
db.getProfilingStatus()
```

Output:

```json
{ "was": 1, "slowms": 100, "sampleRate": 1 }
```

To configure profiling permanently, add to `/etc/mongod.conf`:

```yaml
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
```

## Querying system.profile for Slow Queries

```javascript
// Top 10 slowest queries in the last hour
const oneHourAgo = new Date(Date.now() - 3600 * 1000);
db.system.profile.find({
  ts: { $gte: oneHourAgo },
  op: { $in: ["query", "command", "update", "remove"] }
}).sort({ millis: -1 }).limit(10).forEach(doc => {
  print(`${doc.millis}ms | ${doc.op} | ${doc.ns} | keys: ${doc.keysExamined} | docs: ${doc.docsExamined}`);
});
```

## Python Script for Slow Query Analysis

```python
#!/usr/bin/env python3
import os
from pymongo import MongoClient
from datetime import datetime, timedelta
from collections import defaultdict

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
TARGET_DB = os.environ.get("MONGO_DB", "myapp")
SLOW_MS_THRESHOLD = 100
LOOKBACK_HOURS = 24

client = MongoClient(MONGO_URI)
db = client[TARGET_DB]

def analyze_slow_queries():
    since = datetime.utcnow() - timedelta(hours=LOOKBACK_HOURS)

    slow_ops = list(db["system.profile"].find(
        {
            "ts": {"$gte": since},
            "millis": {"$gte": SLOW_MS_THRESHOLD},
            "op": {"$in": ["query", "command", "update", "remove"]}
        },
        {"ns": 1, "op": 1, "millis": 1, "keysExamined": 1, "docsExamined": 1,
         "planSummary": 1, "queryHash": 1}
    ).sort("millis", -1))

    print(f"=== Slow Query Report ({TARGET_DB}) ===")
    print(f"Period: last {LOOKBACK_HOURS}h | Threshold: {SLOW_MS_THRESHOLD}ms")
    print(f"Total slow operations: {len(slow_ops)}\n")

    # Group by query hash (fingerprint)
    by_hash = defaultdict(list)
    for op in slow_ops:
        key = op.get("queryHash", op.get("ns", "unknown"))
        by_hash[key].append(op)

    print("Top slow query patterns:")
    sorted_patterns = sorted(by_hash.items(), key=lambda x: max(o["millis"] for o in x[1]), reverse=True)
    for query_hash, ops in sorted_patterns[:10]:
        max_ms = max(o["millis"] for o in ops)
        avg_ms = sum(o["millis"] for o in ops) / len(ops)
        plan = ops[0].get("planSummary", "unknown")
        ns = ops[0].get("ns", "unknown")
        print(f"  Pattern: {query_hash}")
        print(f"    Namespace: {ns}")
        print(f"    Count: {len(ops)} | Max: {max_ms}ms | Avg: {avg_ms:.0f}ms")
        print(f"    Plan: {plan}")
        if "COLLSCAN" in plan:
            print(f"    ACTION: Add an index - query uses a collection scan")
        print()

analyze_slow_queries()
```

## Real-Time Detection with currentOp

```python
def find_currently_slow_ops(threshold_secs=5):
    current_ops = client.admin.command({
        "currentOp": 1,
        "active": True,
        "secs_running": {"$gt": threshold_secs}
    })

    ops = current_ops.get("inprog", [])
    if not ops:
        print(f"No operations running longer than {threshold_secs}s")
        return

    print(f"ALERT: {len(ops)} operations running > {threshold_secs}s:")
    for op in ops:
        print(f"  opid={op.get('opid')} ns={op.get('ns')} "
              f"secs={op.get('secs_running')} plan={op.get('planSummary', 'N/A')}")

find_currently_slow_ops(threshold_secs=10)
```

## Killing a Runaway Operation

```javascript
// Kill a specific operation by opid
db.killOp(12345)
```

## Scheduling the Script

```bash
# Generate slow query report every morning at 7 AM
0 7 * * * /usr/local/bin/python3 /opt/scripts/slow_query_report.py >> /var/log/mongodb-slow.log 2>&1
```

## Best Practices

- Set `slowms` to 100ms for most OLTP applications - lower values generate too much profiler overhead.
- The `system.profile` collection is capped at 1 MB by default. For busy databases, resize it: `db.setProfilingLevel(0); db.system.profile.drop(); db.createCollection("system.profile", { capped: true, size: 52428800 })`.
- Look for `COLLSCAN` in `planSummary` - this is the most actionable signal that an index is needed.
- Use `queryHash` to group identical query shapes so you see which patterns appear most frequently rather than individual slow queries.

## Summary

MongoDB slow query analysis combines the database profiler (writing slow queries to `system.profile`) with aggregation queries to surface the most impactful patterns. Look for collection scans and high `docsExamined` counts as signals for missing indexes, and monitor `currentOp` for real-time runaway operation detection.
