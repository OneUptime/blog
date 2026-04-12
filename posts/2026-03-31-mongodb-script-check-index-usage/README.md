# How to Write a Script to Check MongoDB Index Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scripting, Index, Performance, Operation

Description: Learn how to write a script that checks MongoDB index usage statistics using $indexStats to identify unused, underused, and missing indexes across all collections.

---

## Overview

Unused indexes waste memory and slow down write operations. MongoDB's `$indexStats` aggregation stage returns per-index usage counters, letting you identify which indexes have never been used since the last restart and which are underused candidates for removal.

## Understanding $indexStats

The `$indexStats` pipeline stage returns a document for each index showing its name, key, and usage counters:

```javascript
db.orders.aggregate([{ $indexStats: {} }])
```

Output example:

```json
[
  { "name": "_id_", "key": { "_id": 1 }, "accesses": { "ops": 5420, "since": "2026-03-01T00:00:00Z" } },
  { "name": "status_1", "key": { "status": 1 }, "accesses": { "ops": 0, "since": "2026-03-01T00:00:00Z" } },
  { "name": "userId_1_createdAt_-1", "key": { "userId": 1, "createdAt": -1 }, "accesses": { "ops": 892, "since": "2026-03-01T00:00:00Z" } }
]
```

`ops: 0` means the index has not been used since the last `mongod` restart.

## Python Script to Check Index Usage Across All Collections

```python
#!/usr/bin/env python3
import os
from pymongo import MongoClient
from datetime import datetime

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
TARGET_DB = os.environ.get("MONGO_DB", "myapp")
UNUSED_OPS_THRESHOLD = 10  # Warn if fewer than this many accesses

client = MongoClient(MONGO_URI)
db = client[TARGET_DB]

def check_index_usage():
    report = []
    collections = db.list_collection_names()

    for coll_name in sorted(collections):
        collection = db[coll_name]
        try:
            stats = list(collection.aggregate([{"$indexStats": {}}]))
        except Exception as e:
            print(f"  Skipping {coll_name}: {e}")
            continue

        for stat in stats:
            name = stat["name"]
            ops = stat["accesses"]["ops"]
            since = stat["accesses"]["since"]

            if name == "_id_":
                continue  # Skip the default _id index

            status = "UNUSED" if ops == 0 else ("LOW" if ops < UNUSED_OPS_THRESHOLD else "OK")
            report.append({
                "collection": coll_name,
                "index": name,
                "key": stat["key"],
                "ops": ops,
                "since": since,
                "status": status
            })

    return report

if __name__ == "__main__":
    print(f"=== MongoDB Index Usage Report: {datetime.utcnow().isoformat()} ===")
    print(f"Database: {TARGET_DB}\n")

    report = check_index_usage()

    unused = [r for r in report if r["status"] == "UNUSED"]
    low_use = [r for r in report if r["status"] == "LOW"]
    ok = [r for r in report if r["status"] == "OK"]

    print(f"Summary: {len(ok)} used, {len(low_use)} low-use, {len(unused)} unused\n")

    if unused:
        print("UNUSED INDEXES (candidates for removal):")
        for r in unused:
            print(f"  {r['collection']}.{r['index']} - key: {r['key']} - 0 ops since {r['since']}")

    if low_use:
        print("\nLOW-USE INDEXES:")
        for r in low_use:
            print(f"  {r['collection']}.{r['index']} - {r['ops']} ops since {r['since']}")
```

## mongosh One-Liner for Quick Check

```javascript
db.getCollectionNames().forEach(coll => {
  db.getCollection(coll).aggregate([{ $indexStats: {} }]).forEach(stat => {
    if (stat.accesses.ops === 0 && stat.name !== "_id_") {
      print(coll + "." + stat.name + " - UNUSED (" + tojson(stat.key) + ")");
    }
  });
});
```

## Checking for Missing Indexes via explain()

```javascript
// Check if a common query uses an index
const plan = db.orders.find({
  userId: "user-123",
  status: "pending"
}).explain("executionStats");

const stage = plan.queryPlanner.winningPlan.queryPlan?.stage
           || plan.queryPlanner.winningPlan.stage;

if (stage === "COLLSCAN") {
  print("WARNING: Query uses a collection scan - add an index on userId + status");
}
```

## Generating a Drop Command for Unused Indexes

```python
print("\nTo drop unused indexes, run these commands:")
for r in unused:
    print(f'db.{r["collection"]}.dropIndex("{r["index"]}")')
```

## Best Practices

- Run this script after at least 24-48 hours of production traffic so `$indexStats` counters reflect real query patterns.
- `$indexStats` resets when `mongod` restarts - schedule this script to run on a fixed cadence (weekly) rather than immediately after a restart.
- Never drop an index immediately based on stats alone - cross-reference with your application's query patterns in the Atlas Performance Advisor or slow query log first.
- Drop indexes one at a time and monitor write throughput to confirm the removal improved rather than harmed performance.

## Summary

MongoDB's `$indexStats` aggregation stage exposes per-index usage counters that identify unused and low-use indexes. A weekly script that aggregates these stats across all collections surfaces candidates for removal, reducing memory pressure and improving write throughput.
