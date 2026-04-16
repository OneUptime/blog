# How to Set max_execution_time for Query Timeout in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, max_execution_time, Query Timeout, Performance, Configuration

Description: Learn how to configure max_execution_time in ClickHouse to set per-query execution time limits and prevent runaway queries from consuming server resources.

---

## Overview

`max_execution_time` sets the maximum wall-clock time in seconds that a single query may run. When a query exceeds this limit, ClickHouse cancels it and returns an exception. This is essential for protecting shared servers from runaway queries and enforcing SLAs on interactive workloads.

## Default Value

By default `max_execution_time = 0`, which means no timeout - queries can run indefinitely. Always set a reasonable value for production servers.

## Setting Timeout for a Query

```sql
SELECT sum(revenue) FROM orders
SETTINGS max_execution_time = 30;
-- Exception if not finished within 30 seconds
```

## Setting for a Session

```sql
SET max_execution_time = 60;

-- All queries in this session time out after 60 seconds
SELECT count() FROM large_table;
```

## Setting in users.xml Profile

```xml
<profiles>
    <default>
        <max_execution_time>60</max_execution_time>
    </default>

    <analyst>
        <max_execution_time>300</max_execution_time>  <!-- 5 minutes for analysts -->
    </analyst>

    <admin>
        <max_execution_time>0</max_execution_time>     <!-- No timeout for admins -->
    </admin>
</profiles>
```

## Error Handling When Timeout Is Exceeded

When a query times out, ClickHouse returns:

```text
Code: 159. DB::Exception: Timeout exceeded: elapsed 30.001 sec., maximum: 30.
```

The query is canceled and rolled back for reads (no partial results are returned by default).

## timeout_overflow_mode

Control the behavior when timeout is exceeded:

```sql
-- Default: throw an exception
SET timeout_overflow_mode = 'throw';

-- Alternatively: return partial results (use with caution)
SET timeout_overflow_mode = 'break';

SELECT count() FROM very_large_table
SETTINGS
    max_execution_time    = 10,
    timeout_overflow_mode = 'break';
```

With `break`, ClickHouse returns whatever was computed in the time limit. This is useful for approximate results but can be misleading.

## Monitoring Long-Running Queries

Check currently running queries:

```sql
SELECT
    query_id,
    user,
    elapsed,
    query
FROM system.processes
WHERE elapsed > 10
ORDER BY elapsed DESC
```

Check historical slow queries:

```sql
SELECT
    query_id,
    user,
    query_duration_ms / 1000 AS duration_sec,
    exception,
    query
FROM system.query_log
WHERE (type = 'ExceptionBeforeStart' OR type = 'ExceptionWhileProcessing')
  AND exception LIKE '%Timeout%'
ORDER BY event_time DESC
LIMIT 20
```

## Killing a Running Query

```sql
KILL QUERY WHERE query_id = 'abc123-def456';
```

Or by user:

```sql
KILL QUERY WHERE user = 'analyst' SYNC;
```

## max_execution_time vs. max_execution_speed

For additional protection, combine timeout with row/byte throughput limits:

```sql
SELECT * FROM events
SETTINGS
    max_execution_time          = 30,
    max_rows_to_read            = 1000000000,
    max_bytes_to_read           = 10000000000;
```

These limits cancel the query if it reads more rows or bytes than allowed, even within the time limit.

## Recommended Settings by Role

```xml
<profiles>
    <api_user>
        <max_execution_time>5</max_execution_time>
        <max_rows_to_read>100000000</max_rows_to_read>
    </api_user>

    <dashboard_user>
        <max_execution_time>30</max_execution_time>
    </dashboard_user>

    <data_engineer>
        <max_execution_time>600</max_execution_time>
    </data_engineer>
</profiles>
```

## Summary

`max_execution_time` sets the per-query wall-clock timeout in seconds. Set it in profiles to enforce limits per user role, and use `timeout_overflow_mode = 'throw'` (the default) for strict enforcement. Monitor violations with `system.query_log` filtering on exceptions, and use `KILL QUERY` to cancel manually when needed.
