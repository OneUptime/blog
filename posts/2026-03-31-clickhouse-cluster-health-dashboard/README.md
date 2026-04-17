# How to Build a ClickHouse Cluster Health Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cluster, Dashboard, Monitoring, Health

Description: Build a ClickHouse cluster health dashboard that tracks node availability, ZooKeeper connectivity, replication status, and resource utilization across all replicas.

---

A cluster health dashboard provides a single pane of glass for the operational state of your ClickHouse deployment. It surfaces node-level metrics, replication health, Keeper/ZooKeeper connectivity, and resource saturation before they become incidents.

## Node Availability Panel

Query all nodes using `clusterAllReplicas`:

```sql
SELECT
    hostName() AS node,
    uptime() AS uptime_seconds,
    version() AS version,
    getSetting('max_threads') AS max_threads
FROM clusterAllReplicas('my_cluster', system.one)
ORDER BY node;
```

If a node is unreachable, it will not appear in results - count the returned rows against expected node count.

## ZooKeeper / Keeper Connectivity

```sql
SELECT
    hostName() AS node,
    session_uptime_elapsed_seconds,
    is_expired
FROM clusterAllReplicas('my_cluster', system.zookeeper_connection)
ORDER BY node;
```

Watch for nodes with `session_uptime_elapsed_seconds` close to zero, indicating frequent session resets.

## Replication Health Panel

```sql
SELECT
    hostName() AS node,
    database,
    table,
    total_replicas,
    active_replicas,
    queue_size,
    absolute_delay
FROM clusterAllReplicas('my_cluster', system.replicas)
WHERE is_leader = 1 OR absolute_delay > 0
ORDER BY absolute_delay DESC;
```

Alert when `absolute_delay` exceeds your SLA threshold (typically 60-300 seconds).

## Merge Queue Depth

```sql
SELECT
    hostName() AS node,
    database,
    table,
    count() AS merges_in_queue
FROM clusterAllReplicas('my_cluster', system.merges)
GROUP BY node, database, table
ORDER BY merges_in_queue DESC;
```

High merge queue depth can indicate an insert rate exceeding the merge throughput.

## CPU and Memory Utilization

```sql
SELECT
    hostName() AS node,
    formatReadableSize(sumIf(value, metric = 'OSMemoryTotal')) AS total_ram,
    formatReadableSize(sumIf(value, metric = 'OSMemoryFreeWithoutCaches')) AS free_ram,
    round((1 - sumIf(value, metric = 'OSMemoryFreeWithoutCaches') / sumIf(value, metric = 'OSMemoryTotal')) * 100, 1) AS memory_pct
FROM clusterAllReplicas('my_cluster', system.asynchronous_metrics)
WHERE metric IN ('OSMemoryTotal', 'OSMemoryFreeWithoutCaches')
GROUP BY node
-- Use system.asynchronous_metric_log for historical data
```

For a simpler per-node summary:

```sql
SELECT
    hostName() AS node,
    metric,
    value
FROM clusterAllReplicas('my_cluster', system.asynchronous_metrics)
WHERE metric IN ('OSCPUUtilization', 'MemoryResident', 'DiskAvailable_default')
ORDER BY node, metric;
```

## Part Count Health

```sql
SELECT
    hostName() AS node,
    database,
    table,
    count() AS active_parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size
FROM clusterAllReplicas('my_cluster', system.parts)
WHERE active = 1
GROUP BY node, database, table
ORDER BY active_parts DESC
LIMIT 20;
```

Tables with more than 3000 active parts may experience performance degradation.

## Setting Up the Dashboard

Use Grafana with the ClickHouse data source plugin. Create one row per metric category (availability, replication, merges, resources) and add threshold-based color coding:

```text
Green:  delay < 30s, parts < 500, memory < 70%
Yellow: delay 30-120s, parts 500-2000, memory 70-85%
Red:    delay > 120s, parts > 2000, memory > 85%
```

## Summary

A ClickHouse cluster health dashboard unifies node availability, replication lag, merge queue depth, and resource utilization into one view. Use `clusterAllReplicas` to fan out queries to all nodes simultaneously, and set color thresholds to make problem areas immediately visible. Pair with PagerDuty or Slack alerts on the most critical metrics.
