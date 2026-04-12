# How to Identify Missing Indexes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Performance, Slow Query, Optimization

Description: Learn how to find missing MySQL indexes using the slow query log, performance_schema, EXPLAIN output, and sys schema to eliminate full table scans.

---

## Signals That an Index Is Missing

A missing index usually reveals itself through:
- Slow queries on large tables
- `Using filesort` or `Using temporary` in `EXPLAIN`
- `type: ALL` (full table scan) in `EXPLAIN`
- High `rows` estimates in `EXPLAIN`

## Finding Full Table Scans with EXPLAIN

Run `EXPLAIN` on your slow queries to look for missing indexes:

```sql
EXPLAIN SELECT id, total FROM orders WHERE customer_id = 42\G
```

```text
...
type: ALL
possible_keys: NULL
key: NULL
rows: 500000
Extra: Using where
...
```

`type: ALL` with `key: NULL` and no `possible_keys` means no index exists for the filter column.

## Enabling and Reading the Slow Query Log

```sql
-- Enable slow query log
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;          -- log queries > 1 second
SET GLOBAL log_queries_not_using_indexes = ON;
```

Check the slow query log file:

```bash
mysqldumpslow -s t /var/log/mysql/slow.log | head -20
```

Or use `pt-query-digest` for richer analysis:

```bash
pt-query-digest /var/log/mysql/slow.log --limit 20
```

## Using performance_schema to Find Full Scans

```sql
SELECT
    DIGEST_TEXT,
    COUNT_STAR,
    AVG_TIMER_WAIT / 1e12 AS avg_sec,
    SUM_ROWS_EXAMINED / COUNT_STAR AS avg_rows_examined
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME = 'your_database'
ORDER BY avg_rows_examined DESC
LIMIT 10;
```

High `avg_rows_examined` relative to the rows actually needed indicates the query is scanning far more rows than necessary - a likely missing index.

## Using sys Schema

```sql
-- Queries without index use
SELECT query, exec_count, total_latency, rows_examined_avg
FROM sys.statements_with_full_table_scans
WHERE db = 'your_database'
ORDER BY rows_examined_avg DESC
LIMIT 10;
```

## Adding the Missing Index

Once you identify the filtering column(s), add an index:

```sql
-- Single column missing index
ALTER TABLE orders ADD INDEX idx_customer_id (customer_id), ALGORITHM=INPLACE, LOCK=NONE;

-- Composite index if query filters on multiple columns
ALTER TABLE orders ADD INDEX idx_customer_status (customer_id, status), ALGORITHM=INPLACE, LOCK=NONE;
```

Rerun `EXPLAIN` to confirm the new index is used:

```sql
EXPLAIN SELECT id, total FROM orders WHERE customer_id = 42\G
-- Expect type: ref, key: idx_customer_id
```

## Checking for Queries That Could Benefit from Covering Indexes

```sql
-- If the query only needs customer_id and status, a covering index avoids the row lookup
ALTER TABLE orders ADD INDEX idx_customer_status_total (customer_id, status, total);

EXPLAIN SELECT total FROM orders WHERE customer_id = 42 AND status = 'pending'\G
-- Extra: Using index  (covered - no row lookup needed)
```

## Summary

Identify missing MySQL indexes by running `EXPLAIN` on slow queries and looking for `type: ALL` with `key: NULL`. Use the slow query log, `performance_schema.events_statements_summary_by_digest`, and `sys.statements_with_full_table_scans` to surface the most impactful candidates. Add composite indexes that match your query predicates and verify the improvement with `EXPLAIN`.
