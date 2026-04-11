# How to Troubleshoot Slow MySQL Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Slow Query, Troubleshooting, Index

Description: A step-by-step guide to finding and fixing slow MySQL queries using the slow query log, EXPLAIN, and Performance Schema.

---

## Step 1: Enable the Slow Query Log

The slow query log captures queries that exceed a time threshold. Enable it without restarting MySQL:

```sql
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;          -- log queries taking over 1 second
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL log_queries_not_using_indexes = ON;
```

Verify the settings:

```sql
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';
```

## Step 2: Analyze the Slow Query Log with mysqldumpslow

`mysqldumpslow` groups similar queries and shows the worst offenders:

```bash
# Top 10 slowest queries by average execution time
mysqldumpslow -s at -t 10 /var/log/mysql/slow.log

# Top 10 queries by total time
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log
```

## Step 3: Use EXPLAIN to Inspect Query Plans

Once you have a slow query, run EXPLAIN to see how MySQL executes it:

```sql
EXPLAIN SELECT o.id, c.name, o.total
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC
LIMIT 100;
```

Key columns to check:
- `type`: `ALL` means a full table scan - bad. `ref`, `eq_ref`, or `const` are good.
- `rows`: estimated rows examined. High numbers indicate missing indexes.
- `Extra`: look for `Using filesort` and `Using temporary` - these are expensive operations.

## Step 4: Use EXPLAIN ANALYZE for Real Timing

MySQL 8 supports `EXPLAIN ANALYZE`, which actually runs the query and shows real timing:

```sql
EXPLAIN ANALYZE
SELECT o.id, o.total
FROM orders o
WHERE o.status = 'pending'
ORDER BY o.created_at DESC
LIMIT 100;
```

The output shows actual vs. estimated rows and loop time, helping you pinpoint which join or filter is slow.

## Step 5: Check for Missing Indexes

```sql
-- Find tables with the most read I/O since last reset
SELECT object_schema, object_name, count_read
FROM performance_schema.table_io_waits_summary_by_table
WHERE count_read > 0
ORDER BY count_read DESC
LIMIT 20;

-- Check existing indexes on a table
SHOW INDEX FROM orders;
```

Add an index that covers your WHERE and ORDER BY columns:

```sql
-- Composite index for status + sort
ALTER TABLE orders ADD INDEX idx_status_created (status, created_at DESC);
```

## Step 6: Check for Lock Waits

A query may appear slow because it is blocked waiting for a lock:

```sql
SELECT r.trx_id AS waiting_trx,
       r.trx_mysql_thread_id AS waiting_thread,
       b.trx_id AS blocking_trx,
       b.trx_mysql_thread_id AS blocking_thread,
       b.trx_query AS blocking_query
FROM performance_schema.data_lock_waits w
JOIN information_schema.innodb_trx r ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID
JOIN information_schema.innodb_trx b ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID;
```

## Step 7: Check the Process List

For queries running right now:

```sql
SHOW FULL PROCESSLIST;
```

Kill a runaway query:

```sql
KILL QUERY 12345;
```

## Summary

Troubleshooting slow MySQL queries follows a clear path: enable the slow query log, identify the worst offenders with `mysqldumpslow`, analyze their execution plans with `EXPLAIN ANALYZE`, add missing indexes, and check for lock contention. Most slow query problems stem from missing or incorrect indexes and can be fixed without schema changes.
