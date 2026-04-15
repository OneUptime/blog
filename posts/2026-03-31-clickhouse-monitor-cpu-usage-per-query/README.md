# How to Monitor ClickHouse CPU Usage Per Query

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CPU, Performance, system.query_log, Monitoring

Description: Learn how to track CPU usage per query in ClickHouse using system tables to identify CPU-heavy queries and optimize resource allocation.

---

ClickHouse queries can consume significant CPU, especially for large aggregations and complex filtering. Identifying which queries drive CPU usage lets you prioritize optimization work and configure resource limits for multi-tenant clusters.

## CPU Metrics in system.query_log

ClickHouse records CPU usage for each completed query in `system.query_log`:

```sql
SELECT
    query,
    query_duration_ms,
    ProfileEvents['OSCPUVirtualTimeMicroseconds'] AS cpu_virtual_us,
    ProfileEvents['OSCPUWaitMicroseconds'] AS cpu_wait_us,
    ProfileEvents['RealTimeMicroseconds'] AS real_time_us,
    read_rows,
    memory_usage
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY cpu_virtual_us DESC
LIMIT 20;
```

The `OSCPUVirtualTimeMicroseconds` field gives total CPU time consumed across all query threads. This is the primary metric for identifying CPU-heavy queries.

## Calculating CPU Efficiency

CPU efficiency measures how much of the elapsed time was productive CPU work versus waiting:

```sql
SELECT
    query,
    ProfileEvents['OSCPUVirtualTimeMicroseconds'] AS cpu_us,
    ProfileEvents['RealTimeMicroseconds'] AS real_us,
    round(cpu_us / real_us, 2) AS cpu_efficiency,
    read_rows
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 1 HOUR
    AND ProfileEvents['RealTimeMicroseconds'] > 0
ORDER BY cpu_us DESC
LIMIT 20;
```

Both `OSCPUVirtualTimeMicroseconds` and `RealTimeMicroseconds` are sums across all query threads, so `cpu_efficiency` ranges from 0 to 1. Values close to 1.0 mean threads were CPU-bound. Values near 0 mean threads spent most time waiting on IO or scheduling. To measure actual parallelism, compare `OSCPUVirtualTimeMicroseconds` to `query_duration_ms * 1000` instead - a ratio above 1.0 there indicates multiple cores were used concurrently.

## Monitoring CPU Usage for Running Queries

For real-time CPU monitoring, check `system.processes`:

```sql
SELECT
    elapsed,
    read_rows,
    ProfileEvents['OSCPUVirtualTimeMicroseconds'] AS cpu_us,
    query
FROM system.processes
ORDER BY cpu_us DESC;
```

## Aggregating CPU Usage by User

Find which users are consuming the most CPU:

```sql
SELECT
    user,
    count() AS query_count,
    sum(ProfileEvents['OSCPUVirtualTimeMicroseconds']) AS total_cpu_us,
    avg(ProfileEvents['OSCPUVirtualTimeMicroseconds']) AS avg_cpu_us,
    max(ProfileEvents['OSCPUVirtualTimeMicroseconds']) AS max_cpu_us
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 1 DAY
GROUP BY user
ORDER BY total_cpu_us DESC;
```

## CPU Usage by Query Type

Break down CPU consumption by query kind:

```sql
SELECT
    query_kind,
    count() AS count,
    sum(ProfileEvents['OSCPUVirtualTimeMicroseconds']) / 1e6 AS total_cpu_seconds,
    avg(ProfileEvents['OSCPUVirtualTimeMicroseconds']) / 1e6 AS avg_cpu_seconds
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 1 DAY
GROUP BY query_kind
ORDER BY total_cpu_seconds DESC;
```

## Setting CPU Limits Per User

Use profiles to limit CPU time for specific users:

```sql
CREATE SETTINGS PROFILE analytics_profile
SETTINGS max_execution_time = 60, max_threads = 4;

ALTER USER analytics_user SETTINGS PROFILE 'analytics_profile';
```

## Summary

CPU monitoring per query in ClickHouse relies on `ProfileEvents['OSCPUVirtualTimeMicroseconds']` in `system.query_log`. Use this to identify the top CPU consumers, calculate parallel efficiency, and attribute usage by user or query type. Combine with CPU resource profiles to enforce limits in shared environments.
