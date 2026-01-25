# How to Optimize GROUP BY Performance in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, SQL, GROUP BY, Performance, Query Optimization, Indexing

Description: Learn techniques to optimize GROUP BY queries in PostgreSQL. This guide covers indexing strategies, hash vs sort aggregation, partial indexes, and materialized views for faster aggregations.

---

GROUP BY queries power dashboards, reports, and analytics. As data grows, these queries can become performance bottlenecks. PostgreSQL offers multiple strategies for executing aggregations, and understanding them helps you write faster queries.

## How PostgreSQL Executes GROUP BY

PostgreSQL has two main strategies for GROUP BY: hash aggregation and sort-based aggregation.

```sql
-- Create a sample table with substantial data
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    region VARCHAR(50) NOT NULL,
    sale_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    revenue DECIMAL(10,2) NOT NULL
);

-- Insert sample data
INSERT INTO sales (product_id, region, sale_date, quantity, revenue)
SELECT
    (random() * 1000)::INTEGER,
    (ARRAY['North', 'South', 'East', 'West'])[1 + (random() * 3)::INTEGER],
    '2026-01-01'::DATE - (random() * 365)::INTEGER,
    (random() * 100)::INTEGER + 1,
    (random() * 1000)::DECIMAL(10,2)
FROM generate_series(1, 1000000);

-- Analyze to update statistics
ANALYZE sales;
```

## Understanding Hash vs Sort Aggregation

Use EXPLAIN to see which strategy PostgreSQL chooses.

```sql
-- Check the execution plan for a GROUP BY query
EXPLAIN (ANALYZE, BUFFERS)
SELECT region, SUM(revenue) AS total_revenue
FROM sales
GROUP BY region;
```

Hash aggregation builds an in-memory hash table and is faster when the number of groups is small relative to work_mem. Sort aggregation sorts the data first and is better when data is already sorted or when there are many groups.

```sql
-- Force hash aggregation (for testing)
SET enable_sort = off;
EXPLAIN SELECT region, SUM(revenue) FROM sales GROUP BY region;
RESET enable_sort;

-- Force sort aggregation (for testing)
SET enable_hashagg = off;
EXPLAIN SELECT region, SUM(revenue) FROM sales GROUP BY region;
RESET enable_hashagg;
```

## Indexing for GROUP BY

Proper indexes dramatically improve GROUP BY performance, especially for sort-based aggregation.

```sql
-- Index on grouping columns
CREATE INDEX idx_sales_region ON sales (region);

-- Query using the index for grouping
EXPLAIN ANALYZE
SELECT region, COUNT(*), SUM(revenue)
FROM sales
GROUP BY region;

-- Composite index for multiple grouping columns
CREATE INDEX idx_sales_region_product ON sales (region, product_id);

-- Query using composite index
EXPLAIN ANALYZE
SELECT region, product_id, SUM(revenue)
FROM sales
GROUP BY region, product_id;
```

## Index-Only Aggregations

When all needed columns are in the index, PostgreSQL can perform index-only scans.

```sql
-- Create a covering index that includes the aggregate column
CREATE INDEX idx_sales_region_revenue ON sales (region) INCLUDE (revenue);

-- This can be an index-only scan
EXPLAIN ANALYZE
SELECT region, SUM(revenue)
FROM sales
GROUP BY region;

-- For counting, a simple index suffices
CREATE INDEX idx_sales_product ON sales (product_id);

-- COUNT can use index-only scan
EXPLAIN ANALYZE
SELECT product_id, COUNT(*)
FROM sales
GROUP BY product_id;
```

## Partial Indexes for Filtered Aggregations

When you frequently aggregate filtered data, partial indexes help.

```sql
-- Partial index for recent data only
CREATE INDEX idx_sales_recent_region
ON sales (region, revenue)
WHERE sale_date >= '2026-01-01';

-- Queries filtering to recent data use the smaller index
EXPLAIN ANALYZE
SELECT region, SUM(revenue)
FROM sales
WHERE sale_date >= '2026-01-01'
GROUP BY region;
```

## Optimizing work_mem for Hash Aggregation

Hash aggregation performs best when the hash table fits in memory.

```sql
-- Check current work_mem setting
SHOW work_mem;

-- Increase work_mem for the session
SET work_mem = '256MB';

-- Run the aggregation query
EXPLAIN (ANALYZE, BUFFERS)
SELECT product_id, region, SUM(revenue)
FROM sales
GROUP BY product_id, region;

-- Reset to default
RESET work_mem;
```

When the hash table exceeds work_mem, PostgreSQL spills to disk, significantly slowing the query.

## Pre-Aggregation with Materialized Views

For repeated aggregations on static or slowly-changing data, materialized views provide instant results.

```sql
-- Create a materialized view for regional summaries
CREATE MATERIALIZED VIEW regional_sales_summary AS
SELECT
    region,
    DATE_TRUNC('month', sale_date) AS month,
    COUNT(*) AS transaction_count,
    SUM(quantity) AS total_quantity,
    SUM(revenue) AS total_revenue
FROM sales
GROUP BY region, DATE_TRUNC('month', sale_date);

-- Create index on the materialized view
CREATE INDEX idx_regional_summary_region ON regional_sales_summary (region);

-- Query the materialized view (instant results)
SELECT region, SUM(total_revenue) AS yearly_revenue
FROM regional_sales_summary
WHERE month >= '2025-01-01'
GROUP BY region;

-- Refresh when source data changes
REFRESH MATERIALIZED VIEW regional_sales_summary;

-- Concurrent refresh (allows reads during refresh)
REFRESH MATERIALIZED VIEW CONCURRENTLY regional_sales_summary;
```

## BRIN Indexes for Time-Based Aggregations

For large tables ordered by time, BRIN indexes are space-efficient and help with date-range aggregations.

```sql
-- Create BRIN index on date column
CREATE INDEX idx_sales_date_brin ON sales USING BRIN (sale_date);

-- Query with date range filter benefits from BRIN
EXPLAIN ANALYZE
SELECT DATE_TRUNC('week', sale_date) AS week, SUM(revenue)
FROM sales
WHERE sale_date BETWEEN '2025-06-01' AND '2025-12-31'
GROUP BY DATE_TRUNC('week', sale_date)
ORDER BY week;
```

## Parallel GROUP BY

PostgreSQL can parallelize aggregations on large tables.

```sql
-- Check parallel query settings
SHOW max_parallel_workers_per_gather;
SHOW parallel_tuple_cost;

-- Force parallel execution for testing
SET parallel_tuple_cost = 0;
SET parallel_setup_cost = 0;

EXPLAIN (ANALYZE)
SELECT region, SUM(revenue)
FROM sales
GROUP BY region;

-- Look for "Parallel Seq Scan" and "Partial HashAggregate" in the plan
RESET parallel_tuple_cost;
RESET parallel_setup_cost;
```

## Avoiding Common Performance Pitfalls

Several patterns hurt GROUP BY performance.

```sql
-- SLOW: Function on grouped column prevents index use
SELECT UPPER(region) AS region_upper, SUM(revenue)
FROM sales
GROUP BY UPPER(region);

-- BETTER: Create index on the expression
CREATE INDEX idx_sales_upper_region ON sales (UPPER(region));

-- SLOW: Grouping by many columns with no index
SELECT product_id, region, sale_date, SUM(revenue)
FROM sales
GROUP BY product_id, region, sale_date;

-- BETTER: Add composite index matching GROUP BY order
CREATE INDEX idx_sales_grouped ON sales (product_id, region, sale_date);

-- SLOW: Unnecessary columns in SELECT
SELECT *, COUNT(*) OVER (PARTITION BY region)
FROM sales;

-- BETTER: Select only needed columns
SELECT region, COUNT(*)
FROM sales
GROUP BY region;
```

## Incremental Aggregation Strategies

For continuously growing data, maintain summary tables.

```sql
-- Create a summary table
CREATE TABLE sales_daily_summary (
    summary_date DATE PRIMARY KEY,
    region VARCHAR(50),
    total_transactions INTEGER,
    total_revenue DECIMAL(12,2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraint for upsert
CREATE UNIQUE INDEX idx_daily_summary_unique
ON sales_daily_summary (summary_date, region);

-- Insert or update daily summaries
INSERT INTO sales_daily_summary (summary_date, region, total_transactions, total_revenue)
SELECT
    sale_date,
    region,
    COUNT(*),
    SUM(revenue)
FROM sales
WHERE sale_date = CURRENT_DATE - 1
GROUP BY sale_date, region
ON CONFLICT (summary_date, region) DO UPDATE SET
    total_transactions = EXCLUDED.total_transactions,
    total_revenue = EXCLUDED.total_revenue,
    updated_at = CURRENT_TIMESTAMP;
```

## Query Rewriting for Performance

Sometimes restructuring the query improves performance.

```sql
-- Original: Group by with HAVING
SELECT region, SUM(revenue) AS total
FROM sales
GROUP BY region
HAVING SUM(revenue) > 100000;

-- Alternative: Filter with subquery (sometimes faster)
SELECT * FROM (
    SELECT region, SUM(revenue) AS total
    FROM sales
    GROUP BY region
) sub
WHERE total > 100000;

-- For COUNT(DISTINCT), consider approximation for large datasets
-- Exact count
SELECT region, COUNT(DISTINCT product_id) FROM sales GROUP BY region;

-- Approximate count using HyperLogLog (requires postgresql-hll extension)
-- SELECT region, hll_cardinality(hll_add_agg(hll_hash_integer(product_id)))
-- FROM sales GROUP BY region;
```

## Monitoring Aggregation Performance

Track slow aggregations in production.

```sql
-- Enable slow query logging
-- In postgresql.conf: log_min_duration_statement = 1000

-- Query pg_stat_statements for slow GROUP BY queries
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
WHERE query ILIKE '%GROUP BY%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

Optimizing GROUP BY queries requires understanding both your data distribution and PostgreSQL's execution strategies. Start with proper indexing, consider materialized views for repeated queries, and tune work_mem for hash aggregation. Monitor query performance continuously, and adjust as your data grows.
