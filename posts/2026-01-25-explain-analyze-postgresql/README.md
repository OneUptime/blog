# How to Read and Optimize Slow Queries with EXPLAIN ANALYZE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Query Optimization, EXPLAIN ANALYZE, Performance, Database, SQL

Description: Learn how to use EXPLAIN ANALYZE in PostgreSQL to identify slow queries, understand execution plans, and apply targeted optimizations. This guide covers reading query plans, spotting common bottlenecks, and fixing them with practical examples.

---

> Slow queries are the silent killers of application performance. A single poorly optimized query can bring your entire system to its knees during peak traffic. PostgreSQL provides EXPLAIN ANALYZE as your primary diagnostic tool for understanding exactly what happens when a query runs and why it takes so long.

This guide walks you through reading execution plans, identifying bottlenecks, and applying fixes that actually work.

---

## Understanding EXPLAIN vs EXPLAIN ANALYZE

Before diving in, understand the difference between these two commands:

```sql
-- EXPLAIN: Shows the planned execution without running the query
EXPLAIN SELECT * FROM orders WHERE customer_id = 12345;

-- EXPLAIN ANALYZE: Actually runs the query and shows real timing
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 12345;
```

EXPLAIN gives you estimates. EXPLAIN ANALYZE gives you reality. Always use EXPLAIN ANALYZE when diagnosing slow queries, but be careful with UPDATE or DELETE statements since they will actually modify data.

For destructive queries, wrap them in a transaction:

```sql
-- Safe way to analyze UPDATE/DELETE queries
BEGIN;
EXPLAIN ANALYZE DELETE FROM sessions WHERE expires_at < NOW();
ROLLBACK;  -- Undo the actual deletion
```

---

## Reading an Execution Plan

Here is a sample query and its execution plan:

```sql
-- The query
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at > '2024-01-01'
  AND o.status = 'completed';

-- The execution plan
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.id, o.total, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at > '2024-01-01'
  AND o.status = 'completed';
```

Sample output:

```
Hash Join  (cost=125.50..2890.75 rows=1523 width=48)
           (actual time=2.451..45.832 rows=1489 loops=1)
  Hash Cond: (o.customer_id = c.id)
  Buffers: shared hit=892 read=234
  ->  Seq Scan on orders o  (cost=0.00..2680.00 rows=1523 width=24)
                            (actual time=0.025..42.156 rows=1489 loops=1)
        Filter: ((created_at > '2024-01-01') AND (status = 'completed'))
        Rows Removed by Filter: 98511
        Buffers: shared hit=780 read=234
  ->  Hash  (cost=85.50..85.50 rows=3200 width=28)
            (actual time=2.389..2.390 rows=3200 loops=1)
        Buckets: 4096  Batches: 1  Memory Usage: 189kB
        Buffers: shared hit=112
        ->  Seq Scan on customers c  (cost=0.00..85.50 rows=3200 width=28)
                                     (actual time=0.008..1.234 rows=3200 loops=1)
              Buffers: shared hit=112
Planning Time: 0.245 ms
Execution Time: 46.012 ms
```

### Key Metrics to Watch

1. **cost=start..total**: Estimated startup and total cost (relative units)
2. **actual time=start..total**: Real milliseconds spent
3. **rows**: Estimated vs actual row count
4. **Buffers: shared hit/read**: Pages found in cache vs read from disk
5. **Rows Removed by Filter**: Rows scanned but not returned

---

## Spotting Common Problems

### Problem 1: Sequential Scans on Large Tables

When you see `Seq Scan` on a large table with a filter, you have a missing index:

```sql
-- Bad: Full table scan
Seq Scan on orders  (cost=0.00..2680.00 rows=1523 width=24)
  Filter: ((created_at > '2024-01-01') AND (status = 'completed'))
  Rows Removed by Filter: 98511

-- Solution: Create a composite index
CREATE INDEX idx_orders_status_created
ON orders (status, created_at);

-- After indexing
Index Scan using idx_orders_status_created on orders
  (cost=0.43..125.67 rows=1523 width=24)
  Index Cond: ((status = 'completed') AND (created_at > '2024-01-01'))
```

### Problem 2: Poor Row Estimates

When estimated rows differ wildly from actual rows, PostgreSQL makes bad decisions:

```sql
-- Bad: Planner expected 10 rows, got 50000
Index Scan (cost=0.43..35.50 rows=10 width=24)
           (actual time=0.025..892.156 rows=50000 loops=1)

-- Solution: Update statistics
ANALYZE orders;

-- For specific columns with unusual distributions
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;
ANALYZE orders;
```

### Problem 3: Nested Loop with Large Inner Table

Nested loops work great for small datasets but become expensive with large ones:

```sql
-- Bad: Nested loop scanning 10000 times
Nested Loop  (cost=0.43..125000.00 rows=10000 width=48)
  ->  Seq Scan on orders  (actual rows=10000 loops=1)
  ->  Index Scan on order_items  (actual rows=5 loops=10000)
      -- 10000 * 5 = 50000 index lookups

-- Solution: Force a hash join or add appropriate indexes
SET enable_nestloop = off;  -- Temporarily disable to test
EXPLAIN ANALYZE SELECT ...;
SET enable_nestloop = on;   -- Re-enable
```

---

## Practical Optimization Examples

### Example 1: Optimizing a Report Query

Original slow query taking 12 seconds:

```sql
-- Slow: 12 seconds
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    DATE_TRUNC('day', created_at) as day,
    COUNT(*) as order_count,
    SUM(total) as revenue
FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day;
```

Execution plan shows:

```
Sort  (cost=45000.00..45000.50 rows=365 width=48)
      (actual time=12456.234..12456.890 rows=365 loops=1)
  ->  HashAggregate  (cost=44900.00..44950.00 rows=365 width=48)
        ->  Seq Scan on orders  (cost=0.00..35000.00 rows=500000 width=16)
              Filter: (created_at >= '2024-01-01' AND created_at <= '2024-12-31')
              Buffers: shared read=25000  -- All from disk!
```

The problems: sequential scan, no index, reading from disk.

```sql
-- Fix 1: Create an index on the date range
CREATE INDEX idx_orders_created_at ON orders (created_at);

-- Fix 2: Use a covering index to avoid table lookups
CREATE INDEX idx_orders_created_covering
ON orders (created_at) INCLUDE (total);

-- Fix 3: Pre-warm the data into cache for repeated reports
SELECT pg_prewarm('orders');
```

After optimization (0.3 seconds):

```
Sort  (cost=1500.00..1500.50 rows=365 width=48)
      (actual time=298.234..298.456 rows=365 loops=1)
  ->  HashAggregate  (cost=1400.00..1450.00 rows=365 width=48)
        ->  Index Only Scan using idx_orders_created_covering on orders
              Index Cond: (created_at >= '2024-01-01' AND created_at <= '2024-12-31')
              Buffers: shared hit=1250  -- All from cache!
```

### Example 2: Optimizing a Join Query

```sql
-- Slow join: 8 seconds
EXPLAIN (ANALYZE, BUFFERS)
SELECT p.name, SUM(oi.quantity) as total_sold
FROM products p
JOIN order_items oi ON oi.product_id = p.id
JOIN orders o ON o.id = oi.order_id
WHERE o.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT 10;
```

The plan shows nested loops scanning millions of rows. Let us fix it:

```sql
-- Create indexes for the join conditions
CREATE INDEX idx_order_items_product ON order_items (product_id);
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_orders_created ON orders (created_at);

-- Rewrite with CTE for better plan control
WITH recent_orders AS (
    -- PostgreSQL can optimize this subquery independently
    SELECT id FROM orders
    WHERE created_at > NOW() - INTERVAL '30 days'
)
SELECT p.name, SUM(oi.quantity) as total_sold
FROM products p
JOIN order_items oi ON oi.product_id = p.id
JOIN recent_orders ro ON ro.id = oi.order_id
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT 10;
```

---

## Advanced EXPLAIN Options

### Getting More Detail

```sql
-- Full diagnostic output
EXPLAIN (
    ANALYZE,      -- Actually run the query
    BUFFERS,      -- Show buffer usage
    TIMING,       -- Show timing per node
    VERBOSE,      -- Show output columns
    SETTINGS,     -- Show non-default settings
    WAL,          -- Show WAL usage (for writes)
    FORMAT JSON   -- Machine-readable output
)
SELECT * FROM orders WHERE id = 12345;
```

### Visualizing Complex Plans

For complex queries, JSON format works better with visualization tools:

```sql
-- Output as JSON for tools like explain.depesz.com
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT ...;
```

You can paste the JSON output into online tools for interactive exploration.

---

## Creating a Query Analysis Workflow

Here is a systematic approach to query optimization:

```sql
-- Step 1: Get the baseline
\timing on
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;

-- Step 2: Check for missing indexes on filtered columns
SELECT
    schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'orders' AND attname IN ('status', 'created_at');

-- Step 3: Check index usage
SELECT
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE relname = 'orders';

-- Step 4: Identify unused indexes (candidates for removal)
SELECT
    indexrelname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%pkey%';
```

---

## Common Fixes Summary

| Problem | Symptom | Fix |
|---------|---------|-----|
| Sequential scan | `Seq Scan` on filtered column | Add index |
| Bad estimates | rows estimate far from actual | Run ANALYZE |
| Disk reads | `Buffers: shared read` high | Increase shared_buffers or add covering index |
| Nested loop | High loop count | Add index or increase work_mem |
| Sort spill | `Sort Method: external merge` | Increase work_mem |

---

## Conclusion

EXPLAIN ANALYZE is your window into PostgreSQL query execution. The key skills are:

1. Always use EXPLAIN ANALYZE with BUFFERS for real diagnostics
2. Compare estimated vs actual rows to catch statistics problems
3. Watch for sequential scans on large tables
4. Check buffer hits vs reads to understand caching
5. Create targeted indexes based on actual query patterns

Start with your slowest queries and work through them systematically. Even a 10x improvement on your top 5 slowest queries can transform your application performance.

---

*Need to track slow queries in production? [OneUptime](https://oneuptime.com) provides database monitoring with automatic slow query detection, execution plan analysis, and performance alerting.*

**Related Reading:**
- [How to Choose Between B-Tree, GIN, and BRIN Indexes in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-btree-gin-brin-indexes-postgresql/view)
- [How to Tune PostgreSQL for High Write Throughput](https://oneuptime.com/blog/post/2026-01-27-high-write-throughput-postgresql/view)
