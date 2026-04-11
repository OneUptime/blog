# How to Scale MySQL with Query Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Optimization, Index, Performance, EXPLAIN

Description: Learn how query optimization scales MySQL by reducing CPU, I/O, and memory usage per query, allowing the same hardware to handle far more requests.

---

## Query Optimization as a Scaling Strategy

Before adding read replicas or upgrading hardware, optimizing slow queries is the highest-leverage scaling action. A query that performs a full table scan on a 100 million row table consumes 1000x more resources than one that uses an index. Fixing it multiplies effective MySQL capacity without any infrastructure changes.

## Finding Slow Queries

Enable the slow query log to capture problematic queries:

```ini
[mysqld]
slow_query_log = ON
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
log_queries_not_using_indexes = ON
```

Analyze the slow query log with `pt-query-digest`:

```bash
pt-query-digest /var/log/mysql/slow.log | head -100
```

This ranks queries by total execution time, showing which queries are most worth optimizing.

## Using EXPLAIN to Diagnose Queries

EXPLAIN reveals the execution plan for a query:

```sql
EXPLAIN SELECT o.id, u.name, o.amount
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.created_at >= '2025-01-01'
ORDER BY o.created_at DESC
LIMIT 100\G
```

Look for:
- `type: ALL` - full table scan (bad)
- `type: index` - full index scan (still potentially slow)
- `type: ref` - index lookup by value (good)
- `type: range` - index range scan (good)
- `rows` - estimated rows examined (lower is better)
- `Extra: Using filesort` - sort cannot use an index (often bad for large datasets)

## Adding the Right Indexes

If EXPLAIN shows a full table scan on `orders.created_at`, add a covering index:

```sql
ALTER TABLE orders ADD INDEX idx_created_user (created_at, user_id, id, amount);
```

A covering index includes all columns needed by the query, so MySQL can serve the result from the index alone without accessing the row data.

Verify the index is used:

```sql
EXPLAIN SELECT id, user_id, amount FROM orders
WHERE created_at >= '2025-01-01'
ORDER BY created_at DESC
LIMIT 100;
```

The `Extra` column should now show `Using index` rather than `Using filesort`.

## Rewriting Inefficient Queries

### Replace correlated subqueries with JOINs

Before (runs subquery once per row):

```sql
SELECT id, (SELECT name FROM users WHERE id = orders.user_id) AS user_name
FROM orders
WHERE amount > 100;
```

After (single JOIN):

```sql
SELECT o.id, u.name AS user_name
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.amount > 100;
```

### Use LIMIT to avoid returning unnecessary rows

```sql
-- Instead of fetching all rows and filtering in application code
SELECT * FROM events WHERE type = 'login' LIMIT 1000;
```

## Analyzing Query Statistics in Performance Schema

Track queries consuming the most time:

```sql
SELECT DIGEST_TEXT, COUNT_STAR, AVG_TIMER_WAIT / 1e9 AS avg_ms,
       SUM_ROWS_EXAMINED / COUNT_STAR AS avg_rows_examined
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

High `avg_rows_examined` relative to returned rows indicates a missing or ineffective index.

## Summary

Query optimization scales MySQL by reducing resource consumption per query. Enable the slow query log, analyze with EXPLAIN, add covering indexes for hot queries, and rewrite correlated subqueries as JOINs. Performance Schema `events_statements_summary_by_digest` provides ongoing visibility into which queries dominate server time, enabling continuous optimization as workloads evolve.
