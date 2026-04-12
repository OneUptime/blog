# How to Set Up a Replica Set with Analytics Node in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Analytics, Hidden Member, Configuration

Description: Add a dedicated analytics node to your MongoDB replica set to isolate heavy analytical queries from production traffic using hidden secondary configuration.

---

## What is an Analytics Node

An analytics node is a hidden, priority-0 replica set secondary configured to serve analytics and reporting workloads. It replicates all data from the primary but is invisible to normal driver topology discovery. This prevents long-running aggregation queries from impacting application performance.

## When to Use an Analytics Node

- You run complex aggregation pipelines or BI connector queries
- Analytics queries cause read latency spikes on your application secondaries
- You need a dedicated node for Spark connectors or ETL jobs
- Compliance requires analytics data processing on isolated infrastructure

## Add the Analytics Node to the Replica Set

On the analytics host, install MongoDB with the same `mongod.conf` settings and keyfile as existing members. Then add it to the replica set from the primary:

```javascript
rs.add({
  host: "analytics.example.com:27017",
  priority: 0,
  hidden: true,
  votes: 1
})
```

Setting `priority: 0` ensures this node never becomes primary. Setting `hidden: true` hides it from client topology discovery.

## Optionally Add a Replication Delay

For point-in-time analysis or protection against accidental data changes, add a delay:

```javascript
var cfg = rs.conf()
var analyticsIdx = cfg.members.findIndex(
  m => m.host === "analytics.example.com:27017"
)
cfg.members[analyticsIdx].secondaryDelaySecs = 7200  // 2 hours behind
rs.reconfig(cfg)
```

## Verify the Analytics Node Configuration

```javascript
rs.conf().members.find(m => m.host.includes("analytics"))
```

Expected output:

```javascript
{
  _id: 3,
  host: "analytics.example.com:27017",
  priority: 0,
  hidden: true,
  votes: 1,
  secondaryDelaySecs: 7200
}
```

## Connect Directly to the Analytics Node

Since the node is hidden, drivers will not auto-discover it. Connect directly for analytics:

```python
from pymongo import MongoClient

# Direct connection bypasses hidden member exclusion
client = MongoClient(
    "mongodb://analytics.example.com:27017/?directConnection=true",
    username="analyticsUser",
    password="password",
    authSource="admin"
)

pipeline = [
    {"$match": {"status": "completed"}},
    {"$group": {"_id": "$region", "total": {"$sum": "$amount"}}},
    {"$sort": {"total": -1}}
]

results = list(client["orders"]["sales"].aggregate(pipeline))
```

## Grant Analytics User Read-Only Access

Create a dedicated read-only user for analytics workloads:

```javascript
use admin
db.createUser({
  user: "analyticsUser",
  pwd: "securepassword",
  roles: [
    { role: "read", db: "orders" },
    { role: "read", db: "inventory" }
  ]
})
```

## Resource Allocation

Analytics nodes benefit from higher RAM to support in-memory sort operations and large working sets:

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 16
```

## Summary

An analytics node in a MongoDB replica set is a hidden, priority-0 secondary that absorbs heavy analytical queries without impacting primary or application secondary performance. Add it via `rs.add()` with `hidden: true` and `priority: 0`, optionally with a replication delay for point-in-time reads. Connect directly using `directConnection=true` since hidden members are excluded from normal driver topology discovery.
