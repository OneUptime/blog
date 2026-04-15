# How to Build a ClickHouse Replication Monitoring Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Dashboard, Monitoring, High Availability

Description: Build a ClickHouse replication monitoring dashboard that tracks replication lag, queue depth, and error rates across all replicated tables in your cluster.

---

Replication health is fundamental to ClickHouse high availability. A dedicated replication monitoring dashboard gives you early warning of lag, queue buildup, and synchronization failures before they cause data inconsistency or availability problems.

## Replication Lag per Table

```sql
SELECT
    hostName() AS node,
    database,
    table,
    is_leader,
    total_replicas,
    active_replicas,
    absolute_delay AS lag_seconds,
    queue_size
FROM clusterAllReplicas('my_cluster', system.replicas)
ORDER BY lag_seconds DESC;
```

`absolute_delay` is the number of seconds behind the most up-to-date replica. `queue_size` shows the number of operations waiting to be replicated, which helps gauge how far behind a replica is.

## Replication Queue Depth

```sql
SELECT
    hostName() AS node,
    database,
    table,
    count() AS queue_entries,
    countIf(is_currently_executing) AS executing,
    min(create_time) AS oldest_entry
FROM clusterAllReplicas('my_cluster', system.replication_queue)
GROUP BY node, database, table
ORDER BY queue_entries DESC;
```

Alert when `queue_entries` exceeds a threshold (e.g., 100) or when `oldest_entry` is more than 10 minutes old.

## Replication Errors Panel

```sql
SELECT
    hostName() AS node,
    database,
    table,
    last_queue_update_exception,
    zookeeper_exception
FROM clusterAllReplicas('my_cluster', system.replicas)
WHERE last_queue_update_exception != '' OR zookeeper_exception != ''
ORDER BY database, table;
```

Any non-empty `last_queue_update_exception` or `zookeeper_exception` warrants immediate investigation.

## Replication Throughput

Track how fast parts are being replicated by querying the part log:

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count() AS parts_replicated,
    formatReadableSize(sum(size_in_bytes)) AS bytes_replicated
FROM system.part_log
WHERE event_type = 'DownloadPart'
    AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

## ZooKeeper / Keeper Queue Depth

High ZooKeeper queue depth can cause replication to stall:

```sql
SELECT
    metric,
    value
FROM system.metrics
WHERE metric IN (
    'ZooKeeperRequest',
    'ZooKeeperWatch',
    'ZooKeeperSession'
);
```

For Keeper-based deployments, monitor `KeeperOutstandingRequests`:

```sql
SELECT metric, value
FROM system.metrics
WHERE metric LIKE 'Keeper%';
```

## Replica Count Anomaly Detection

Alert if the number of active replicas drops below expected:

```sql
SELECT
    database,
    table,
    total_replicas,
    active_replicas,
    total_replicas - active_replicas AS inactive_replicas
FROM system.replicas
WHERE active_replicas < total_replicas;
```

## Setting Grafana Alert Thresholds

```text
Critical:  absolute_delay > 300 seconds
Warning:   absolute_delay > 60 seconds
Critical:  active_replicas < total_replicas for any table
Warning:   queue_entries > 500
```

## Recovering from Replication Lag

If a replica falls behind, you can trigger a manual catch-up:

```sql
SYSTEM SYNC REPLICA db.my_table;
```

For stuck replication queues, inspect entries and restart the replica state:

```sql
SELECT * FROM system.replication_queue WHERE is_currently_executing = 0 LIMIT 10;

-- Restart the replica to reset the replication state and retry stuck entries
SYSTEM RESTART REPLICA db.my_table;
```

## Summary

A ClickHouse replication monitoring dashboard provides continuous visibility into replication lag, queue health, and error state across your cluster. Use `clusterAllReplicas` to collect metrics from all nodes, set alerts on `absolute_delay` and `active_replicas`, and include error and ZooKeeper metrics to diagnose issues quickly when they occur.
