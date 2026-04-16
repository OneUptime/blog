# How to Handle Runaway Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Management, Performance, Operation, Incident Response

Description: Identify, kill, and prevent runaway ClickHouse queries that consume excessive CPU, memory, or run indefinitely, impacting cluster stability.

---

Runaway queries saturate CPU, exhaust memory, and degrade performance for all users. ClickHouse provides visibility and control mechanisms to stop them quickly.

## Identify Running Queries

```sql
SELECT
    query_id,
    user,
    elapsed,
    read_rows,
    read_bytes,
    memory_usage / 1e9 AS memory_gb,
    query
FROM system.processes
ORDER BY elapsed DESC;
```

Any query running longer than expected or with `memory_gb > 10` is a candidate for investigation.

## Kill a Runaway Query

```sql
KILL QUERY WHERE query_id = 'abc-123-def-456';
```

Kill all queries from a specific user:

```sql
KILL QUERY WHERE user = 'analyst_user';
```

## Prevent Runaway Queries with Limits

Set timeout and memory limits globally:

```xml
<profiles>
    <default>
        <max_execution_time>300</max_execution_time>         <!-- 5 minutes max -->
        <max_memory_usage>10000000000</max_memory_usage>     <!-- 10 GB max -->
        <timeout_before_checking_execution_speed>60</timeout_before_checking_execution_speed>
        <min_execution_speed>1000000</min_execution_speed>   <!-- min 1M rows/sec -->
    </default>
</profiles>
```

The `min_execution_speed` setting kills queries that are stuck making no progress.

## Per-User Limits

```sql
ALTER USER analyst SETTINGS
    max_execution_time = 120,
    max_memory_usage = 5000000000;
```

## Query Complexity Limits

Prevent full table scans accidentally:

```sql
SET max_rows_to_read = 1000000000;  -- 1B rows max
SET max_bytes_to_read = 100000000000;  -- 100 GB max
```

## Alerting on Long-Running Queries

Schedule a check every minute that queries `system.processes`:

```sql
SELECT count()
FROM system.processes
WHERE elapsed > 300;  -- more than 5 minutes
```

Alert via [OneUptime](https://oneuptime.com) when this count is greater than 0. Include the `query_id`, `user`, and `query` fields in the alert payload so the on-call engineer can immediately identify the culprit.

## Query Log for Post-Incident Analysis

```sql
SELECT
    query_id,
    user,
    query_duration_ms / 1000 AS duration_sec,
    memory_usage / 1e9 AS peak_gb,
    exception
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing'
  AND query_start_time > now() - INTERVAL 1 HOUR
ORDER BY query_start_time DESC;
```

## Summary

Runaway queries in ClickHouse are killed with `KILL QUERY` and prevented through execution time limits, memory caps, and minimum speed requirements. Proactive alerting on `system.processes` catches runaway queries before they impact the whole cluster.
