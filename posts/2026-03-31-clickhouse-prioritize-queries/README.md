# How to Prioritize Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Priority, Workload Scheduling, Performance, Resource Management, Settings Profile

Description: Learn how to prioritize queries in ClickHouse using workloads, priority settings, and settings profiles to ensure critical queries get resources first.

---

In a shared ClickHouse environment, not all queries are equal. Dashboard queries need sub-second responses while nightly aggregation jobs can wait. ClickHouse provides several mechanisms to give critical queries priority over background work.

## Priority Setting

The simplest priority mechanism is the `priority` query setting. Lower values mean higher priority, with 1 being the highest. A value of 0 (the default) disables priority scheduling:

```sql
-- High-priority interactive query (priority 1 is highest)
SET priority = 1;
SELECT count() FROM events WHERE user_id = 12345;

-- Low-priority batch job
SET priority = 10;
SELECT count() FROM events GROUP BY toDate(timestamp);
```

Set default priorities via user settings:

```sql
CREATE SETTINGS PROFILE interactive_profile
SETTINGS priority = 1;

CREATE SETTINGS PROFILE batch_profile
SETTINGS priority = 10;

ALTER USER dashboard_user SETTINGS PROFILE 'interactive_profile';
ALTER USER etl_user SETTINGS PROFILE 'batch_profile';
```

## OS-Level Thread Priority

For finer control, ClickHouse can set OS thread priority for query execution:

```sql
-- Set OS thread nice level (higher = lower priority)
SET os_thread_priority = 0;   -- Normal
SET os_thread_priority = 19;  -- Very low (background)
```

## Workload Scheduling for Priority Queues

Workloads provide the most powerful priority model (ClickHouse v24.11+):

```sql
CREATE WORKLOAD all;

CREATE WORKLOAD interactive IN all SETTINGS
    priority = 0,
    weight = 90;

CREATE WORKLOAD background IN all SETTINGS
    priority = 100,
    weight = 10;
```

When the server is saturated, `interactive` workload queries get 90% of available IO bandwidth and execute with higher OS priority than `background` queries.

## Limiting Background Query Impact

Prevent batch queries from consuming too many threads:

```sql
CREATE SETTINGS PROFILE batch_limits
SETTINGS
    max_threads = 4,
    priority = 10,
    max_execution_time = 3600,
    workload = 'background';
```

## Per-Query Priority at Runtime

Override priority for specific queries without changing user profiles:

```sql
-- Critical ad-hoc query needs priority boost
SELECT sum(revenue) FROM orders
WHERE order_date >= today() - 1
SETTINGS priority = 1;

-- Exploratory query should not disrupt others
SELECT * FROM large_table LIMIT 1000
SETTINGS priority = 10, max_threads = 2;
```

## Monitoring Priority Effectiveness

```sql
SELECT
    query,
    Settings['priority'] AS priority_setting,
    Settings['workload'] AS workload,
    elapsed,
    memory_usage
FROM system.processes
ORDER BY CAST(Settings['priority'] AS Int64) ASC, elapsed DESC;
```

## Identifying Runaway Low-Priority Queries

```sql
SELECT
    query_id,
    user,
    Settings['priority'] AS priority,
    elapsed,
    memory_usage,
    read_rows
FROM system.processes
WHERE Settings['priority'] > 5
  AND elapsed > 300
ORDER BY elapsed DESC;
```

Cancel a specific query:

```sql
KILL QUERY WHERE query_id = 'abc123';
```

## Summary

ClickHouse query prioritization works at multiple levels: the `priority` setting for ClickHouse-internal query scheduling, `os_thread_priority` for OS-level thread scheduling, workload scheduling for resource-based priority, and per-query `max_threads` to limit resource usage. Apply priority settings via user profiles to automatically tier workloads, and combine with workload scheduling for production multi-tenant environments.
