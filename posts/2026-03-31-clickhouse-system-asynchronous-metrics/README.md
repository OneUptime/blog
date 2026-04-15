# How to Use system.asynchronous_metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.asynchronous_metrics, Monitoring, Observability, System Table, Performance

Description: Use system.asynchronous_metrics to access periodically refreshed server health metrics like uptime, CPU usage, memory, and table counts in ClickHouse.

---

Some ClickHouse server metrics are expensive to compute and cannot be queried in real time without overhead. These are exposed through `system.asynchronous_metrics`, which refreshes its values in the background at configurable intervals (default: every second). This makes it ideal for health dashboards and alerting.

## What is system.asynchronous_metrics?

`system.asynchronous_metrics` is a system table that stores background-refreshed metrics. Unlike `system.metrics` (live gauges) or `system.events` (cumulative counters), values here are updated periodically by a background thread. Key columns:

- `metric` - metric name
- `value` - latest computed value
- `description` - explanation

## Basic Query

```sql
SELECT metric, value, description
FROM system.asynchronous_metrics
ORDER BY metric;
```

## Key Async Metrics to Watch

```sql
SELECT metric, value
FROM system.asynchronous_metrics
WHERE metric IN (
    'Uptime',
    'NumberOfDatabases',
    'NumberOfTables',
    'TotalRowsOfMergeTreeTables',
    'TotalBytesOfMergeTreeTables',
    'UncompressedCacheBytes',
    'MarkCacheBytes',
    'MaxPartCountForPartition',
    'ReplicasMaxQueueSize',
    'ReplicasMaxAbsoluteDelay',
    'jemalloc.resident',
    'jemalloc.allocated'
)
ORDER BY metric;
```

## Monitoring Replication Health

```sql
SELECT metric, value
FROM system.asynchronous_metrics
WHERE metric IN (
    'ReplicasMaxQueueSize',
    'ReplicasMaxAbsoluteDelay',
    'ReplicasSumQueueSize',
    'ReplicasMaxInsertsInQueue'
)
ORDER BY metric;
```

`ReplicasMaxAbsoluteDelay` shows the worst replication lag in seconds across all replicated tables - an essential alert metric.

## Memory and Cache Overview

```sql
SELECT
    metric,
    formatReadableSize(toUInt64(value)) AS size
FROM system.asynchronous_metrics
WHERE metric LIKE '%Cache%' OR metric LIKE '%Memory%' OR metric LIKE '%jemalloc%'
ORDER BY value DESC;
```

## Part Count Health

```sql
SELECT metric, value
FROM system.asynchronous_metrics
WHERE metric = 'MaxPartCountForPartition';
```

`MaxPartCountForPartition` measures the highest number of active parts in any single partition across all tables. Values above 300 indicate misconfiguration or overload. ClickHouse begins throttling inserts when the count exceeds `parts_to_delay_insert` (default: 1000) and rejects inserts entirely above `parts_to_throw_insert` (default: 3000). Alert if it consistently stays above 150.

## Refresh Interval

The refresh interval is controlled by `asynchronous_metrics_update_period_s` (default: 1 second). For less critical environments, increase this to reduce background CPU overhead:

```text
<asynchronous_metrics_update_period_s>10</asynchronous_metrics_update_period_s>
```

## Integration with External Monitoring

The ClickHouse Prometheus endpoint (`/metrics`) exposes `system.asynchronous_metrics` alongside `system.metrics` and `system.events`. Configure Grafana to alert on:

- `ReplicasMaxAbsoluteDelay > 60`
- `MaxPartCountForPartition > 200`
- `jemalloc.resident > 90% of total memory`

## Summary

`system.asynchronous_metrics` provides periodically refreshed health indicators in ClickHouse, including replication lag, part counts, cache sizes, and memory usage. Use it as the foundation for server health dashboards and alerting, complementing the real-time gauges in `system.metrics` and cumulative counters in `system.events`.
