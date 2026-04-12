# How to Monitor MongoDB Index Hit Ratio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Index, Performance, Metric

Description: Learn how to monitor MongoDB index hit ratio by comparing keysExamined and docsExamined metrics to assess query efficiency and detect missing or underused indexes.

---

The index hit ratio measures how efficiently MongoDB uses indexes to satisfy queries. A high ratio means most queries are using indexes; a low ratio means MongoDB is scanning documents without index support. Tracking this metric helps identify missing indexes before slow queries appear in production.

## Understanding the Key Metrics

Three metrics from the profiler and explain plans determine index efficiency:

```text
keysExamined  - Index keys scanned to find matching documents
docsExamined  - Documents scanned after the index lookup (or without index)
nReturned     - Documents returned to the client
```

An ideal query has `keysExamined == nReturned` and `docsExamined == nReturned`.

## Checking Index Usage with explain()

```javascript
db.orders.find({ customerId: "c123", status: "shipped" })
  .explain("executionStats")
```

Key fields to inspect:

```json
{
  "executionStats": {
    "nReturned": 5,
    "totalKeysExamined": 5,
    "totalDocsExamined": 5,
    "executionTimeMillis": 2,
    "executionStages": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN"
      }
    }
  }
}
```

- `IXSCAN` means an index was used
- `COLLSCAN` means a full collection scan (no index)
- `totalKeysExamined == nReturned` means perfect index selectivity

## Monitoring via serverStatus Metrics

MongoDB's `serverStatus` exposes aggregate index scan metrics:

```javascript
const status = db.adminCommand({ serverStatus: 1 })

// Total index key scans
status.indexCounters          // removed in MongoDB 3.0
status.metrics.queryExecutor  // current approach
```

For current MongoDB versions, use the profiler for per-query analysis.

## Using the Profiler to Find Low-Index-Hit Queries

```javascript
db.setProfilingLevel(1, { slowms: 50 })

// Find queries with high docsExamined relative to nReturned
db.system.profile.aggregate([
  {
    $match: {
      op: { $in: ["query", "update", "remove"] }
    }
  },
  {
    $project: {
      ns: 1,
      op: 1,
      docsExamined: "$docsExamined",
      keysExamined: "$keysExamined",
      nReturned: "$nreturned",
      millis: 1,
      scanRatio: {
        $cond: {
          if: { $gt: ["$nreturned", 0] },
          then: { $divide: ["$docsExamined", "$nreturned"] },
          else: "$docsExamined"
        }
      }
    }
  },
  { $match: { scanRatio: { $gt: 10 } } },  // docs:returned ratio > 10:1
  { $sort: { millis: -1 } },
  { $limit: 20 }
])
```

## Detecting COLLSCAN Operations

```javascript
// Find operations that did full collection scans
db.system.profile.find(
  { "planSummary": "COLLSCAN" }
).sort({ ts: -1 }).limit(10)
```

Alternatively, enable `notablescan` to make MongoDB error on collection scans:

```javascript
db.adminCommand({ setParameter: 1, notablescan: true })
```

## Checking Index Usage Statistics

`$indexStats` shows how often each index has been used:

```javascript
db.orders.aggregate([{ $indexStats: {} }])
```

Output:

```json
[
  { "name": "_id_", "key": { "_id": 1 }, "accesses": { "ops": 45321 } },
  { "name": "customerId_1", "key": { "customerId": 1 }, "accesses": { "ops": 12543 } },
  { "name": "createdAt_1", "key": { "createdAt": 1 }, "accesses": { "ops": 0 } }
]
```

Indexes with `ops: 0` are unused and may be candidates for removal.

## Python Monitor for Profiler Data

```python
from pymongo import MongoClient
from datetime import datetime, timedelta

client = MongoClient("mongodb://localhost:27017")
db = client["myapp"]

def find_inefficient_queries(min_ratio=10, since_minutes=60):
    cutoff = datetime.utcnow() - timedelta(minutes=since_minutes)
    pipeline = [
        {"$match": {"ts": {"$gte": cutoff}, "op": {"$in": ["query", "update"]}}},
        {"$addFields": {
            "scanRatio": {
                "$cond": [{"$gt": ["$nreturned", 0]},
                          {"$divide": ["$docsExamined", "$nreturned"]}, 999]
            }
        }},
        {"$match": {"scanRatio": {"$gte": min_ratio}}},
        {"$sort": {"millis": -1}},
        {"$limit": 10},
    ]
    return list(db.system.profile.aggregate(pipeline))
```

## Summary

Monitoring MongoDB's index hit ratio requires comparing `docsExamined` to `nReturned` in profiler data. A high ratio means MongoDB is scanning far more documents than it returns, usually indicating a missing or poorly selective index. Use `explain("executionStats")` for individual query analysis, the profiler for aggregate patterns, and `$indexStats` to find unused indexes that can be dropped. Aim for a docs examined to returned ratio of 1:1 to 3:1 for well-indexed queries.
