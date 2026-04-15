# How to Monitor ClickHouse Network IO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Monitoring, Network, Performance, system.metrics

Description: Learn how to monitor ClickHouse network IO using system tables, Prometheus metrics, and OS-level tools to detect bottlenecks and optimize throughput.

---

Network IO is a key performance dimension in ClickHouse, especially for distributed queries, replication traffic, and bulk data ingestion. Understanding and monitoring network usage helps you avoid saturation and tune cluster configuration.

## Checking Network Metrics in system.metrics

ClickHouse exposes real-time network counters in `system.metrics`:

```sql
SELECT metric, value, description
FROM system.metrics
WHERE metric LIKE '%Network%' OR metric LIKE '%Send%' OR metric LIKE '%Receive%'
ORDER BY metric;
```

Common metrics to watch include `NetworkSend`, `NetworkReceive`, `InterserverConnection`, and `HTTPConnection`.

## Querying Cumulative Network Stats from system.events

Cumulative byte counts are available in `system.events`:

```sql
SELECT
    event,
    value
FROM system.events
WHERE event IN (
    'NetworkSendBytes',
    'NetworkReceiveBytes',
    'NetworkSendElapsedMicroseconds',
    'NetworkReceiveElapsedMicroseconds'
);
```

This gives you total bytes sent and received since server startup, useful for calculating rates.

## Per-Query Network Usage from system.query_log

Each finished query records bytes sent over the network:

```sql
SELECT
    query,
    result_bytes,
    query_duration_ms,
    formatReadableSize(result_bytes) AS result_size
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY result_bytes DESC
LIMIT 10;
```

Large `result_bytes` values suggest queries returning too much data to the client - a sign of missing LIMIT clauses or over-broad SELECT *.

## Monitoring Replication Network Traffic

Replication uses its own thread pool and can saturate network links on write-heavy clusters:

```sql
SELECT
    metric,
    value
FROM system.metrics
WHERE metric IN (
    'ReplicatedSend',
    'ReplicatedFetch',
    'BackgroundMovePoolTask'
);
```

Also check the replication queue for pending transfers:

```sql
SELECT
    database,
    table,
    count() AS pending_parts
FROM system.replication_queue
WHERE type = 'GET_PART'
GROUP BY database, table
ORDER BY pending_parts DESC;
```

## Using Prometheus and Grafana

Enable ClickHouse's Prometheus endpoint in `config.xml`:

```xml
<prometheus>
    <endpoint>/metrics</endpoint>
    <port>9363</port>
    <metrics>true</metrics>
    <events>true</events>
    <asynchronous_metrics>true</asynchronous_metrics>
</prometheus>
```

Key Prometheus metrics for network IO:
- `ClickHouseMetrics_NetworkSend`
- `ClickHouseMetrics_NetworkReceive`
- `ClickHouseProfileEvents_NetworkSendBytes`
- `ClickHouseProfileEvents_NetworkReceiveBytes`

## OS-Level Network Monitoring

Combine ClickHouse metrics with OS tools for a complete picture:

```bash
# Monitor per-process network usage
nethogs -p eth0

# Check interface stats
cat /proc/net/dev | grep eth0

# Use sar for historical network data
sar -n DEV 1 10
```

## Summary

Monitoring ClickHouse network IO requires combining data from `system.metrics`, `system.events`, and `system.query_log` with OS-level tools and Prometheus metrics. Focus on replication traffic and large result sets as the primary sources of unexpected network load. Set up Grafana dashboards to track trends and alert on sustained high utilization.
