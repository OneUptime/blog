# How to Configure ClickHouse Max Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Max Memory Usage, Memory Configuration, Query Performance, Resource Management

Description: Learn how to configure max_memory_usage and related memory settings in ClickHouse to control query memory consumption and prevent OOM errors.

---

ClickHouse is built for fast analytical queries, but unconstrained queries can consume large amounts of memory and cause out-of-memory (OOM) kills. Properly configuring max_memory_usage and related settings is essential for running a stable production ClickHouse cluster where multiple users and services share resources.

## Core Memory Settings

### max_memory_usage

The primary setting controlling how much RAM a single query can use:

```sql
-- Set for current session (OSS default: 0, which means unlimited)
SET max_memory_usage = 10737418240; -- 10 GB in bytes

-- Or use human-readable multipliers
SET max_memory_usage = '10G';
```

When a query exceeds this limit, ClickHouse throws:
```text
Memory limit (for query) exceeded: would use X bytes, max is Y bytes
```

### max_memory_usage_for_user

Limits total memory for all queries running as a specific user:

```sql
-- In users.xml or user profile
-- max_memory_usage_for_user = 30G
```

Via SQL for a profile:

```sql
ALTER SETTINGS PROFILE analytics_users SETTINGS max_memory_usage_for_user = 32212254720;
```

### max_server_memory_usage

Hard limit for the entire ClickHouse server process (set in config.xml):

```xml
<!-- config.xml -->
<max_server_memory_usage>0</max_server_memory_usage>
<!-- 0 means use max_server_memory_usage_to_ram_ratio -->

<max_server_memory_usage_to_ram_ratio>0.8</max_server_memory_usage_to_ram_ratio>
<!-- Use at most 80% of total system RAM -->
```

## Configuring in config.xml

```xml
<!-- config.xml -->
<profiles>
    <default>
        <max_memory_usage>10000000000</max_memory_usage>
        <max_memory_usage_for_user>20000000000</max_memory_usage_for_user>
        <max_bytes_before_external_group_by>5000000000</max_bytes_before_external_group_by>
        <max_bytes_before_external_sort>5000000000</max_bytes_before_external_sort>
    </default>
</profiles>
```

## External Aggregation and Sort

When queries use too much memory for GROUP BY or ORDER BY, spill to disk:

```sql
-- Allow GROUP BY to spill to disk when it uses more than 5GB
SET max_bytes_before_external_group_by = 5368709120;

-- Allow ORDER BY to spill to disk
SET max_bytes_before_external_sort = 5368709120;
```

This prevents OOM at the cost of slower query execution.

## Memory Overcommit

ClickHouse 22.2+ supports memory overcommit - soft limits that allow bursting:

```sql
SET memory_overcommit_ratio_denominator = 1073741824; -- 1 GB
SET memory_overcommit_ratio_denominator_for_user = 1073741824;
```

## Monitoring Memory Usage

```sql
-- Check current query memory usage
SELECT
    query_id,
    user,
    memory_usage,
    peak_memory_usage,
    query
FROM system.processes
ORDER BY memory_usage DESC;

-- Historical memory usage from query log
SELECT
    query_id,
    memory_usage,
    peak_memory_usage,
    query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = today()
ORDER BY peak_memory_usage DESC
LIMIT 20;
```

## Per-User Memory Profiles

Assign different memory limits to different user groups:

```sql
CREATE SETTINGS PROFILE heavy_users
    SETTINGS max_memory_usage = 50000000000;

CREATE SETTINGS PROFILE light_users
    SETTINGS max_memory_usage = 5000000000;

ALTER USER analyst_alice SETTINGS PROFILE heavy_users;
ALTER USER dashboard_service SETTINGS PROFILE light_users;
```

## Summary

Proper memory configuration in ClickHouse prevents OOM crashes and ensures fair resource sharing. Set `max_memory_usage` per query, use profiles for per-user limits, configure `max_server_memory_usage_to_ram_ratio` as a server-wide guard, and enable external sort and GROUP BY to handle large queries gracefully. Monitor memory usage through `system.processes` and `system.query_log` to tune limits based on actual workload patterns.
