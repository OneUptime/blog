# How to Force Index Usage in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Performance, Indexing, Query Optimization, Database

Description: Learn when and how to influence PostgreSQL's query planner to use specific indexes, including techniques for forcing index scans and understanding why the planner sometimes ignores your indexes.

---

PostgreSQL's query planner is remarkably good at choosing execution plans. But sometimes it makes choices that seem wrong, or you know something about your data that the planner does not. This guide covers why PostgreSQL might ignore your indexes and how to nudge it toward better choices.

## Why Does PostgreSQL Ignore My Index?

Before trying to force index usage, understand why the planner might choose a sequential scan:

### 1. Sequential Scan is Actually Faster

For small tables or queries returning a large percentage of rows, sequential scan beats index scan:

```sql
-- Returning 80% of rows - sequential scan wins
SELECT * FROM products WHERE price > 0;

-- Check how many rows match
SELECT count(*) * 100.0 / (SELECT count(*) FROM products)
FROM products WHERE price > 0;
-- Returns: 92.5% - index would be slower
```

Rule of thumb: If the query returns more than 10-20% of the table, sequential scan is often faster.

### 2. Outdated Statistics

The planner relies on statistics to estimate row counts. Stale statistics lead to wrong plans:

```sql
-- Check when statistics were last updated
SELECT
    schemaname,
    relname,
    last_vacuum,
    last_analyze,
    n_live_tup
FROM pg_stat_user_tables
WHERE relname = 'orders';

-- Update statistics
ANALYZE orders;
```

### 3. Incorrect Cost Parameters

PostgreSQL uses cost parameters to estimate plan costs. Defaults assume spinning disks:

```sql
-- Check current settings
SHOW random_page_cost;  -- Default 4.0
SHOW seq_page_cost;     -- Default 1.0

-- For SSDs, random I/O is nearly as fast as sequential
-- This makes index scans more attractive
SET random_page_cost = 1.1;
```

### 4. Missing Index

Sometimes the index you think exists does not:

```sql
-- List indexes on a table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders';

-- Check if index is valid (not failed partial build)
SELECT indexrelid::regclass, indisvalid, indisready
FROM pg_index
WHERE indrelid = 'orders'::regclass;
```

## Diagnosing Planner Decisions

Use EXPLAIN to see what the planner chooses and why:

```sql
-- Basic explain
EXPLAIN SELECT * FROM orders WHERE customer_id = 42;

-- With actual execution stats
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE customer_id = 42;
```

Look for:
- `Seq Scan` vs `Index Scan` vs `Bitmap Index Scan`
- `rows=` (estimated) vs `actual time=` (actual rows)
- Large discrepancies indicate statistics problems

## Method 1: Adjust Session-Level Cost Parameters

Temporarily change planner cost settings:

```sql
-- Make sequential scans more expensive (encourages index usage)
SET enable_seqscan = off;

-- Run your query
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;

-- Reset to default
RESET enable_seqscan;
```

Other relevant settings:

```sql
-- Disable specific scan types
SET enable_seqscan = off;     -- Disable sequential scans
SET enable_indexscan = on;    -- Ensure index scans enabled
SET enable_bitmapscan = off;  -- Disable bitmap scans

-- Adjust cost estimates
SET random_page_cost = 1.1;   -- Reduce random I/O cost (SSDs)
SET cpu_index_tuple_cost = 0.001;  -- Reduce index tuple processing cost
```

These settings affect the entire session. Use them for testing, not permanently.

## Method 2: Rewrite Queries to Use Indexes

Sometimes query structure prevents index usage.

### Force Index on Range Conditions

```sql
-- Index on (created_at) exists but not used
EXPLAIN SELECT * FROM orders WHERE date(created_at) = '2026-01-25';
-- Result: Seq Scan (function on column prevents index use)

-- Rewrite to use the index
EXPLAIN SELECT * FROM orders
WHERE created_at >= '2026-01-25'
  AND created_at < '2026-01-26';
-- Result: Index Scan
```

### Use Expression Index for Functions

```sql
-- Create index on the expression
CREATE INDEX idx_orders_date ON orders (date(created_at));

-- Now the function-based query uses the index
EXPLAIN SELECT * FROM orders WHERE date(created_at) = '2026-01-25';
-- Result: Index Scan using idx_orders_date
```

### Fix Implicit Type Casts

```sql
-- customer_id is INTEGER, but parameter is TEXT
EXPLAIN SELECT * FROM orders WHERE customer_id = '42';
-- PostgreSQL may not use index due to type mismatch

-- Cast explicitly
EXPLAIN SELECT * FROM orders WHERE customer_id = 42::integer;
-- Or fix in application code
```

## Method 3: Use Planner Hints (pg_hint_plan Extension)

The `pg_hint_plan` extension adds Oracle-style hints:

```sql
-- Install the extension
CREATE EXTENSION pg_hint_plan;

-- Force index scan with a hint
SELECT /*+ IndexScan(orders idx_orders_customer) */ *
FROM orders
WHERE customer_id = 42;

-- Force specific join method
SELECT /*+ HashJoin(o c) */
    o.*, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id;

-- Combine multiple hints
SELECT /*+ IndexScan(orders idx_orders_status) SeqScan(customers) */
    o.*, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending';
```

Available hints:
- `SeqScan(table)` - Force sequential scan
- `IndexScan(table index)` - Force index scan
- `IndexOnlyScan(table index)` - Force index-only scan
- `BitmapScan(table index)` - Force bitmap scan
- `NoIndexScan(table)` - Prevent index scans

## Method 4: Use CTEs to Isolate Plan Choices

CTEs can force the planner to materialize intermediate results:

```sql
-- Without CTE: planner may choose suboptimal join order
SELECT *
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE c.region = 'US'
  AND o.created_at > '2026-01-01';

-- With materialized CTE: force the filter first
WITH us_customers AS MATERIALIZED (
    SELECT id FROM customers WHERE region = 'US'
)
SELECT o.*
FROM orders o
JOIN us_customers c ON c.id = o.customer_id
WHERE o.created_at > '2026-01-01';
```

Note: PostgreSQL 12+ may inline CTEs by default. Use `MATERIALIZED` to force materialization.

## Method 5: Adjust Table Statistics

Increase statistics granularity for columns with skewed distributions:

```sql
-- Default statistics target is 100
-- Increase for columns with uneven distribution
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE orders ALTER COLUMN customer_id SET STATISTICS 500;

-- Reanalyze the table
ANALYZE orders;

-- Check the statistics
SELECT
    attname,
    n_distinct,
    most_common_vals,
    most_common_freqs
FROM pg_stats
WHERE tablename = 'orders' AND attname = 'status';
```

## Method 6: Partial Indexes for Selective Queries

Create indexes that match your query filters:

```sql
-- Regular index - includes all rows
CREATE INDEX idx_orders_status ON orders(status);

-- Partial index - only includes pending orders
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending';

-- Query using the partial index
EXPLAIN SELECT * FROM orders
WHERE status = 'pending'
  AND created_at > '2026-01-01';
-- Uses idx_orders_pending efficiently
```

Partial indexes are smaller and more targeted.

## Method 7: Include Columns for Index-Only Scans

Add columns to the index to enable index-only scans:

```sql
-- Create covering index
CREATE INDEX idx_orders_customer_covering ON orders (customer_id)
INCLUDE (status, amount);

-- This query can be satisfied entirely from the index
EXPLAIN SELECT customer_id, status, amount
FROM orders
WHERE customer_id = 42;
-- Result: Index Only Scan
```

## Debugging Planner Decisions

When the planner makes unexpected choices, investigate:

```sql
-- See detailed cost breakdown
EXPLAIN (ANALYZE, VERBOSE, COSTS, BUFFERS, FORMAT YAML)
SELECT * FROM orders WHERE customer_id = 42;
```

Compare estimated vs actual rows:

```sql
-- Check for estimation errors
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending';
-- Look for: "rows=1000" vs "actual...rows=50000"
-- Large discrepancy means statistics are wrong
```

Force different plans and compare:

```sql
-- Plan A: Let planner choose
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 42;

-- Plan B: Force index scan
SET enable_seqscan = off;
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 42;
RESET enable_seqscan;

-- Compare actual execution times and buffer hits
```

## When NOT to Force Index Usage

Sometimes the planner is right and you are wrong:

1. **Very small tables**: Sequential scan of 100 rows is faster than index lookup
2. **High selectivity queries**: Returning 50% of rows, sequential scan wins
3. **Correlated columns**: The planner may know something you do not
4. **Index maintenance overhead**: More indexes slow writes

Trust the planner unless you have measured evidence it is wrong.

## Production Recommendations

1. **Fix root causes first**: Update statistics, check cost parameters, verify index exists
2. **Test changes with EXPLAIN ANALYZE**: Measure, do not guess
3. **Use pg_hint_plan sparingly**: Hints become maintenance burden
4. **Monitor query performance**: Plans can change as data grows
5. **Consider partial/covering indexes**: Often better than forcing plan choices

The best approach is usually making your index more attractive to the planner rather than forcing its hand. A well-designed index with accurate statistics will be chosen automatically.
