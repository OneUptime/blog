# How to Use SETTINGS Clause in ClickHouse Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, Setting, Configuration, Performance

Description: Override ClickHouse server settings at the query level using the SETTINGS clause to tune memory, threads, join algorithms, and more.

---

ClickHouse exposes hundreds of server-level settings that control query execution - memory limits, thread counts, join strategies, and more. While defaults are set in `users.xml` or user profiles, you can override any of them for a single query using the `SETTINGS` clause. This lets you tune expensive queries without touching global configuration.

## Basic Syntax

Place the `SETTINGS` clause near the end of a `SELECT` statement, after `LIMIT` but before any `UNION`, `INTO OUTFILE`, or `FORMAT` clauses:

```sql
SELECT
    user_id,
    count() AS total_events
FROM events
GROUP BY user_id
SETTINGS max_threads = 4;
```

Multiple settings are separated by commas:

```sql
SELECT *
FROM large_table
SETTINGS
    max_threads = 8,
    max_memory_usage = 10000000000;
```

## Controlling Parallelism with max_threads

`max_threads` limits how many CPU threads ClickHouse uses to process the query. Reducing it is useful when running analytics on a shared cluster where you want to leave resources for other users:

```sql
-- Run a heavy aggregation but cap thread usage
SELECT
    toStartOfHour(timestamp) AS hour,
    count()                  AS requests
FROM access_logs
WHERE toDate(timestamp) = today()
GROUP BY hour
ORDER BY hour
SETTINGS max_threads = 2;
```

## Limiting Memory Usage

`max_memory_usage` sets a hard cap (in bytes) on the RAM a single query can consume. Queries that exceed the limit are killed with an error rather than OOM-killing the server:

```sql
SELECT
    session_id,
    groupArray(event_name) AS events
FROM user_sessions
GROUP BY session_id
SETTINGS max_memory_usage = 5368709120;  -- 5 GB cap
```

To set a limit per user across all their concurrent queries use `max_memory_usage_for_user`.

## Choosing a Join Algorithm

The `join_algorithm` setting lets you override the default hash join with alternatives better suited to large tables:

```sql
-- Force a partial merge join to avoid large memory spikes
SELECT
    o.order_id,
    u.name,
    o.total
FROM orders AS o
INNER JOIN users AS u ON o.user_id = u.user_id
SETTINGS join_algorithm = 'partial_merge';

-- Use a grace hash join for large right-side tables
SELECT
    l.event_id,
    r.metadata
FROM events AS l
INNER JOIN event_meta AS r ON l.event_id = r.event_id
SETTINGS join_algorithm = 'grace_hash';
```

Available algorithms include `hash`, `parallel_hash`, `partial_merge`, `direct`, `auto`, `full_sorting_merge`, and `grace_hash`.

## Aggregation and GROUP BY Settings

```sql
-- Use two-level aggregation immediately (better for high-cardinality GROUP BY)
SELECT
    url,
    count() AS hits
FROM page_views
GROUP BY url
SETTINGS group_by_two_level_threshold = 1;

-- Spill aggregation state to disk when memory is tight
SELECT
    user_id,
    count()        AS actions,
    sum(revenue)   AS total_revenue
FROM events
GROUP BY user_id
SETTINGS
    max_bytes_before_external_group_by = 2000000000,
    max_memory_usage = 4000000000;
```

## Sorting Settings

```sql
-- Allow merge sort to spill to disk for very large ORDER BY results
SELECT *
FROM events
ORDER BY timestamp DESC
SETTINGS
    max_bytes_before_external_sort = 2000000000,
    max_memory_usage = 4000000000;
```

## Timeout Settings

```sql
-- Kill the query if it runs longer than 30 seconds
SELECT *
FROM huge_scan
WHERE complex_condition = 1
SETTINGS max_execution_time = 30;

-- Limit total rows read (useful for interactive queries)
SELECT *
FROM logs
SETTINGS max_rows_to_read = 100000000;
```

## Enabling Parallel Replicas

For distributed setups you can read from multiple replicas in parallel to accelerate large scans:

```sql
SELECT count()
FROM distributed_events
SETTINGS
    enable_parallel_replicas = 1,
    max_parallel_replicas = 3,
    parallel_replicas_for_non_replicated_merge_tree = 1;
```

## Summary

The `SETTINGS` clause gives you per-query control over nearly every aspect of ClickHouse execution without modifying global configuration. Use `max_threads` and `max_memory_usage` to protect shared resources, `join_algorithm` to handle large joins gracefully, and `max_execution_time` to guard against runaway queries. All settings revert to their defaults after the query completes.
