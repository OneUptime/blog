# How to Analyze Query Performance with EXPLAIN ANALYZE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, EXPLAIN ANALYZE, Query Performance, Optimization, Database, SQL

Description: A comprehensive guide to analyzing PostgreSQL query performance using EXPLAIN ANALYZE, covering query plan interpretation, identifying bottlenecks, and optimization strategies.

---

Understanding query execution plans is essential for PostgreSQL performance optimization. EXPLAIN ANALYZE provides detailed insights into how PostgreSQL executes your queries, helping you identify and fix performance bottlenecks. This guide covers everything you need to master query analysis.

## Prerequisites

- PostgreSQL database access
- Basic understanding of SQL
- Sample data to analyze

## EXPLAIN Basics

### Simple EXPLAIN

```sql
-- Shows estimated execution plan
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
```

Output:

```
                        QUERY PLAN
----------------------------------------------------------
 Seq Scan on users  (cost=0.00..25.00 rows=1 width=100)
   Filter: (email = 'user@example.com'::text)
```

### EXPLAIN ANALYZE

```sql
-- Actually executes query and shows real timing
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';
```

Output:

```
                                             QUERY PLAN
----------------------------------------------------------------------------------------------------
 Seq Scan on users  (cost=0.00..25.00 rows=1 width=100) (actual time=0.015..0.234 rows=1 loops=1)
   Filter: (email = 'user@example.com'::text)
   Rows Removed by Filter: 999
 Planning Time: 0.085 ms
 Execution Time: 0.267 ms
```

## EXPLAIN Options

### All Available Options

```sql
EXPLAIN (
  ANALYZE,       -- Execute and show actual times
  BUFFERS,       -- Show buffer usage
  COSTS,         -- Show estimated costs (default on)
  FORMAT JSON,   -- Output format: TEXT, XML, JSON, YAML
  SETTINGS,      -- Show modified settings
  TIMING,        -- Show actual timing (default with ANALYZE)
  VERBOSE,       -- Show additional info
  WAL            -- Show WAL usage (PostgreSQL 13+)
)
SELECT * FROM users WHERE id = 1;
```

### Recommended Analysis Command

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders
WHERE customer_id = 12345
  AND created_at > '2026-01-01';
```

## Understanding Query Plans

### Reading Cost Estimates

```
Seq Scan on users  (cost=0.00..25.00 rows=1000 width=100)
                         |      |     |         |
                    startup  total  estimated  row width
                     cost    cost    rows      (bytes)
```

- **Startup cost**: Cost before first row is returned
- **Total cost**: Cost to return all rows
- **Rows**: Estimated row count
- **Width**: Estimated average row size in bytes

### Reading Actual Times

```
Seq Scan on users  (actual time=0.015..0.234 rows=1 loops=1)
                              |       |      |       |
                         time to   time to  actual  iterations
                         first row all rows  rows
```

### Buffer Statistics

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM large_table WHERE id < 1000;
```

Output:

```
Seq Scan on large_table (actual time=0.012..45.678 rows=999 loops=1)
  Filter: (id < 1000)
  Rows Removed by Filter: 999001
  Buffers: shared hit=5432 read=1234
```

- **shared hit**: Pages found in cache
- **shared read**: Pages read from disk
- **shared dirtied**: Pages modified
- **shared written**: Pages written to disk

## Common Scan Types

### Sequential Scan

```sql
-- Full table scan - reads every row
EXPLAIN ANALYZE
SELECT * FROM users WHERE status = 'active';
```

```
Seq Scan on users  (cost=0.00..1935.00 rows=50000 width=100)
  Filter: (status = 'active'::text)
```

When used:
- Small tables
- Large portion of rows returned
- No suitable index

### Index Scan

```sql
-- Uses index, fetches rows from table
EXPLAIN ANALYZE
SELECT * FROM users WHERE id = 12345;
```

```
Index Scan using users_pkey on users (cost=0.42..8.44 rows=1 width=100)
  Index Cond: (id = 12345)
```

When used:
- Small number of rows
- Index exists on filter column

### Index Only Scan

```sql
-- Uses index without table access (covering index)
EXPLAIN ANALYZE
SELECT id, email FROM users WHERE id = 12345;
```

```
Index Only Scan using users_id_email_idx on users (cost=0.42..4.44 rows=1 width=50)
  Index Cond: (id = 12345)
  Heap Fetches: 0
```

When used:
- All needed columns in index
- Index is up to date (low heap fetches)

### Bitmap Index Scan

```sql
-- Combines multiple indexes
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE customer_id = 123 OR status = 'pending';
```

```
Bitmap Heap Scan on orders (cost=10.00..100.00 rows=500 width=100)
  Recheck Cond: ((customer_id = 123) OR (status = 'pending'::text))
  ->  BitmapOr (cost=10.00..10.00 rows=500 width=0)
        ->  Bitmap Index Scan on orders_customer_id_idx
              Index Cond: (customer_id = 123)
        ->  Bitmap Index Scan on orders_status_idx
              Index Cond: (status = 'pending'::text)
```

When used:
- Multiple conditions with OR
- Moderate selectivity

## Join Operations

### Nested Loop

```sql
EXPLAIN ANALYZE
SELECT u.*, o.*
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.id = 123;
```

```
Nested Loop (cost=0.85..16.90 rows=5 width=200)
  ->  Index Scan using users_pkey on users u (cost=0.42..8.44 rows=1 width=100)
        Index Cond: (id = 123)
  ->  Index Scan using orders_user_id_idx on orders o (cost=0.43..8.41 rows=5 width=100)
        Index Cond: (user_id = 123)
```

Best for: Small outer table, indexed inner table

### Hash Join

```sql
EXPLAIN ANALYZE
SELECT u.*, o.*
FROM users u
JOIN orders o ON o.user_id = u.id;
```

```
Hash Join (cost=2500.00..15000.00 rows=100000 width=200)
  Hash Cond: (o.user_id = u.id)
  ->  Seq Scan on orders o (cost=0.00..5000.00 rows=100000 width=100)
  ->  Hash (cost=1500.00..1500.00 rows=50000 width=100)
        ->  Seq Scan on users u (cost=0.00..1500.00 rows=50000 width=100)
```

Best for: Large tables, equality joins

### Merge Join

```sql
EXPLAIN ANALYZE
SELECT u.*, o.*
FROM users u
JOIN orders o ON o.user_id = u.id
ORDER BY u.id;
```

```
Merge Join (cost=5000.00..10000.00 rows=100000 width=200)
  Merge Cond: (u.id = o.user_id)
  ->  Index Scan using users_pkey on users u
  ->  Sort (cost=3000.00..3500.00 rows=100000 width=100)
        Sort Key: o.user_id
        ->  Seq Scan on orders o
```

Best for: Pre-sorted data, large datasets

## Aggregation Operations

### HashAggregate

```sql
EXPLAIN ANALYZE
SELECT status, COUNT(*) FROM orders GROUP BY status;
```

```
HashAggregate (cost=5500.00..5500.05 rows=5 width=16)
  Group Key: status
  ->  Seq Scan on orders (cost=0.00..5000.00 rows=100000 width=8)
```

### GroupAggregate

```sql
EXPLAIN ANALYZE
SELECT customer_id, SUM(amount)
FROM orders
GROUP BY customer_id
ORDER BY customer_id;
```

```
GroupAggregate (cost=10000.00..12500.00 rows=10000 width=40)
  Group Key: customer_id
  ->  Sort (cost=10000.00..10250.00 rows=100000 width=16)
        Sort Key: customer_id
        ->  Seq Scan on orders
```

## Identifying Problems

### Signs of Poor Performance

1. **Sequential scans on large tables**
```
Seq Scan on orders  (actual time=0.012..1234.567 rows=1 loops=1)
  Filter: (id = 12345)
  Rows Removed by Filter: 9999999
```

2. **High rows removed by filter**
```
Rows Removed by Filter: 9999999  -- Most rows discarded
```

3. **Inaccurate row estimates**
```
(rows=100)       -- Estimated
(actual rows=100000)  -- Actual - 1000x difference!
```

4. **Sorts spilling to disk**
```
Sort Method: external merge  Disk: 102400kB
```

5. **Nested loops with large outer tables**
```
Nested Loop (actual time=0.015..12345.678 rows=1000000 loops=1)
```

### Analyze Statistics

```sql
-- Update statistics for better estimates
ANALYZE users;

-- Check statistics
SELECT attname, n_distinct, most_common_vals
FROM pg_stats
WHERE tablename = 'users';
```

## Optimization Examples

### Example 1: Missing Index

Before:

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 12345;
```

```
Seq Scan on orders (actual time=0.012..456.789 rows=10 loops=1)
  Filter: (customer_id = 12345)
  Rows Removed by Filter: 999990
```

Fix:

```sql
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```

After:

```
Index Scan using idx_orders_customer_id on orders (actual time=0.015..0.123 rows=10 loops=1)
  Index Cond: (customer_id = 12345)
```

### Example 2: Wrong Index Used

```sql
EXPLAIN ANALYZE
SELECT * FROM products
WHERE category_id = 5
  AND price > 100
ORDER BY created_at DESC
LIMIT 10;
```

```
Limit (actual time=234.567..234.678 rows=10 loops=1)
  ->  Sort (actual time=234.567..234.567 rows=10 loops=1)
        Sort Key: created_at DESC
        ->  Bitmap Heap Scan on products (actual time=123.456..234.456 rows=5000 loops=1)
              ->  Bitmap Index Scan on products_category_idx
```

Fix - create composite index:

```sql
CREATE INDEX idx_products_category_created
ON products(category_id, created_at DESC)
WHERE price > 100;
```

### Example 3: Join Order

```sql
EXPLAIN ANALYZE
SELECT o.*, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending';
```

If PostgreSQL chooses wrong join order, use CTE to force order:

```sql
EXPLAIN ANALYZE
WITH pending_orders AS MATERIALIZED (
  SELECT * FROM orders WHERE status = 'pending'
)
SELECT po.*, c.name
FROM pending_orders po
JOIN customers c ON c.id = po.customer_id;
```

## JSON Format for Tooling

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM users WHERE id = 1;
```

Output (partial):

```json
[
  {
    "Plan": {
      "Node Type": "Index Scan",
      "Relation Name": "users",
      "Index Name": "users_pkey",
      "Actual Startup Time": 0.015,
      "Actual Total Time": 0.018,
      "Actual Rows": 1,
      "Actual Loops": 1,
      "Shared Hit Blocks": 3,
      "Shared Read Blocks": 0
    },
    "Planning Time": 0.085,
    "Execution Time": 0.045
  }
]
```

## Visualization Tools

### pgAdmin

Built-in graphical explain viewer.

### explain.depesz.com

Online tool for analyzing EXPLAIN output:

```sql
-- Copy output to explain.depesz.com
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ...;
```

### pg_stat_statements

Track query performance over time:

```sql
CREATE EXTENSION pg_stat_statements;

SELECT query, calls, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Best Practices

### Query Analysis Workflow

1. **Run EXPLAIN ANALYZE** with actual query
2. **Check row estimates** vs actual
3. **Look for seq scans** on large tables
4. **Check buffer hits** vs reads
5. **Identify costly operations**
6. **Test with indexes** or query changes
7. **Verify improvement**

### Common Fixes

| Problem | Solution |
|---------|----------|
| Seq scan on large table | Add appropriate index |
| Wrong row estimates | Run ANALYZE |
| Sort spilling to disk | Increase work_mem |
| Hash join too slow | Increase work_mem or add index |
| Nested loop slow | Consider hash/merge join |

## Conclusion

EXPLAIN ANALYZE is your primary tool for query optimization:

1. **Use BUFFERS** to understand I/O
2. **Compare estimates** with actual rows
3. **Look for warning signs** - seq scans, high filter rates
4. **Test changes** with EXPLAIN before applying
5. **Monitor with pg_stat_statements** for patterns

Master EXPLAIN ANALYZE and you'll be able to diagnose and fix most PostgreSQL performance issues.
