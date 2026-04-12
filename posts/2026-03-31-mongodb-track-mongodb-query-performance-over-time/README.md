# How to Track MongoDB Query Performance Over Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, Performance, Profiler, Monitoring

Description: Track MongoDB query performance over time using the profiler, system.profile collection, and custom metrics pipelines to catch slow query regressions.

---

## Introduction

Query performance in MongoDB can degrade over time as data grows, indexes are not maintained, or new query patterns emerge. Tracking performance trends requires enabling the profiler, storing historical data, and building visualizations. This guide walks through the MongoDB profiler, query shape analysis, and automated slow query reporting.

## Enabling the MongoDB Profiler

```javascript
// Enable profiling for queries slower than 100ms on a specific database
use myapp
db.setProfilingLevel(1, { slowms: 100 })

// Check current profiling level
db.getProfilingStatus()
// { "was": 1, "slowms": 100, "sampleRate": 1 }
```

## Querying the system.profile Collection

```javascript
// Find the 10 slowest queries in the last hour
db.system.profile.find({
  ts: { $gte: new Date(Date.now() - 3600000) }
})
.sort({ millis: -1 })
.limit(10)
.project({
  op: 1,
  ns: 1,
  millis: 1,
  "command.filter": 1,
  ts: 1,
  planSummary: 1
})
```

## Aggregating Query Trends

```javascript
// Average execution time by query shape (namespace + operation)
db.system.profile.aggregate([
  {
    $match: {
      ts: { $gte: new Date(Date.now() - 86400000) }
    }
  },
  {
    $group: {
      _id: { ns: "$ns", op: "$op" },
      avgMs: { $avg: "$millis" },
      maxMs: { $max: "$millis" },
      count: { $sum: 1 }
    }
  },
  { $sort: { avgMs: -1 } },
  { $limit: 20 }
])
```

## Storing Historical Query Metrics

Export slow query data to a time-series collection for long-term tracking:

```python
# scripts/collect_slow_queries.py
from pymongo import MongoClient
from datetime import datetime, timedelta
import os

def collect_and_store():
    client = MongoClient(os.environ["MONGODB_URI"])
    app_db = client.myapp
    metrics_db = client.mongodb_metrics

    cutoff = datetime.utcnow() - timedelta(minutes=5)
    slow_queries = list(app_db.system.profile.find(
        {"ts": {"$gte": cutoff}},
        {"_id": 0, "op": 1, "ns": 1, "millis": 1, "ts": 1, "planSummary": 1}
    ))

    if slow_queries:
        for q in slow_queries:
            q["collectedAt"] = datetime.utcnow()
        metrics_db.slow_query_history.insert_many(slow_queries)
        print(f"Stored {len(slow_queries)} slow queries")

collect_and_store()
```

## Exposing Metrics to Prometheus

```python
from prometheus_client import Histogram

query_latency = Histogram(
    "mongodb_query_latency_ms",
    "MongoDB query execution time",
    ["namespace", "operation"],
    buckets=[10, 50, 100, 250, 500, 1000, 5000]
)

for query in slow_queries:
    query_latency.labels(
        namespace=query["ns"],
        operation=query["op"]
    ).observe(query["millis"])
```

## Using explain() for Specific Query Analysis

```javascript
// Analyze query plan and execution stats
db.users.find({ email: "alice@example.com" }).explain("executionStats")

// Key fields to check
{
  "executionStats": {
    "totalDocsExamined": 50000,  // High = missing index
    "totalKeysExamined": 1,      // Should equal nReturned
    "executionTimeMillis": 234,
    "nReturned": 1
  }
}
```

## Summary

Tracking MongoDB query performance over time requires enabling the profiler at an appropriate threshold (100ms is a good starting point), aggregating `system.profile` data by query shape, and storing historical snapshots in a dedicated metrics collection. Use `explain("executionStats")` to investigate specific regressions, focusing on queries where `totalDocsExamined` far exceeds `nReturned` as the primary signal of a missing or unused index.
