# How to Plan MongoDB Cluster Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Capacity Planning, Performance, Operation, Monitoring

Description: Learn how to plan MongoDB cluster capacity by analyzing working set size, throughput requirements, storage growth, and connection demands to right-size your deployment.

---

Capacity planning for MongoDB requires estimating four dimensions: RAM (working set), CPU (query throughput), storage (data growth), and connections (concurrent clients). Getting this right prevents both over-provisioning waste and under-provisioning outages.

## Measure the Working Set

The working set is the portion of your data that MongoDB actively accesses. If the working set fits in the WiredTiger cache, queries are served from memory rather than disk.

```javascript
db.runCommand({ serverStatus: 1 }).wiredTiger.cache
```

Key metrics to watch:
- `bytes currently in the cache` vs `maximum bytes configured` - aim for less than 80% utilization
- `pages read into cache` - high numbers indicate cache pressure and disk I/O

## Estimate Storage Growth

Measure current data size and calculate growth rate:

```javascript
db.runCommand({ dbStats: 1, scale: 1024 * 1024 })
```

Track `dataSize` and `storageSize` over time. Then project forward:

```python
current_gb = 500
monthly_growth_pct = 0.08  # 8% per month
months_to_plan = 12

future_gb = current_gb * ((1 + monthly_growth_pct) ** months_to_plan)
print(f"Projected storage in {months_to_plan} months: {future_gb:.1f} GB")
```

Add 30-40% headroom on top of the projection for indexes, oplog, and unexpected spikes.

## Measure Throughput Baselines

Capture ops per second during peak periods:

```javascript
db.runCommand({ serverStatus: 1 }).opcounters
```

Wait 60 seconds and call it again, then divide the delta by 60 to get ops/sec. Break down by `insert`, `query`, `update`, `delete`.

## Plan Connection Pool Sizing

Each connection consumes roughly 1 MB of RAM on the server side. Estimate your connection ceiling:

```text
max_connections = (available_RAM_for_connections_GB * 1024) / 1
```

Set `maxPoolSize` in your driver to avoid overwhelming the server:

```javascript
const client = new MongoClient(uri, {
  maxPoolSize: 50,
  minPoolSize: 5,
  waitQueueTimeoutMS: 5000
})
```

## Define Alerting Thresholds

Use a monitoring tool like OneUptime to set up capacity alerts:

| Metric | Warning | Critical |
|--------|---------|----------|
| WiredTiger cache utilization | 75% | 90% |
| Disk usage | 70% | 85% |
| Replication lag | 30s | 120s |
| Active connections | 80% of max | 95% of max |

## Plan for Failure Overhead

Your capacity plan must account for the scenario where one node fails. In a three-node replica set, the two remaining nodes must handle the full workload. Design so that at 66% capacity (two nodes) you can still serve peak traffic comfortably.

```text
per_node_capacity_target = peak_load * 2 / num_nodes
```

## Summary

MongoDB capacity planning covers RAM for the working set, storage growth projections, CPU and throughput baselines, and connection pool limits. Always add headroom for failure scenarios and unexpected growth. Instrument your cluster with monitoring alerts to catch capacity issues before they become outages.
