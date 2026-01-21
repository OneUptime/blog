# How to Use PostgreSQL Query Hints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Query Hints, pg_hint_plan, Query Optimization, Performance Tuning

Description: A comprehensive guide to using query hints in PostgreSQL with pg_hint_plan extension, covering hint syntax, use cases, and best practices for controlling query execution plans.

---

PostgreSQL's query planner usually makes good decisions, but sometimes you need to override its choices. The pg_hint_plan extension allows you to control query execution plans using hints. This guide covers installation, hint syntax, and practical use cases.

## Prerequisites

- PostgreSQL 10+
- Superuser access for extension installation
- Understanding of EXPLAIN ANALYZE output
- Knowledge of join types and index usage

## Why Query Hints?

Use hints when:

- Planner chooses suboptimal plans due to statistics inaccuracy
- Testing alternative execution strategies
- Forcing specific behavior for known query patterns
- Working around planner limitations
- Temporary fixes while investigating root causes

## Install pg_hint_plan

### From Package Manager

```bash
# Ubuntu/Debian
sudo apt install postgresql-16-pg-hint-plan

# RHEL/CentOS
sudo dnf install pg_hint_plan_16

# macOS with Homebrew
brew install pg_hint_plan
```

### From Source

```bash
git clone https://github.com/ossc-db/pg_hint_plan.git
cd pg_hint_plan
git checkout REL16_1_6_0  # Match your PostgreSQL version

make
sudo make install
```

### Enable Extension

```sql
-- Create extension in your database
CREATE EXTENSION pg_hint_plan;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'pg_hint_plan';
```

### Configuration

```conf
# postgresql.conf
shared_preload_libraries = 'pg_hint_plan'

# Optional settings
pg_hint_plan.enable_hint = on
pg_hint_plan.enable_hint_table = on
pg_hint_plan.debug_print = off
pg_hint_plan.message_level = info
```

## Basic Hint Syntax

Hints are specified as special comments:

```sql
/*+ HintName(arguments) */
SELECT ...
```

### Hint Structure

```sql
/*+
    Hint1(arg1 arg2)
    Hint2(arg1)
    Hint3(arg1 arg2 arg3)
*/
SELECT columns
FROM table1
JOIN table2 ON ...
WHERE ...;
```

## Scan Method Hints

Control how tables are scanned:

### SeqScan - Force Sequential Scan

```sql
/*+ SeqScan(orders) */
SELECT * FROM orders WHERE status = 'pending';

-- Useful when:
-- - Selecting large portion of table
-- - Index scan would be slower
```

### IndexScan - Force Index Scan

```sql
/*+ IndexScan(orders idx_orders_status) */
SELECT * FROM orders WHERE status = 'pending';

-- Force specific index
/*+ IndexScan(orders idx_orders_customer_id) */
SELECT * FROM orders WHERE customer_id = 123;
```

### IndexOnlyScan - Force Index-Only Scan

```sql
/*+ IndexOnlyScan(orders idx_orders_covering) */
SELECT customer_id, status FROM orders WHERE customer_id = 123;
```

### BitmapScan - Force Bitmap Scan

```sql
/*+ BitmapScan(orders) */
SELECT * FROM orders
WHERE status IN ('pending', 'processing', 'shipped');
```

### NoSeqScan, NoIndexScan - Disable Scan Methods

```sql
-- Disable sequential scan
/*+ NoSeqScan(orders) */
SELECT * FROM orders WHERE status = 'pending';

-- Disable index scan
/*+ NoIndexScan(orders) */
SELECT * FROM orders WHERE id = 123;

-- Disable bitmap scan
/*+ NoBitmapScan(orders) */
SELECT * FROM orders WHERE status IN ('a', 'b', 'c');
```

## Join Method Hints

Control how tables are joined:

### NestLoop - Nested Loop Join

```sql
/*+ NestLoop(orders customers) */
SELECT o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.id = 123;

-- Best for: Small result sets, indexed lookups
```

### HashJoin - Hash Join

```sql
/*+ HashJoin(orders customers) */
SELECT o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;

-- Best for: Large tables, no useful indexes
```

### MergeJoin - Merge Join

```sql
/*+ MergeJoin(orders customers) */
SELECT o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
ORDER BY c.id;

-- Best for: Pre-sorted data, range joins
```

### Disable Join Methods

```sql
-- Force hash join by disabling others
/*+ NoNestLoop(orders customers) NoMergeJoin(orders customers) */
SELECT o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

## Join Order Hints

### Leading - Specify Join Order

```sql
-- Join customers first, then orders, then items
/*+ Leading(customers orders items) */
SELECT c.name, o.id, i.product_name
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id
WHERE c.region = 'US';

-- Nested leading for complex joins
/*+ Leading((customers (orders items))) */
SELECT ...
```

### Leading with Direction

```sql
-- (outer inner) syntax
/*+ Leading((customers orders)) */
-- customers is outer, orders is inner

/*+ Leading(((customers orders) items)) */
-- (customers JOIN orders) is outer, items is inner
```

## Row Count Hints

Override row estimates:

```sql
-- Tell planner to expect 1000 rows from orders
/*+ Rows(orders #1000) */
SELECT * FROM orders WHERE complex_condition;

-- Multiply estimate by 10
/*+ Rows(orders *10) */
SELECT * FROM orders WHERE status = 'rare_status';

-- Add to estimate
/*+ Rows(orders +1000) */
SELECT * FROM orders;

-- Set estimate for join
/*+ Rows(orders customers #100) */
SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id;
```

## Parallel Query Hints

Control parallel execution:

```sql
-- Force parallel scan with specific workers
/*+ Parallel(orders 4 hard) */
SELECT * FROM orders WHERE created_at > '2025-01-01';

-- Disable parallel scan
/*+ Parallel(orders 0) */
SELECT COUNT(*) FROM orders;

-- Soft hint (planner may override)
/*+ Parallel(orders 4 soft) */
SELECT * FROM orders;
```

## Combining Multiple Hints

```sql
/*+
    Leading(customers orders items)
    NestLoop(customers orders)
    HashJoin(orders items)
    IndexScan(customers idx_customers_region)
    SeqScan(orders)
    Rows(orders #10000)
*/
SELECT
    c.name,
    COUNT(i.id) AS item_count,
    SUM(i.price) AS total
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items i ON i.order_id = o.id
WHERE c.region = 'US'
GROUP BY c.name;
```

## Using Hint Tables

Store hints for queries without modifying application code:

### Enable Hint Table

```sql
-- Enable hint table feature
SET pg_hint_plan.enable_hint_table = on;
```

### Create and Populate Hint Table

```sql
-- Hint table is created automatically, but you can check:
SELECT * FROM hint_plan.hints;

-- Insert hint for specific query
INSERT INTO hint_plan.hints (
    norm_query_string,
    application_name,
    hints
) VALUES (
    'SELECT * FROM orders WHERE customer_id = $1',
    '',
    'IndexScan(orders idx_orders_customer_id)'
);

-- Application name specific hint
INSERT INTO hint_plan.hints (
    norm_query_string,
    application_name,
    hints
) VALUES (
    'SELECT * FROM orders WHERE status = $1',
    'reporting_app',
    'SeqScan(orders)'
);
```

### Query Normalization

```sql
-- Query with parameters is normalized
-- Original: SELECT * FROM orders WHERE id = 123
-- Normalized: SELECT * FROM orders WHERE id = $1

-- Check normalized query form
SELECT pg_stat_statements.query
FROM pg_stat_statements
WHERE query LIKE '%orders%';
```

## Debugging Hints

### Enable Debug Output

```sql
-- Show hint processing
SET pg_hint_plan.debug_print = on;
SET pg_hint_plan.message_level = notice;

/*+ IndexScan(orders) */
EXPLAIN SELECT * FROM orders WHERE id = 123;

-- Output shows which hints were applied
```

### Check Hint Errors

```sql
-- Invalid hints are logged
/*+ InvalidHint(orders) */
SELECT * FROM orders;

-- Check logs for:
-- NOTICE: pg_hint_plan: hint syntax error at or near "InvalidHint"
```

### Verify Hint Application

```sql
-- Use EXPLAIN to verify hint was applied
/*+ SeqScan(orders) */
EXPLAIN (COSTS OFF)
SELECT * FROM orders WHERE id = 123;

-- Should show Seq Scan instead of Index Scan
```

## Practical Examples

### Example 1: Force Index for Rare Values

```sql
-- Planner underestimates rare status
-- Without hint: Seq Scan
-- With hint: Index Scan (correct for rare value)

/*+ IndexScan(orders idx_orders_status) */
SELECT * FROM orders WHERE status = 'cancelled';
```

### Example 2: Optimize Multi-Table Join

```sql
-- Complex join with known data distribution
/*+
    Leading(regions customers orders)
    NestLoop(regions customers)
    HashJoin(customers orders)
    IndexScan(regions idx_regions_code)
    Rows(customers #100)
*/
SELECT r.name, COUNT(o.id)
FROM regions r
JOIN customers c ON c.region_id = r.id
JOIN orders o ON o.customer_id = c.id
WHERE r.code = 'US'
GROUP BY r.name;
```

### Example 3: Prevent Hash Join on Memory-Constrained System

```sql
-- Force nested loop to avoid memory-heavy hash join
/*+ NoHashJoin(large_table1 large_table2) */
SELECT *
FROM large_table1 t1
JOIN large_table2 t2 ON t1.id = t2.foreign_id
WHERE t1.id < 1000;
```

### Example 4: CTE Materialization Control

```sql
-- PostgreSQL 12+ allows CTE materialization hints
WITH /*+ Materialize */
expensive_cte AS (
    SELECT customer_id, SUM(total) AS lifetime_value
    FROM orders
    GROUP BY customer_id
)
SELECT c.name, e.lifetime_value
FROM customers c
JOIN expensive_cte e ON e.customer_id = c.id;

-- Or prevent materialization
WITH /*+ NoMaterialize */
simple_cte AS (
    SELECT * FROM orders WHERE status = 'active'
)
SELECT * FROM simple_cte WHERE customer_id = 123;
```

### Example 5: Subquery Optimization

```sql
/*+
    Leading((orders (SELECT customer_id FROM vip_customers)))
    HashJoin(orders vip_customers)
*/
SELECT *
FROM orders o
WHERE o.customer_id IN (
    SELECT customer_id
    FROM vip_customers
    WHERE tier = 'platinum'
);
```

## Best Practices

### When to Use Hints

1. **Statistics are inaccurate** - After bulk loads, before ANALYZE
2. **Complex joins** - Planner struggles with many tables
3. **Known data patterns** - Application knows data better than statistics
4. **Testing** - Compare different execution strategies
5. **Emergency fixes** - Quick fix while investigating root cause

### When NOT to Use Hints

1. **Before analyzing the problem** - Always EXPLAIN ANALYZE first
2. **As permanent solutions** - Fix underlying issues instead
3. **Without testing** - Hints can make queries worse
4. **For all queries** - Only use when necessary

### Document Your Hints

```sql
-- Document why hint is needed
/*+
    IndexScan(orders idx_orders_customer_id)
    -- Hint needed because: Statistics don't reflect recent bulk insert
    -- of 100k orders for customer 12345. Remove after next ANALYZE.
    -- Added: 2026-01-21, Ticket: PERF-1234
*/
SELECT * FROM orders WHERE customer_id = 12345;
```

### Monitor Hinted Queries

```sql
-- Track hinted query performance
CREATE TABLE hint_performance_log (
    id SERIAL PRIMARY KEY,
    query_hash TEXT,
    hint_used TEXT,
    execution_time_ms NUMERIC,
    rows_returned BIGINT,
    logged_at TIMESTAMP DEFAULT NOW()
);

-- Review periodically
SELECT
    hint_used,
    AVG(execution_time_ms) AS avg_time,
    COUNT(*) AS executions
FROM hint_performance_log
GROUP BY hint_used
ORDER BY avg_time DESC;
```

## Alternatives to Hints

Before using hints, consider:

```sql
-- Update statistics
ANALYZE orders;

-- Increase statistics target for specific column
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;
ANALYZE orders;

-- Use extended statistics for correlated columns
CREATE STATISTICS orders_stats (dependencies)
ON customer_id, status FROM orders;

-- Adjust planner settings for session
SET random_page_cost = 1.1;
SET enable_seqscan = off;  -- Temporary, for testing
```

## Conclusion

pg_hint_plan provides powerful control over PostgreSQL query execution:

1. **Scan hints** - Control table access methods
2. **Join hints** - Force specific join algorithms
3. **Order hints** - Specify join order
4. **Row hints** - Override cardinality estimates
5. **Parallel hints** - Control parallel query execution

Use hints judiciously as temporary measures or for specific optimization needs, while working to fix underlying issues through proper indexing, statistics, and schema design.
