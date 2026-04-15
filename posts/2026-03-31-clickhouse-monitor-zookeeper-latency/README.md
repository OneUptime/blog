# How to Monitor ClickHouse ZooKeeper Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ZooKeeper, Monitoring, Replication, Latency

Description: Learn how to monitor ZooKeeper latency in ClickHouse using system tables and metrics to prevent replication failures and performance degradation.

---

ClickHouse relies heavily on ZooKeeper (or ClickHouse Keeper) for distributed coordination - managing replication, distributed DDL, and leader election. High ZooKeeper latency can cause replication delays, query failures, and cluster instability.

## Checking ZooKeeper Connection Status

First, verify ClickHouse can reach ZooKeeper:

```sql
SELECT *
FROM system.zookeeper
WHERE path = '/';
```

If this query times out or returns an error, ClickHouse has lost its ZooKeeper connection.

## Monitoring ZooKeeper Latency Metrics

ClickHouse tracks ZooKeeper operation timings in `system.metrics` and `system.events`:

```sql
SELECT metric, value
FROM system.metrics
WHERE metric LIKE '%ZooKeeper%'
ORDER BY metric;
```

```sql
SELECT event, value
FROM system.events
WHERE event LIKE '%ZooKeeper%'
ORDER BY event;
```

Key events to watch:
- `ZooKeeperTransactions` - total number of ZooKeeper operations
- `ZooKeeperWatchResponse` - watch notifications received
- `ZooKeeperUserExceptions` - data-related errors communicating with ZooKeeper
- `ZooKeeperHardwareExceptions` - network-related errors communicating with ZooKeeper
- `ZooKeeperOtherExceptions` - other ZooKeeper exceptions

## Querying the ZooKeeper Log Table

ClickHouse Keeper logs operations to `system.zookeeper_log` (if enabled):

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count() AS operations,
    countIf(error != 'ZOK') AS errors
FROM system.zookeeper_log
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

## Checking Asynchronous Metrics

ZooKeeper latency is also exposed in `system.asynchronous_metrics`:

```sql
SELECT metric, value
FROM system.asynchronous_metrics
WHERE metric LIKE '%ZooKeeper%' OR metric LIKE '%Keeper%'
ORDER BY metric;
```

This will show metrics like `ZooKeeperClientLastZXIDSeen` and various Keeper-related metrics if you are running ClickHouse Keeper. Filter results for metrics relevant to your setup.

## Detecting Replication Lag Caused by ZooKeeper

High ZooKeeper latency often manifests as replication queue growth:

```sql
SELECT
    database,
    table,
    inserts_in_queue,
    merges_in_queue,
    queue_oldest_time,
    last_queue_update
FROM system.replicas
WHERE inserts_in_queue > 10 OR merges_in_queue > 10
ORDER BY inserts_in_queue DESC;
```

## Prometheus Alerting Rules

Add alerting rules to detect ZooKeeper problems early:

```yaml
groups:
  - name: clickhouse_zookeeper
    rules:
      - alert: ClickHouseZooKeeperExceptions
        expr: >
          increase(ClickHouseProfileEvents_ZooKeeperUserExceptions_total[5m])
          + increase(ClickHouseProfileEvents_ZooKeeperHardwareExceptions_total[5m])
          + increase(ClickHouseProfileEvents_ZooKeeperOtherExceptions_total[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ZooKeeper exceptions increasing"

      - alert: ClickHouseReplicationQueueGrowing
        expr: ClickHouseMetrics_ReplicasMaxInsertsInQueue > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Replication insert queue growing, possible ZooKeeper issues"
```

## ZooKeeper Server-Side Monitoring

Check ZooKeeper's own 4-letter commands for server health:

```bash
# Check ZooKeeper latency stats
echo mntr | nc zookeeper-host 2181 | grep -E "latency|outstanding"

# Get ZooKeeper status
echo srvr | nc zookeeper-host 2181
```

The `zk_avg_latency`, `zk_min_latency`, and `zk_max_latency` output lines are your key indicators.

## Summary

Monitoring ZooKeeper latency in ClickHouse requires checking both ClickHouse-side metrics in `system.metrics`, `system.events`, and `system.zookeeper_log`, as well as ZooKeeper server-side statistics. Alert on latency above 20-50ms and on ZooKeeper exception rate increases. High ZooKeeper latency is often the root cause of mysterious replication failures.
