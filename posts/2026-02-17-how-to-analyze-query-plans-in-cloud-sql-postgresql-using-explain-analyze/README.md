# How to Analyze Query Plans in Cloud SQL PostgreSQL Using EXPLAIN ANALYZE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, Query Optimization, EXPLAIN ANALYZE

Description: A practical guide to using EXPLAIN ANALYZE in Cloud SQL PostgreSQL to understand query execution plans, identify bottlenecks, and optimize slow queries.

---

When a query runs slow in Cloud SQL PostgreSQL, guessing at the cause is a waste of time. EXPLAIN ANALYZE gives you the actual execution plan - what the database did, how long each step took, and where it spent the most time. Once you can read these plans, you can make targeted optimizations instead of throwing indexes at everything and hoping for the best. Here is how to use EXPLAIN ANALYZE effectively.

## EXPLAIN vs EXPLAIN ANALYZE

There is an important distinction. EXPLAIN shows the planned execution without actually running the query. EXPLAIN ANALYZE actually runs the query and shows both the plan and the actual execution statistics.

```sql
-- EXPLAIN: shows the plan without executing (fast, safe)
EXPLAIN
SELECT * FROM orders WHERE customer_id = 12345;

-- EXPLAIN ANALYZE: executes the query and shows actual timing
-- WARNING: this actually runs the query, including any side effects
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 12345;
```

For SELECT queries, EXPLAIN ANALYZE is safe. For INSERT, UPDATE, or DELETE, wrap it in a transaction and roll back:

```sql
-- Safe way to EXPLAIN ANALYZE a write query
BEGIN;
EXPLAIN ANALYZE
DELETE FROM orders WHERE order_date < '2020-01-01';
ROLLBACK;
```

## Reading the Basic Output

Here is a simple example and what each part means:

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 42;
```

Output:

```
Index Scan using idx_orders_customer_id on orders  (cost=0.43..8.45 rows=5 width=128) (actual time=0.025..0.031 rows=3 loops=1)
  Index Cond: (customer_id = 42)
Planning Time: 0.152 ms
Execution Time: 0.062 ms
```

Breaking this down:

- **Index Scan**: The operation type - it used an index
- **cost=0.43..8.45**: Estimated startup cost and total cost (in abstract units)
- **rows=5**: Estimated number of rows
- **width=128**: Estimated average row width in bytes
- **actual time=0.025..0.031**: Real time in milliseconds (startup..total)
- **rows=3**: Actual number of rows returned
- **loops=1**: Number of times this step was executed
- **Planning Time**: Time spent planning the query
- **Execution Time**: Total execution time

## Verbose and Formatted Output

For more detail, use additional EXPLAIN options:

```sql
-- VERBOSE adds output column lists and schema-qualified table names
EXPLAIN (ANALYZE, VERBOSE, BUFFERS, FORMAT TEXT)
SELECT o.order_id, o.total, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date > '2025-01-01'
ORDER BY o.total DESC
LIMIT 10;
```

The BUFFERS option is particularly valuable - it shows how many disk blocks were read:

```
Limit  (cost=1234.56..1234.58 rows=10 width=64) (actual time=15.234..15.240 rows=10 loops=1)
  Buffers: shared hit=423 read=156
  ->  Sort  (cost=1234.56..1267.89 rows=13320 width=64) (actual time=15.232..15.235 rows=10 loops=1)
        Sort Key: o.total DESC
        Sort Method: top-N heapsort  Memory: 26kB
        Buffers: shared hit=423 read=156
```

- **shared hit=423**: 423 blocks were found in the buffer cache (fast)
- **read=156**: 156 blocks were read from disk (slow)

A high read-to-hit ratio suggests your shared_buffers might be too small or the data is not cached.

## Common Plan Node Types

Understanding what each node does:

### Sequential Scan

```
Seq Scan on orders  (cost=0.00..25432.00 rows=1000000 width=128)
  Filter: (order_date > '2025-01-01')
  Rows Removed by Filter: 750000
```

Sequential scan reads the entire table row by row. This is fine for small tables or when you need most of the rows. It is a problem when you need a small number of rows from a large table - that usually means a missing index.

### Index Scan

```
Index Scan using idx_orders_date on orders  (cost=0.43..856.43 rows=250000 width=128)
  Index Cond: (order_date > '2025-01-01')
```

The database uses the index to find matching rows, then fetches the full rows from the table. Efficient for queries that return a small percentage of the table.

### Index Only Scan

```
Index Only Scan using idx_orders_date_total on orders  (cost=0.43..432.10 rows=250000 width=16)
  Index Cond: (order_date > '2025-01-01')
  Heap Fetches: 0
```

Even better than Index Scan - the index contains all the columns needed, so the table does not need to be accessed at all. Heap Fetches: 0 means the index provided everything.

### Nested Loop Join

```
Nested Loop  (cost=0.43..234.56 rows=10 width=128)
  ->  Seq Scan on small_table  (cost=0.00..12.00 rows=10 width=64)
  ->  Index Scan using idx_big_table_id on big_table  (cost=0.43..22.25 rows=1 width=64)
```

For each row in the outer table, it looks up matching rows in the inner table. Efficient when one side is small and the inner side has an index.

### Hash Join

```
Hash Join  (cost=123.00..4567.89 rows=50000 width=128)
  Hash Cond: (o.customer_id = c.customer_id)
  ->  Seq Scan on orders o  (cost=0.00..3456.00 rows=100000 width=64)
  ->  Hash  (cost=100.00..100.00 rows=5000 width=64)
        ->  Seq Scan on customers c  (cost=0.00..100.00 rows=5000 width=64)
```

Builds a hash table from one input and probes it with the other. Good for large joins where both sides are large.

## Identifying Performance Problems

### Problem: Sequential Scan on Large Table

```sql
-- Slow: full table scan on a million-row table
EXPLAIN ANALYZE
SELECT * FROM events WHERE user_id = 'abc123';
```

```
Seq Scan on events  (cost=0.00..45000.00 rows=50 width=256) (actual time=234.567..890.123 rows=42 loops=1)
  Filter: (user_id = 'abc123')
  Rows Removed by Filter: 999958
```

Fix: create an index on user_id:

```sql
-- Add an index for the frequently filtered column
CREATE INDEX idx_events_user_id ON events(user_id);
```

### Problem: Sort Spilling to Disk

```
Sort  (cost=56789.00..57012.00 rows=500000 width=128) (actual time=3456.789..4567.890 rows=500000 loops=1)
  Sort Key: order_date DESC
  Sort Method: external merge  Disk: 62MB
```

"external merge Disk: 62MB" means the sort could not fit in memory and used temp files. Fix: increase work_mem for this query:

```sql
-- Increase work_mem for this session to avoid disk sorts
SET work_mem = '128MB';
EXPLAIN ANALYZE
SELECT * FROM orders ORDER BY order_date DESC;
RESET work_mem;
```

### Problem: Estimate vs Actual Row Mismatch

```
Index Scan on products  (cost=0.43..8.45 rows=1 width=128) (actual time=0.025..45.678 rows=50000 loops=1)
```

The planner estimated 1 row but got 50,000. This huge mismatch means the planner chose a poor strategy. Fix: update statistics:

```sql
-- Update table statistics so the planner has accurate information
ANALYZE products;
```

## Practical Workflow for Query Optimization

Here is how I approach a slow query:

1. Run EXPLAIN (ANALYZE, BUFFERS) to get the full picture
2. Look at actual time - find the node that takes the longest
3. Check for sequential scans on large tables - add indexes if needed
4. Look for disk sorts - increase work_mem or add an index that provides ordering
5. Check row estimates vs actuals - run ANALYZE if they are way off
6. Look at buffer stats - high read counts mean cold cache or insufficient shared_buffers

```sql
-- Full diagnostic query
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS, TIMING)
SELECT
  c.name,
  COUNT(o.order_id) AS order_count,
  SUM(o.total) AS total_spent
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_date >= '2025-01-01'
GROUP BY c.name
ORDER BY total_spent DESC
LIMIT 20;
```

## Using pg_stat_statements for Broader Analysis

While EXPLAIN ANALYZE looks at one query, pg_stat_statements shows statistics for all queries:

```sql
-- Find the slowest queries by total time
SELECT
  query,
  calls,
  total_exec_time / 1000 AS total_time_seconds,
  mean_exec_time AS avg_ms,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

This helps you prioritize which queries to optimize first. A query that runs 10,000 times per hour with an average of 50ms might be more impactful to optimize than one that runs once with 5 seconds.

EXPLAIN ANALYZE is the single most valuable tool for PostgreSQL performance work. It replaces guessing with evidence. Learn to read the plans, and you will spend less time on performance issues and make better optimization decisions.
