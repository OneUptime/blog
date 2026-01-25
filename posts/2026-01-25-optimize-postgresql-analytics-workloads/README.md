# How to Optimize PostgreSQL for Analytics Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Analytics, Performance, Data Warehouse, OLAP

Description: Learn how to configure and optimize PostgreSQL for analytical queries, including memory tuning, parallel query execution, columnar storage with extensions, and query optimization techniques.

---

PostgreSQL is primarily an OLTP database, but with the right configuration, it handles analytics workloads surprisingly well. This guide covers the techniques and settings that transform PostgreSQL into a capable analytics engine for medium-scale data warehousing.

## Understanding OLAP vs OLTP

Analytics workloads differ fundamentally from transactional workloads:

| Characteristic | OLTP | OLAP |
|---------------|------|------|
| Query type | Point lookups, small updates | Full table scans, aggregations |
| Data access | Random, row-based | Sequential, column-based |
| Concurrency | Many short queries | Few long queries |
| Freshness | Real-time | Batch acceptable |

PostgreSQL defaults favor OLTP. For analytics, we need to adjust memory allocation, parallelism, and query planning.

## Memory Configuration for Analytics

Analytics queries process large datasets and benefit from aggressive memory allocation.

### Increase work_mem

work_mem controls memory for sorts and hash operations. The default 4MB is far too low for analytics:

```sql
-- Check current setting
SHOW work_mem;

-- Set for the current session (good for testing)
SET work_mem = '256MB';

-- Set permanently for analytics queries
ALTER SYSTEM SET work_mem = '256MB';
SELECT pg_reload_conf();
```

Be careful: work_mem is allocated per operation, per connection. A complex query might use 5x work_mem. Calculate your maximum: `max_connections * 5 * work_mem < available_RAM`.

### Increase maintenance_work_mem

This setting affects CREATE INDEX, VACUUM, and similar operations:

```sql
-- 1GB is reasonable for servers with 32GB+ RAM
ALTER SYSTEM SET maintenance_work_mem = '1GB';
SELECT pg_reload_conf();
```

### Configure effective_cache_size

This tells the planner how much memory is available for caching. Set it to about 75% of total RAM:

```sql
-- For a 64GB server
ALTER SYSTEM SET effective_cache_size = '48GB';
SELECT pg_reload_conf();
```

## Enabling Parallel Query Execution

PostgreSQL can parallelize sequential scans, aggregations, and joins. This is essential for analytics.

```sql
-- Check parallel query settings
SELECT name, setting
FROM pg_settings
WHERE name LIKE '%parallel%';
```

Recommended settings for analytics:

```sql
-- Maximum parallel workers per query
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

-- Total parallel workers available
ALTER SYSTEM SET max_parallel_workers = 8;

-- Threshold for considering parallel scan (lower = more parallelism)
ALTER SYSTEM SET min_parallel_table_scan_size = '8MB';
ALTER SYSTEM SET min_parallel_index_scan_size = '512kB';

-- Enable parallel features
ALTER SYSTEM SET parallel_leader_participation = on;

SELECT pg_reload_conf();
```

Verify parallelism is working:

```sql
-- This should show "Workers Planned" in the output
EXPLAIN ANALYZE
SELECT count(*), avg(amount)
FROM large_transactions
WHERE created_at > '2025-01-01';
```

Look for `Parallel Seq Scan` or `Parallel Hash Join` in the plan.

## Table Partitioning for Large Datasets

Partitioning enables partition pruning, which dramatically speeds up queries on time-series data:

```sql
-- Create a partitioned fact table
CREATE TABLE sales (
    id BIGSERIAL,
    sale_date DATE NOT NULL,
    customer_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    amount NUMERIC(12,2)
) PARTITION BY RANGE (sale_date);

-- Create monthly partitions
CREATE TABLE sales_2025_01 PARTITION OF sales
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE sales_2025_02 PARTITION OF sales
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- Continue for other months...

-- Create indexes on each partition
CREATE INDEX ON sales_2025_01 (customer_id);
CREATE INDEX ON sales_2025_02 (customer_id);
```

Queries filtering on sale_date will only scan relevant partitions:

```sql
-- Only scans January partition
EXPLAIN ANALYZE
SELECT sum(amount)
FROM sales
WHERE sale_date BETWEEN '2025-01-01' AND '2025-01-31';
```

## BRIN Indexes for Time-Series Data

B-tree indexes are expensive for large tables. BRIN (Block Range Index) indexes are tiny and perfect for naturally ordered data:

```sql
-- BRIN index on timestamp column
CREATE INDEX idx_events_created_brin ON events
    USING BRIN (created_at)
    WITH (pages_per_range = 128);

-- Check index size comparison
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes
WHERE tablename = 'events';
```

BRIN indexes work best when data is physically ordered by the indexed column. Insert data in timestamp order for best results.

## Materialized Views for Pre-Aggregation

Complex aggregations can be pre-computed and refreshed periodically:

```sql
-- Create a materialized view for daily sales summary
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT
    sale_date,
    product_id,
    count(*) AS transaction_count,
    sum(quantity) AS total_quantity,
    sum(amount) AS total_amount,
    avg(amount) AS avg_amount
FROM sales
GROUP BY sale_date, product_id;

-- Create indexes on the materialized view
CREATE INDEX ON daily_sales_summary (sale_date);
CREATE INDEX ON daily_sales_summary (product_id);

-- Refresh the data (can be done in a cron job)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
```

The CONCURRENTLY option allows reads during refresh but requires a unique index:

```sql
CREATE UNIQUE INDEX ON daily_sales_summary (sale_date, product_id);
```

## Columnar Storage with Citus

For true columnar storage, the Citus extension provides a columnar table access method:

```sql
-- Install the extension (requires Citus)
CREATE EXTENSION IF NOT EXISTS citus;

-- Create a columnar table
CREATE TABLE events_columnar (
    id BIGINT,
    event_type TEXT,
    user_id INTEGER,
    payload JSONB,
    created_at TIMESTAMP
) USING columnar;

-- Insert data (batch inserts work best)
INSERT INTO events_columnar
SELECT * FROM events WHERE created_at > '2025-01-01';

-- Check compression ratio
SELECT
    pg_size_pretty(pg_relation_size('events')) AS row_size,
    pg_size_pretty(pg_relation_size('events_columnar')) AS columnar_size;
```

Columnar storage excels at queries that read few columns from many rows:

```sql
-- This query benefits from columnar: only reads event_type and created_at
SELECT event_type, count(*)
FROM events_columnar
WHERE created_at > '2025-01-01'
GROUP BY event_type;
```

## Query Optimization Techniques

### Use CTEs Wisely

In PostgreSQL 12+, CTEs can be inlined. Use NOT MATERIALIZED for optimization or MATERIALIZED to force separate execution:

```sql
-- Allow the planner to inline the CTE (default in PG12+)
WITH recent_sales AS NOT MATERIALIZED (
    SELECT * FROM sales WHERE sale_date > current_date - interval '30 days'
)
SELECT customer_id, sum(amount)
FROM recent_sales
GROUP BY customer_id;

-- Force materialization to reuse expensive subquery results
WITH customer_totals AS MATERIALIZED (
    SELECT customer_id, sum(amount) AS total
    FROM sales
    GROUP BY customer_id
)
SELECT
    c.name,
    ct.total,
    ct.total / sum(ct.total) OVER () AS percentage
FROM customer_totals ct
JOIN customers c ON c.id = ct.customer_id;
```

### Leverage Window Functions

Window functions are highly optimized for analytics:

```sql
-- Running total and moving average
SELECT
    sale_date,
    amount,
    sum(amount) OVER (ORDER BY sale_date) AS running_total,
    avg(amount) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7day
FROM daily_sales_summary
WHERE product_id = 123;
```

### Use GROUPING SETS for Multi-Level Aggregation

Instead of multiple queries with UNION ALL:

```sql
-- Single query produces multiple aggregation levels
SELECT
    COALESCE(region, 'ALL') AS region,
    COALESCE(product_category, 'ALL') AS category,
    sum(amount) AS total_sales
FROM sales s
JOIN products p ON p.id = s.product_id
GROUP BY GROUPING SETS (
    (region, product_category),  -- Detail level
    (region),                    -- By region
    (product_category),          -- By category
    ()                           -- Grand total
)
ORDER BY region NULLS LAST, category NULLS LAST;
```

## JIT Compilation for Complex Queries

Just-In-Time compilation speeds up expression evaluation in complex queries:

```sql
-- Enable JIT (on by default in PG12+)
SET jit = on;
SET jit_above_cost = 100000;
SET jit_inline_above_cost = 500000;
SET jit_optimize_above_cost = 500000;

-- Check if JIT is being used
EXPLAIN ANALYZE
SELECT sum(amount * quantity * 1.1)
FROM sales
WHERE sale_date > '2025-01-01';
-- Look for "JIT:" section in output
```

## Query Planning Statistics

The planner needs accurate statistics. For analytics tables, increase the statistics target:

```sql
-- Increase statistics granularity for important columns
ALTER TABLE sales ALTER COLUMN customer_id SET STATISTICS 1000;
ALTER TABLE sales ALTER COLUMN product_id SET STATISTICS 1000;

-- Analyze the table
ANALYZE sales;

-- Check statistics
SELECT
    attname,
    n_distinct,
    most_common_vals,
    correlation
FROM pg_stats
WHERE tablename = 'sales' AND attname = 'customer_id';
```

## Practical Configuration Summary

Here is a configuration template for a 64GB analytics server:

```sql
-- postgresql.conf settings for analytics
ALTER SYSTEM SET shared_buffers = '16GB';
ALTER SYSTEM SET effective_cache_size = '48GB';
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '2GB';
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_workers = 8;
ALTER SYSTEM SET max_worker_processes = 16;
ALTER SYSTEM SET random_page_cost = 1.1;  -- For SSDs
ALTER SYSTEM SET effective_io_concurrency = 200;  -- For SSDs
ALTER SYSTEM SET jit = on;

SELECT pg_reload_conf();
```

Remember to restart PostgreSQL for settings that require it (like shared_buffers).

## When to Consider Alternatives

PostgreSQL analytics optimization has limits. Consider dedicated OLAP solutions when:

- Tables exceed 1 billion rows
- Query response must be sub-second on cold cache
- You need automatic query optimization without manual tuning
- Real-time streaming analytics is required

For these cases, look at ClickHouse, DuckDB (for embedded analytics), or cloud data warehouses. But for medium-scale analytics with up to hundreds of millions of rows, properly tuned PostgreSQL delivers solid performance without additional infrastructure.
