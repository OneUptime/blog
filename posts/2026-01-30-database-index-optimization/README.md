# How to Implement Index Optimization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Database, Performance, Indexing, SQL

Description: Optimize database indexes by analyzing query patterns, removing unused indexes, and designing covering indexes for maximum query performance.

---

Database indexes are the backbone of query performance. A well-indexed database returns results in milliseconds. A poorly indexed one grinds to a halt under load. This guide walks through the practical steps of index optimization, from identifying slow queries to designing covering indexes that eliminate table lookups entirely.

## 1. Finding Slow Queries Before Users Complain

The first step in index optimization is knowing which queries need help. Every major database provides tools to surface slow queries. Start by enabling slow query logging and reviewing the results.

### PostgreSQL: Enable Slow Query Logging

PostgreSQL tracks slow queries through the `log_min_duration_statement` parameter. Set it to capture any query exceeding your target latency.

```sql
-- Log any query taking longer than 100ms
ALTER SYSTEM SET log_min_duration_statement = 100;

-- Reload configuration to apply changes
SELECT pg_reload_conf();
```

For deeper analysis, the `pg_stat_statements` extension provides cumulative statistics across all queries. This reveals patterns that individual slow query logs miss.

```sql
-- Enable the extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find the top 10 queries by total execution time
SELECT
    substring(query, 1, 80) AS short_query,
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS avg_time_ms,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### MySQL: Slow Query Log Configuration

MySQL provides similar functionality through its slow query log. Enable it and set the threshold.

```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';

-- Set threshold to 100ms (0.1 seconds)
SET GLOBAL long_query_time = 0.1;

-- Log queries that don't use indexes
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- Check current settings
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';
```

Use the Performance Schema for real-time analysis of query performance.

```sql
-- Top 10 queries by total latency
SELECT
    DIGEST_TEXT AS query,
    COUNT_STAR AS calls,
    ROUND(SUM_TIMER_WAIT / 1000000000, 2) AS total_time_ms,
    ROUND(AVG_TIMER_WAIT / 1000000000, 2) AS avg_time_ms,
    SUM_ROWS_EXAMINED AS rows_examined
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

## 2. Understanding Query Execution Plans

Once you identify slow queries, examine their execution plans. The plan reveals whether indexes are being used and where bottlenecks occur.

### PostgreSQL: EXPLAIN ANALYZE

The `EXPLAIN ANALYZE` command runs the query and shows actual execution statistics.

```sql
-- Analyze a slow query with timing and buffer information
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.order_id, o.order_date, c.customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date > '2025-01-01'
AND c.region = 'US';
```

Key metrics to watch in the output:

| Metric | Meaning | Red Flag |
|--------|---------|----------|
| Seq Scan | Full table scan | Large tables without index usage |
| Nested Loop | Row-by-row join | High actual rows vs. estimated |
| Buffers shared hit | Pages read from cache | Low hit ratio indicates memory pressure |
| Buffers shared read | Pages read from disk | High reads mean poor caching |
| actual time | Real execution time | Large gap between startup and total |

### MySQL: EXPLAIN Output

MySQL's EXPLAIN command shows the query execution plan.

```sql
-- Basic explain output
EXPLAIN
SELECT o.order_id, o.order_date, c.customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date > '2025-01-01'
AND c.region = 'US';

-- Extended format with additional details
EXPLAIN FORMAT=JSON
SELECT o.order_id, o.order_date, c.customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date > '2025-01-01'
AND c.region = 'US';
```

Important columns in MySQL EXPLAIN output:

| Column | Meaning | Watch For |
|--------|---------|-----------|
| type | Join type | ALL (full scan) or index (full index scan) |
| possible_keys | Available indexes | NULL means no indexes match |
| key | Index actually used | NULL when expected index exists |
| rows | Estimated rows examined | Much higher than result set |
| Extra | Additional info | "Using filesort" or "Using temporary" |

## 3. Measuring Index Usage Statistics

Before creating new indexes, understand how existing indexes perform. Unused indexes waste disk space and slow down writes. Heavily used indexes might benefit from optimization.

### PostgreSQL: Index Usage Statistics

PostgreSQL tracks index usage through system views. Query them to find unused and heavily used indexes.

```sql
-- Find unused indexes (index scans = 0)
SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

This query identifies indexes with zero scans. Exclude primary keys since they serve structural purposes beyond query optimization.

```sql
-- Find the most heavily used indexes
SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    round(idx_tup_read::numeric / nullif(idx_scan, 0), 2) AS avg_tuples_per_scan
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 20;
```

### MySQL: Index Usage Statistics

MySQL tracks index usage through the Performance Schema.

```sql
-- Find indexes that have never been used
SELECT
    object_schema,
    object_name AS table_name,
    index_name,
    count_read,
    count_write
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL
AND count_read = 0
AND object_schema NOT IN ('mysql', 'performance_schema', 'sys')
ORDER BY object_schema, object_name;
```

```sql
-- Find the most used indexes by read operations
SELECT
    object_schema,
    object_name AS table_name,
    index_name,
    count_read,
    count_write,
    count_fetch,
    count_insert,
    count_update,
    count_delete
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL
AND object_schema NOT IN ('mysql', 'performance_schema', 'sys')
ORDER BY count_read DESC
LIMIT 20;
```

## 4. Detecting and Removing Unused Indexes

Unused indexes are a hidden cost. They consume disk space, slow down INSERT/UPDATE/DELETE operations, and complicate maintenance. Remove them after verifying they truly have no value.

### Safe Removal Process

Before dropping an index, confirm it has been unused for a meaningful period. A week of production traffic is a reasonable baseline.

```sql
-- PostgreSQL: Reset statistics to start fresh tracking
SELECT pg_stat_reset();

-- Wait for representative traffic (at least a few days)
-- Then check index usage again
SELECT
    indexrelname AS index_name,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

For production systems, disable the index before dropping. This allows quick recovery if something breaks.

```sql
-- PostgreSQL 14+: Mark index as invalid (queries will not use it)
-- This is safer than immediate DROP
UPDATE pg_index
SET indisvalid = false
WHERE indexrelid = 'idx_orders_legacy'::regclass;

-- Monitor for issues over a few days
-- If everything is fine, drop the index
DROP INDEX CONCURRENTLY idx_orders_legacy;
```

### MySQL Index Removal

MySQL 8.0+ supports invisible indexes, which is the safest way to test removal.

```sql
-- Make the index invisible (optimizer will ignore it)
ALTER TABLE orders ALTER INDEX idx_orders_legacy INVISIBLE;

-- Monitor application performance for several days
-- If no issues, drop the index
DROP INDEX idx_orders_legacy ON orders;

-- If problems occur, restore visibility immediately
ALTER TABLE orders ALTER INDEX idx_orders_legacy VISIBLE;
```

## 5. Designing Covering Indexes

A covering index contains all columns needed to satisfy a query. The database reads the answer directly from the index without touching the table. This eliminates random I/O and dramatically speeds up reads.

### Anatomy of a Covering Index

Consider this common query pattern.

```sql
-- Query to optimize
SELECT order_id, order_date, total_amount
FROM orders
WHERE customer_id = 12345
AND status = 'completed'
ORDER BY order_date DESC
LIMIT 10;
```

A basic index on `(customer_id, status)` helps filter rows but still requires table lookups for `order_id`, `order_date`, and `total_amount`.

A covering index includes all columns.

```sql
-- Covering index: all query columns in the index
CREATE INDEX idx_orders_covering ON orders (
    customer_id,          -- Filter column (high selectivity)
    status,               -- Filter column
    order_date DESC,      -- Sort column
    order_id,             -- Returned column
    total_amount          -- Returned column
);
```

### PostgreSQL: INCLUDE Clause

PostgreSQL 11+ supports the INCLUDE clause for covering indexes. Non-key columns are stored in the index but not used for sorting or uniqueness.

```sql
-- Better approach: use INCLUDE for non-key columns
CREATE INDEX idx_orders_covering ON orders (
    customer_id,
    status,
    order_date DESC
) INCLUDE (order_id, total_amount);
```

This keeps the index smaller while still covering the query. The INCLUDE columns are payload, not part of the B-tree structure.

### MySQL: Covering Index Verification

MySQL shows when an index covers a query through the "Using index" notation in EXPLAIN.

```sql
-- Create the covering index
CREATE INDEX idx_orders_covering ON orders (
    customer_id,
    status,
    order_date DESC,
    order_id,
    total_amount
);

-- Verify the query uses only the index
EXPLAIN SELECT order_id, order_date, total_amount
FROM orders
WHERE customer_id = 12345
AND status = 'completed'
ORDER BY order_date DESC
LIMIT 10;
```

Look for "Using index" in the Extra column. This confirms no table lookup occurs.

## 6. Column Order in Composite Indexes

Column order in composite indexes directly impacts which queries can use the index. The leftmost prefix rule governs this behavior.

### The Leftmost Prefix Rule

A composite index on `(a, b, c)` can satisfy queries filtering on:
- `a` alone
- `a AND b`
- `a AND b AND c`

It cannot efficiently satisfy queries filtering only on `b` or `c`.

```sql
-- Index on (customer_id, status, order_date)
CREATE INDEX idx_orders_composite ON orders (
    customer_id,
    status,
    order_date
);

-- These queries CAN use the index
SELECT * FROM orders WHERE customer_id = 100;
SELECT * FROM orders WHERE customer_id = 100 AND status = 'pending';
SELECT * FROM orders WHERE customer_id = 100 AND status = 'pending' AND order_date > '2025-01-01';

-- These queries CANNOT effectively use the index
SELECT * FROM orders WHERE status = 'pending';  -- Skips first column
SELECT * FROM orders WHERE order_date > '2025-01-01';  -- Skips first two columns
```

### Choosing Column Order

Follow these guidelines when ordering columns.

| Priority | Column Type | Reason |
|----------|-------------|--------|
| 1 | Equality conditions | Exact matches narrow the search fastest |
| 2 | Range conditions | Ranges limit how much the index can filter |
| 3 | ORDER BY columns | Avoids additional sorting step |
| 4 | SELECT columns | Enables covering index optimization |

Range conditions stop the index from being used for subsequent columns. Place them last among the filter columns.

```sql
-- Good: equality first, range last
CREATE INDEX idx_orders_good ON orders (
    status,           -- Equality: WHERE status = 'pending'
    customer_id,      -- Equality: WHERE customer_id = 100
    order_date        -- Range: WHERE order_date > '2025-01-01'
);

-- Bad: range column blocks customer_id filtering
CREATE INDEX idx_orders_bad ON orders (
    status,
    order_date,       -- Range condition here
    customer_id       -- This column is now useless for filtering
);
```

## 7. Index Maintenance and Bloat

Indexes degrade over time. Updates and deletes leave dead space. Regular maintenance keeps indexes efficient.

### PostgreSQL: Index Bloat Detection

PostgreSQL indexes accumulate bloat as rows are updated and deleted. Check bloat levels with this query.

```sql
-- Estimate index bloat percentage
WITH index_stats AS (
    SELECT
        nspname AS schema_name,
        relname AS table_name,
        indexrelname AS index_name,
        pg_relation_size(indexrelid) AS index_size,
        idx_scan AS index_scans
    FROM pg_stat_user_indexes
    JOIN pg_class ON pg_class.oid = indexrelid
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
)
SELECT
    schema_name,
    table_name,
    index_name,
    pg_size_pretty(index_size) AS size,
    index_scans
FROM index_stats
WHERE index_size > 10485760  -- Only indexes > 10MB
ORDER BY index_size DESC;
```

For precise bloat measurement, use the pgstattuple extension.

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS pgstattuple;

-- Check specific index bloat
SELECT
    avg_leaf_density,
    leaf_fragmentation
FROM pgstatindex('idx_orders_customer_id');
```

Leaf density below 70% or fragmentation above 20% indicates the index needs rebuilding.

### Rebuilding Indexes

Rebuild bloated indexes using REINDEX or CREATE INDEX CONCURRENTLY.

```sql
-- PostgreSQL: Rebuild index without locking reads
REINDEX INDEX CONCURRENTLY idx_orders_customer_id;

-- Alternative: Create new index, drop old one
CREATE INDEX CONCURRENTLY idx_orders_customer_id_new ON orders (customer_id);
DROP INDEX idx_orders_customer_id;
ALTER INDEX idx_orders_customer_id_new RENAME TO idx_orders_customer_id;
```

### MySQL: OPTIMIZE TABLE

MySQL handles index maintenance through OPTIMIZE TABLE for InnoDB.

```sql
-- Rebuild table and indexes (locks table briefly)
OPTIMIZE TABLE orders;

-- For large tables, use pt-online-schema-change from Percona Toolkit
-- This avoids extended locks
```

## 8. Balancing Read and Write Performance

Every index speeds up reads but slows down writes. Finding the right balance depends on your workload.

### Measuring Write Impact

Track how indexes affect write performance by monitoring INSERT/UPDATE/DELETE latency.

```sql
-- PostgreSQL: Check index maintenance overhead
SELECT
    relname AS table_name,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows
FROM pg_stat_user_tables
WHERE relname = 'orders';
```

### Index Count Guidelines

Use this table as a rough guide for index counts.

| Workload Type | Suggested Max Indexes | Reasoning |
|---------------|----------------------|-----------|
| Read-heavy (90%+ reads) | 8-12 per table | Reads benefit, writes are rare |
| Balanced | 4-6 per table | Compromise between read and write |
| Write-heavy (70%+ writes) | 2-3 per table | Minimize write amplification |
| OLTP high-volume | 3-5 per table | Keep latency predictable |

### Partial Indexes for Write Reduction

Partial indexes index only rows matching a condition. They reduce index size and write overhead.

```sql
-- PostgreSQL: Index only active orders
CREATE INDEX idx_orders_active ON orders (customer_id, order_date)
WHERE status = 'active';

-- This index is smaller and only updated for active orders
-- Queries filtering on status = 'active' get the same benefit
```

```sql
-- MySQL: No native partial indexes, but filtered with generated columns
ALTER TABLE orders ADD COLUMN is_active TINYINT
    GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN 1 ELSE NULL END);

CREATE INDEX idx_orders_active ON orders (is_active, customer_id, order_date);
```

## 9. Monitoring Index Performance Over Time

Index optimization is not a one-time task. Set up ongoing monitoring to catch regressions.

### Key Metrics to Track

Build dashboards tracking these index health metrics.

```sql
-- PostgreSQL: Index hit rate (should be > 99%)
SELECT
    sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0) * 100
    AS index_hit_rate
FROM pg_statio_user_indexes;

-- Table hit rate for comparison
SELECT
    sum(heap_blks_hit) / nullif(sum(heap_blks_hit + heap_blks_read), 0) * 100
    AS table_hit_rate
FROM pg_statio_user_tables;
```

### Automated Alerts

Set alerts for these conditions:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Index hit rate drop | Below 95% | Investigate memory pressure |
| New sequential scans | On large tables (>100k rows) | Check for missing indexes |
| Index bloat | Above 30% | Schedule maintenance |
| Unused index age | 30+ days unused | Evaluate for removal |

```sql
-- PostgreSQL: Find recent sequential scans on large tables
SELECT
    schemaname,
    relname AS table_name,
    seq_scan,
    seq_tup_read,
    idx_scan,
    n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE n_live_tup > 100000
AND seq_scan > idx_scan
ORDER BY seq_tup_read DESC;
```

## 10. Practical Index Optimization Workflow

Here is a repeatable workflow for index optimization.

### Step 1: Gather Data

Collect slow query logs and index statistics for at least one week.

```sql
-- Create a snapshot of current index usage
CREATE TABLE index_usage_snapshot AS
SELECT
    now() AS snapshot_time,
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan,
    idx_tup_read,
    pg_relation_size(indexrelid) AS index_size
FROM pg_stat_user_indexes;
```

### Step 2: Identify Candidates

Find the queries and indexes that need attention.

```sql
-- Queries needing indexes (high execution time, sequential scans)
-- From pg_stat_statements
SELECT
    query,
    calls,
    mean_exec_time,
    rows
FROM pg_stat_statements
WHERE query ILIKE '%FROM orders%'
AND mean_exec_time > 100
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Step 3: Design and Test

Create indexes in a staging environment first. Verify with EXPLAIN ANALYZE.

```sql
-- Test the new index impact
EXPLAIN (ANALYZE, BUFFERS)
SELECT order_id, order_date, total_amount
FROM orders
WHERE customer_id = 12345
AND status = 'completed'
ORDER BY order_date DESC
LIMIT 10;

-- Compare before and after metrics:
-- Execution time, buffer hits, rows examined
```

### Step 4: Deploy and Monitor

Deploy indexes to production during low-traffic periods. Use CONCURRENTLY to avoid locks.

```sql
-- Create index without blocking writes
CREATE INDEX CONCURRENTLY idx_orders_new ON orders (
    customer_id,
    status,
    order_date DESC
) INCLUDE (order_id, total_amount);

-- Monitor the index creation progress
SELECT
    pid,
    phase,
    blocks_total,
    blocks_done,
    tuples_total,
    tuples_done
FROM pg_stat_progress_create_index;
```

### Step 5: Validate Results

After deployment, confirm the optimization achieved its goals.

```sql
-- Compare query performance before and after
-- Run the same queries and compare execution plans
-- Check that index scans replaced sequential scans
-- Verify latency improvements in application metrics
```

---

Index optimization is a cycle of measurement, analysis, and incremental improvement. Start with your slowest queries. Use execution plans to understand the bottlenecks. Design indexes that match your query patterns. Remove indexes that no longer serve a purpose. Monitor continuously and repeat. The result is a database that stays fast as data grows and query patterns evolve.
