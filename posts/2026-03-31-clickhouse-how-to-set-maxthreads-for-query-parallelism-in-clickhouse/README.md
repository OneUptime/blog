# How to Set max_threads for Query Parallelism in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, max_threads, Query Parallelism, Performance, Configuration

Description: Learn how to configure max_threads in ClickHouse to control per-query CPU parallelism, balancing throughput and resource sharing across concurrent queries.

---

## Overview

`max_threads` controls how many CPU threads a single query can use for parallel execution in ClickHouse. By default it equals the number of logical CPU cores on the server. Tuning this setting is critical when you want to share CPU resources between many concurrent queries or when a single query needs maximum performance.

## Default Behavior

```sql
SELECT getSetting('max_threads') AS current_max_threads
-- Returns: the number of logical CPU cores (e.g., 32 on a 32-core server)
```

By default, a single query can use all available CPU cores.

## Setting max_threads for a Query

```sql
SELECT count() FROM large_table
SETTINGS max_threads = 8;
```

## Setting for a Session

```sql
SET max_threads = 4;

-- All subsequent queries in this session use at most 4 threads
SELECT sum(value) FROM metrics WHERE date = today();
SELECT avg(latency) FROM requests WHERE date >= today() - 7;
```

## Setting in users.xml Profile

For permanent per-user or per-role defaults:

```xml
<profiles>
    <analyst>
        <max_threads>8</max_threads>
    </analyst>

    <etl_user>
        <max_threads>32</max_threads>
    </etl_user>
</profiles>
```

## Setting via SQL Settings Profile

```sql
CREATE SETTINGS PROFILE analyst_profile
    SETTINGS max_threads = 8;

ALTER USER analyst SETTINGS PROFILE 'analyst_profile';
```

## Impact on Performance

ClickHouse parallelizes query execution at the granule level. More threads allow more granules to be processed simultaneously. The speedup is approximately linear until the bottleneck shifts to disk I/O or memory bandwidth.

Check query performance metrics:

```sql
SELECT
    query,
    read_rows,
    read_bytes,
    peak_memory_usage,
    query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10
```

## Multi-Query Workloads

For dashboards or APIs with many small concurrent queries, reduce `max_threads` to allow more queries to run simultaneously without CPU contention:

```sql
-- Low-latency API queries: limit threads so many can run in parallel
SET max_threads = 4;
SELECT * FROM user_data WHERE user_id = 12345;
```

```sql
-- Heavy analytical query: use more threads when running alone
SET max_threads = 32;
SELECT sum(revenue) FROM billion_row_table WHERE date >= '2024-01-01';
```

## max_threads vs. max_final_threads

`max_final_threads` controls parallelism specifically for `SELECT ... FINAL` queries on ReplacingMergeTree. It defaults to `max_threads` but can be set separately:

```sql
SELECT * FROM my_replacing_table FINAL
SETTINGS max_final_threads = 8;
```

## Workload Concurrency Guidelines

| Scenario | Recommended max_threads |
|----------|------------------------|
| High-concurrency API / BI tool | 2-8 |
| Mixed interactive queries | 8-16 |
| Single heavy analytical query | = CPU core count |
| Background ETL job | = CPU core count |

## Checking Current Thread Usage

```sql
SELECT metric, value
FROM system.metrics
WHERE metric IN ('QueryThread', 'Query', 'ThreadsInOvercommitTracker')
```

## Summary

`max_threads` sets the maximum number of CPU threads per query in ClickHouse. The default equals the number of logical CPU cores, which is ideal for single large queries. For multi-query concurrency, reduce it per-user or per-session to share CPU resources fairly. Set it in profiles for permanent defaults or with `SETTINGS` for per-query overrides.
