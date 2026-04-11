# How to Use SQL_NO_CACHE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL_NO_CACHE, Query Cache, Performance

Description: Learn what SQL_NO_CACHE does in MySQL, why the query cache was removed in MySQL 8.0, and how to accurately benchmark query performance without cache interference.

---

## What Is SQL_NO_CACHE

`SQL_NO_CACHE` is a MySQL query modifier that was used to tell MySQL not to use or populate the query cache for a specific `SELECT` statement. It was primarily used when benchmarking queries to ensure results came from disk or InnoDB buffer pool rather than the query result cache.

```sql
-- MySQL 5.7 and earlier: bypass the query cache
SELECT SQL_NO_CACHE id, name, total
FROM orders
WHERE status = 'PENDING';
```

## Query Cache Removed in MySQL 8.0

The MySQL query cache was deprecated in MySQL 5.7.20 and removed entirely in MySQL 8.0. Therefore:
- `SQL_NO_CACHE` is deprecated as of MySQL 8.0.3 and will raise a deprecation warning
- `SQL_CACHE` (the opposite hint) is also gone
- The query cache variables (`query_cache_type`, `query_cache_size`) no longer exist

```sql
-- MySQL 8.0: this raises a deprecation warning, the hint is ignored
SELECT SQL_NO_CACHE id FROM users LIMIT 1;
-- Warning 1681: 'SQL_NO_CACHE' is deprecated and will be removed in a future release.
```

## Why the Query Cache Was Removed

The MySQL query cache had severe scalability problems:
- It used a global mutex, creating a bottleneck under concurrent load
- Cache invalidation was coarse-grained (entire table invalidation on any write)
- On write-heavy workloads it hurt more than it helped
- Modern hardware and InnoDB buffer pool make it largely unnecessary

## Benchmarking Without Cache Interference in MySQL 8.0

Since there is no query cache in MySQL 8.0, accurate benchmarking focuses on avoiding the InnoDB buffer pool warm effect.

### Flush Status Between Runs

```sql
-- Reset query counters before each benchmark run
FLUSH STATUS;

-- Run the query under test
SELECT id, name, total
FROM orders
WHERE status = 'PENDING'
ORDER BY created_at DESC;

-- Read execution statistics
SHOW SESSION STATUS LIKE 'Handler_%';
SHOW SESSION STATUS LIKE 'Sort_%';
```

### Use EXPLAIN ANALYZE (MySQL 8.0.18+)

```sql
-- EXPLAIN ANALYZE actually executes the query and reports real timing
EXPLAIN ANALYZE
SELECT id, name, total
FROM orders
WHERE status = 'PENDING'
ORDER BY created_at DESC
LIMIT 100;
```

Sample output:

```text
-> Limit: 100 row(s)  (actual time=0.523..0.531 rows=100 loops=1)
    -> Sort: orders.created_at DESC  (actual time=0.521..0.523 rows=100 loops=1)
        -> Filter: (orders.status = 'PENDING')  (actual time=0.089..0.246 rows=342 loops=1)
            -> Index scan on orders using idx_status  (actual time=0.082..0.194 rows=342 loops=1)
```

### Force InnoDB to Re-Read from Disk

To simulate a cold buffer pool (queries reading from disk), restart MySQL or reduce the buffer pool size during testing:

```bash
# Clear OS page cache to simulate cold disk reads (Linux only)
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
```

```sql
-- Force InnoDB to discard buffer pool pages for a table
SELECT * FROM orders LIMIT 0;  -- not sufficient alone

-- More reliable: restart MySQL with a smaller buffer pool for benchmarking
```

## Using Performance Schema for Accurate Metrics

```sql
-- Enable statement instrumentation
UPDATE performance_schema.setup_instruments
SET enabled = 'YES', timed = 'YES'
WHERE name LIKE 'statement/%';

UPDATE performance_schema.setup_consumers
SET enabled = 'YES'
WHERE name IN ('events_statements_current', 'events_statements_history');

-- Run query under test, then check timing
SELECT digest_text, count_star, avg_timer_wait / 1e9 AS avg_ms
FROM performance_schema.events_statements_summary_by_digest
WHERE digest_text LIKE '%orders%'
ORDER BY avg_timer_wait DESC
LIMIT 5;
```

## Summary

`SQL_NO_CACHE` was a MySQL query cache bypass hint that is no longer relevant in MySQL 8.0 because the query cache was removed entirely. For accurate query benchmarking in MySQL 8.0, use `EXPLAIN ANALYZE` for real execution timing, `FLUSH STATUS` to reset counters between runs, and Performance Schema to track per-statement statistics. These tools give far more detailed performance data than the old query cache hints ever could.
