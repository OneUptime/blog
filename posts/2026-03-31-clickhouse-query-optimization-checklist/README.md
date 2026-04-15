# ClickHouse Query Optimization Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Optimization, Performance, Checklist, EXPLAIN

Description: A query optimization checklist for ClickHouse covering index usage, aggregation efficiency, join optimization, and reading query execution plans.

---

Slow ClickHouse queries almost always have an identifiable root cause. This checklist walks through each step of the optimization process - from reading the query plan to applying the right fix.

## Step 1: Identify Slow Queries

```sql
-- Find the slowest queries in the last hour
SELECT
    normalized_query_hash,
    any(query) AS sample_query,
    count() AS calls,
    avg(query_duration_ms) AS avg_ms,
    max(query_duration_ms) AS max_ms,
    sum(read_rows) AS total_rows_read
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY normalized_query_hash
ORDER BY avg_ms DESC
LIMIT 20;
```

## Step 2: Read the EXPLAIN Plan

```sql
-- Check if query uses primary key index
EXPLAIN indexes = 1
SELECT count()
FROM events
WHERE user_id = 42 AND event_time >= now() - INTERVAL 7 DAY;
```

Look for:
```text
[ ] "Keys" section shows which keys are used for index pruning
[ ] "Ranges" shows the granules being scanned (fewer is better)
[ ] "Rows" estimate is close to the actual rows read
```

## Step 3: Check Primary Key Usage

```text
[ ] Query filters on leading columns of ORDER BY first
[ ] Equality conditions on ORDER BY columns before range conditions
[ ] toYYYYMM(date) = 202401 used instead of date BETWEEN '2024-01-01' AND '2024-01-31'
    (partition pruning requires matching the partition expression exactly)
```

```sql
-- Bad: skips primary index because timestamp is last in ORDER BY
SELECT count() FROM events WHERE event_time > now() - INTERVAL 1 DAY;

-- Good: add partition pruning to reduce scanned data
SELECT count() FROM events
WHERE toYYYYMM(event_time) = toYYYYMM(now())
  AND event_time > now() - INTERVAL 1 DAY;
```

## Step 4: Aggregation Optimization

```text
[ ] Use uniq() instead of uniqExact() for approximate distinct counts (much faster)
[ ] Use countIf() instead of separate subqueries for conditional counts
[ ] Use pre-aggregated materialized views for repeated dashboard queries
[ ] Avoid GROUP BY on high-cardinality columns in the same query as aggregation
```

```sql
-- Slow: uniqExact requires all values in memory
SELECT uniqExact(user_id) FROM events;

-- Fast: adaptive sampling approximation, much lower memory usage
SELECT uniq(user_id) FROM events;
```

## Step 5: JOIN Optimization

```text
[ ] Large table on LEFT side, small table on RIGHT side
[ ] Dictionaries used instead of JOINs for small dimension lookups
[ ] join_algorithm = 'parallel_hash' for large-but-in-memory right tables
[ ] join_algorithm = 'grace_hash' for right tables that may exceed memory
```

## Step 6: Sampling for Approximate Results

```sql
-- Use SAMPLE for fast approximate analytics (reads 1% of data)
SELECT
    uniq(user_id) * 100 AS estimated_unique_users
FROM events SAMPLE 0.01
WHERE event_time >= today();
```

## Step 7: Query Result Cache

```text
[ ] Repeated dashboard queries enabled for query result cache
[ ] Cache TTL matches acceptable staleness for the use case
```

## Summary

ClickHouse query optimization starts with finding slow queries in `system.query_log`, reading the EXPLAIN plan to verify primary key usage, and then applying targeted fixes: better filter ordering, approximate aggregates, pre-aggregated materialized views, or dictionary lookups. Most slow queries are fixed by adjusting filter column order or adding a materialized view.
