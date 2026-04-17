# How to Set Up ClickHouse Alerts for Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Alert, Memory, Monitoring, Resource Management

Description: Configure memory usage alerts in ClickHouse to prevent out-of-memory crashes by tracking per-query and server-level memory consumption in real time.

---

Memory exhaustion is one of the most disruptive ClickHouse failures - it can crash the server process, corrupt in-flight queries, and require manual intervention to recover. Proactive memory alerts give you time to kill runaway queries or scale resources before the OOM killer strikes.

## Tracking Current Memory Usage

Check server-level memory metrics:

```sql
SELECT
    metric,
    formatReadableSize(value) AS size
FROM system.asynchronous_metrics
WHERE metric IN (
    'MemoryResident',
    'MemoryVirtual',
    'MemoryCode',
    'MemoryDataAndStack'
)
ORDER BY metric;
```

For a quick summary of how much memory ClickHouse is using vs. available:

```sql
SELECT
    formatReadableSize(sum(memory_usage)) AS queries_using,
    formatReadableSize(value) AS server_total
FROM system.processes
CROSS JOIN (
    SELECT value FROM system.asynchronous_metrics WHERE metric = 'MemoryResident'
) m
GROUP BY server_total;
```

## Tracking Memory Per Query

```sql
SELECT
    query_id,
    user,
    elapsed,
    formatReadableSize(memory_usage) AS memory,
    substring(query, 1, 100) AS query_preview
FROM system.processes
ORDER BY memory_usage DESC
LIMIT 10;
```

Alert when any single query exceeds 8 GB, which often indicates a missing filter or unexpected full-table join.

## Historical Memory Tracking

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    max(memory_usage) AS peak_query_memory,
    avg(memory_usage) AS avg_query_memory,
    countIf(memory_usage > 4294967296) AS queries_over_4gb
FROM system.query_log
WHERE type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

## Prometheus Alert Rules

```yaml
groups:
  - name: clickhouse_memory
    rules:
      - alert: ClickHouseMemoryUsageHigh
        expr: |
          ClickHouseAsyncMetrics_MemoryResident /
          ClickHouseAsyncMetrics_OSMemoryTotal > 0.80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse memory above 80% on {{ $labels.instance }}"

      - alert: ClickHouseMemoryUsageCritical
        expr: |
          ClickHouseAsyncMetrics_MemoryResident /
          ClickHouseAsyncMetrics_OSMemoryTotal > 0.92
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ClickHouse memory above 92% - OOM risk on {{ $labels.instance }}"

      - alert: ClickHouseMemoryLimitExceeded
        expr: increase(ClickHouseErrorMetric_MEMORY_LIMIT_EXCEEDED[5m]) > 0
        labels:
          severity: warning
        annotations:
          summary: "Memory limit exceeded errors on {{ $labels.instance }}"
```

## Alerting on Memory Limit Exceptions

```sql
SELECT
    toStartOfHour(event_time) AS hour,
    user,
    count() AS oom_errors,
    max(memory_usage) AS peak_memory
FROM system.query_log
WHERE exception LIKE '%Memory limit%'
    AND event_date = today()
GROUP BY hour, user
ORDER BY hour DESC, oom_errors DESC;
```

## Responding to Memory Alerts

When memory usage is critically high:

1. Kill the highest-memory query:

```sql
KILL QUERY WHERE query_id = (
    SELECT query_id FROM system.processes ORDER BY memory_usage DESC LIMIT 1
);
```

2. Check and reduce `max_memory_usage` for the offending user profile
3. Consider enabling the memory overcommit manager to automatically cancel excess queries

```xml
<profiles>
  <default>
    <max_memory_usage>4294967296</max_memory_usage>
    <memory_overcommit_ratio_denominator>1073741824</memory_overcommit_ratio_denominator>
  </default>
</profiles>
```

## Summary

Memory alerts are critical for ClickHouse stability. Set warning alerts at 80% server memory usage and critical alerts at 90%. Monitor per-query memory in `system.processes` to identify runaway queries early, track historical patterns in `system.query_log` to find users or query patterns that consistently consume excessive memory, and use the memory overcommit manager to automate graceful degradation under pressure.
