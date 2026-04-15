# How to Use Memory Overcommit Manager in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory, Overcommit, Resource Management, Performance

Description: Learn how ClickHouse's memory overcommit manager allows queries to temporarily exceed memory limits under low pressure, improving throughput without risking OOM kills.

---

ClickHouse's memory overcommit manager is a smarter alternative to hard per-query memory limits. Instead of always enforcing a fixed ceiling, it allows queries to use more memory when the system has headroom, and begins canceling the most memory-hungry queries only when actual memory pressure occurs. This increases utilization during low-traffic periods without sacrificing stability during peaks.

## How Overcommit Works

Each query sets a "soft" memory limit via `max_memory_usage`. The overcommit manager tracks total server memory usage and computes an overcommit ratio for each query (`allocated_bytes / memory_overcommit_ratio_denominator`). As long as total memory usage is below the server's threshold, queries can exceed their soft limit. When the system approaches its hard limit, the overcommit manager picks the query with the biggest overcommit ratio and cancels it with a `MEMORY_LIMIT_EXCEEDED` exception.

## Configuring Overcommit

Set the user-level soft limit and overcommit ratio in the user profile:

```xml
<profiles>
  <default>
    <!-- Soft limit: 2 GB per query -->
    <max_memory_usage>2147483648</max_memory_usage>

    <!-- Denominator for overcommit ratio: allocated_bytes / denominator -->
    <memory_overcommit_ratio_denominator>1073741824</memory_overcommit_ratio_denominator>

    <!-- Same for user-level totals -->
    <memory_overcommit_ratio_denominator_for_user>1073741824</memory_overcommit_ratio_denominator_for_user>
  </default>
</profiles>
```

The server-level hard limit is set separately:

```xml
<max_server_memory_usage_to_ram_ratio>0.9</max_server_memory_usage_to_ram_ratio>
```

This limits ClickHouse to 90% of available RAM before the overcommit manager starts canceling queries.

## Session-Level Overcommit Settings

You can also configure overcommit at the session or query level:

```sql
-- Max wait time before a query is killed under overcommit pressure
SET memory_usage_overcommit_max_wait_microseconds = 200000;

-- Set per-query overcommit denominator (in bytes)
SET memory_overcommit_ratio_denominator = 1073741824;
```

The `memory_usage_overcommit_max_wait_microseconds` setting controls how long a query waits for other queries to free memory. If the timeout expires without enough memory being freed, the query is killed with a `MEMORY_LIMIT_EXCEEDED` exception.

## Monitoring Memory Overcommit Events

```sql
SELECT event, value
FROM system.events
WHERE event LIKE '%MemoryOvercommit%';
```

Key events:
- `MemoryOvercommitWaitTimeMicroseconds` - total time queries waited due to overcommit pressure

Check current memory usage across running queries:

```sql
SELECT
    query_id,
    user,
    formatReadableSize(memory_usage) AS memory,
    substring(query, 1, 80) AS query_preview
FROM system.processes
ORDER BY memory_usage DESC
LIMIT 10;
```

## Identifying Queries Canceled by Overcommit

```sql
SELECT
    query_id,
    user,
    exception,
    formatReadableSize(memory_usage) AS peak_memory
FROM system.query_log
WHERE exception LIKE '%memory%'
    AND event_date = today()
ORDER BY event_time DESC
LIMIT 20;
```

Queries canceled by overcommit will show exceptions containing `Memory limit` or `overcommit`.

## When to Use Overcommit vs Hard Limits

| Scenario | Recommendation |
|---|---|
| Shared analytics cluster | Overcommit with server-level hard cap |
| Interactive dashboards | Hard limit with conservative `max_memory_usage` |
| Batch ETL jobs | Generous hard limit per job |
| Multi-tenant SaaS | Quotas combined with overcommit |

## Summary

The memory overcommit manager strikes a balance between resource utilization and stability. Queries can burst above their soft limit when memory is available, and the system gracefully cancels the query with the biggest overcommit ratio when pressure builds. Configure the `memory_overcommit_ratio_denominator` in user profiles, set a server-level RAM ratio cap, and monitor `MemoryOvercommitWaitTimeMicroseconds` to tune the balance for your workload.
