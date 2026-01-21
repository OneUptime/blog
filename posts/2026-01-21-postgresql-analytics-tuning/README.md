# How to Tune PostgreSQL for Analytics Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Analytics, OLAP, Performance Tuning, Data Warehouse, Parallel Query

Description: A comprehensive guide to tuning PostgreSQL for analytics and OLAP workloads, covering memory optimization, parallel query configuration, partitioning strategies, and query optimization for large scans and aggregations.

---

Analytics workloads differ significantly from OLTP - they involve large sequential scans, complex aggregations, and fewer concurrent users. This guide covers PostgreSQL optimizations for data warehousing and analytics use cases.

## Prerequisites

- PostgreSQL 14+ installed
- Large dataset for analytics
- Understanding of your query patterns
- Sufficient hardware resources

## Analytics Workload Characteristics

| Characteristic | Analytics/OLAP Pattern |
|---------------|------------------------|
| Queries | Complex, multi-table joins |
| Data Access | Sequential scans, full table reads |
| Aggregations | Heavy (GROUP BY, SUM, COUNT) |
| Concurrency | Low (few users, heavy queries) |
| Latency | Tolerant (seconds to minutes) |
| Data Volume | Large per query |

## Memory Configuration

### shared_buffers

For analytics, shared_buffers still matters but differently:

```conf
# postgresql.conf

# Analytics: 25% of RAM (same as OLTP)
# But OS cache is more important for large scans
shared_buffers = 8GB  # For 32GB system
```

### effective_cache_size

Critical for analytics query planning:

```conf
# Total memory available for caching
# Typically 75-80% of total RAM
effective_cache_size = 24GB  # For 32GB system
```

### work_mem

Much higher for analytics - complex sorts and aggregations:

```conf
# Analytics: Can be much higher since fewer concurrent queries
# Formula: (RAM - shared_buffers) / max_concurrent_queries / 2
work_mem = 1GB  # For complex analytics queries

# Session-specific for heavy queries
SET work_mem = '2GB';
```

### maintenance_work_mem

Higher for faster index creation and VACUUM:

```conf
maintenance_work_mem = 2GB
```

### hash_mem_multiplier

Allow more memory for hash operations:

```conf
# PostgreSQL 13+
hash_mem_multiplier = 2.0  # Default is 2.0, can increase for analytics
```

## Parallel Query Configuration

Parallel queries are essential for analytics:

### Enable Parallel Execution

```conf
# postgresql.conf

# Maximum parallel workers system-wide
max_parallel_workers = 8  # Match CPU cores

# Workers per query
max_parallel_workers_per_gather = 4  # Half of max_parallel_workers

# Parallel maintenance operations
max_parallel_maintenance_workers = 4

# Background workers
max_worker_processes = 16
```

### Parallel Query Thresholds

```conf
# Lower thresholds to enable parallel for more queries
min_parallel_table_scan_size = 8MB   # Default: 8MB
min_parallel_index_scan_size = 512kB  # Default: 512kB

# Parallel cost settings
parallel_setup_cost = 1000    # Default: 1000
parallel_tuple_cost = 0.01    # Default: 0.01
```

### Verify Parallel Execution

```sql
-- Check if parallel query is used
EXPLAIN (ANALYZE, BUFFERS)
SELECT customer_region, SUM(amount), COUNT(*)
FROM orders
WHERE order_date >= '2025-01-01'
GROUP BY customer_region;

-- Look for:
-- Gather (or Gather Merge)
--   Workers Planned: 4
--   Workers Launched: 4
```

## Planner Configuration

### Cost Settings for Analytics

```conf
# Favor sequential scans (common in analytics)
seq_page_cost = 1.0
random_page_cost = 1.1  # Lower for SSD

# Favor hash joins and aggregations
enable_hashjoin = on
enable_hashagg = on
enable_material = on

# Effective I/O concurrency for SSD
effective_io_concurrency = 200

# Enable JIT compilation for complex queries
jit = on
jit_above_cost = 100000
jit_inline_above_cost = 500000
jit_optimize_above_cost = 500000
```

### Statistics for Better Plans

```conf
# Increase statistics target for better estimates
default_statistics_target = 500  # Default: 100
```

```sql
-- Per-column statistics for important columns
ALTER TABLE orders ALTER COLUMN order_date SET STATISTICS 1000;
ALTER TABLE orders ALTER COLUMN customer_region SET STATISTICS 1000;
ANALYZE orders;
```

### Extended Statistics

```sql
-- Create extended statistics for correlated columns
CREATE STATISTICS orders_stats (dependencies, mcv)
ON customer_region, product_category FROM orders;

ANALYZE orders;
```

## Table Partitioning

Essential for analytics on large tables:

### Range Partitioning by Date

```sql
-- Create partitioned table
CREATE TABLE events (
    id BIGSERIAL,
    event_type VARCHAR(50),
    event_data JSONB,
    created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE events_2024 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE events_2025 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE events_2026 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Create indexes on partitions
CREATE INDEX idx_events_2024_type ON events_2024(event_type);
CREATE INDEX idx_events_2025_type ON events_2025(event_type);
CREATE INDEX idx_events_2026_type ON events_2026(event_type);
```

### Partition Pruning

```conf
# Enable partition pruning (default: on)
enable_partition_pruning = on
```

```sql
-- Query automatically uses only relevant partitions
EXPLAIN SELECT COUNT(*) FROM events
WHERE created_at >= '2025-06-01' AND created_at < '2025-07-01';

-- Shows only events_2025 partition scanned
```

### List Partitioning

```sql
-- Partition by region
CREATE TABLE sales (
    id BIGSERIAL,
    region VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2),
    sale_date DATE
) PARTITION BY LIST (region);

CREATE TABLE sales_north PARTITION OF sales FOR VALUES IN ('north');
CREATE TABLE sales_south PARTITION OF sales FOR VALUES IN ('south');
CREATE TABLE sales_east PARTITION OF sales FOR VALUES IN ('east');
CREATE TABLE sales_west PARTITION OF sales FOR VALUES IN ('west');
```

## Indexing for Analytics

### BRIN Indexes

Best for large tables with natural ordering:

```sql
-- BRIN index for time-series data
CREATE INDEX idx_events_created_brin ON events USING BRIN(created_at);

-- Much smaller than B-tree, good for sequential data
-- Check size comparison
SELECT pg_size_pretty(pg_relation_size('idx_events_created_brin'));
```

### Covering Indexes

Avoid table lookups for common aggregations:

```sql
-- Covering index for common analytics query
CREATE INDEX idx_orders_analytics ON orders(order_date, customer_region)
INCLUDE (amount, quantity);

-- Query can use index-only scan
SELECT customer_region, SUM(amount), SUM(quantity)
FROM orders
WHERE order_date >= '2025-01-01'
GROUP BY customer_region;
```

### Expression Indexes

```sql
-- Index on extracted date for date-based aggregations
CREATE INDEX idx_orders_year_month ON orders(
    DATE_TRUNC('month', order_date)
);

-- Query uses the index
SELECT DATE_TRUNC('month', order_date) AS month, SUM(amount)
FROM orders
GROUP BY DATE_TRUNC('month', order_date);
```

## Query Optimization

### Materialized Views

Pre-compute expensive aggregations:

```sql
-- Create materialized view for daily sales summary
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT
    DATE(order_date) AS sale_date,
    customer_region,
    product_category,
    COUNT(*) AS order_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount
FROM orders
GROUP BY DATE(order_date), customer_region, product_category;

-- Create indexes on materialized view
CREATE INDEX idx_daily_sales_date ON daily_sales_summary(sale_date);
CREATE INDEX idx_daily_sales_region ON daily_sales_summary(customer_region);

-- Refresh periodically
REFRESH MATERIALIZED VIEW daily_sales_summary;

-- Concurrent refresh (doesn't block reads)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;
```

### Common Table Expressions (CTEs)

```sql
-- Use CTEs for complex analytics
WITH regional_totals AS (
    SELECT
        customer_region,
        SUM(amount) AS region_total
    FROM orders
    WHERE order_date >= '2025-01-01'
    GROUP BY customer_region
),
overall_total AS (
    SELECT SUM(region_total) AS grand_total FROM regional_totals
)
SELECT
    r.customer_region,
    r.region_total,
    ROUND(100.0 * r.region_total / o.grand_total, 2) AS percentage
FROM regional_totals r, overall_total o
ORDER BY r.region_total DESC;
```

### Window Functions

Efficient for running totals and rankings:

```sql
-- Running totals and rankings
SELECT
    order_date,
    customer_region,
    amount,
    SUM(amount) OVER (
        PARTITION BY customer_region
        ORDER BY order_date
    ) AS running_total,
    RANK() OVER (
        PARTITION BY customer_region
        ORDER BY amount DESC
    ) AS amount_rank
FROM orders
WHERE order_date >= '2025-01-01';
```

## Columnar Storage with Extensions

### Citus Columnar (if using Citus)

```sql
-- Convert to columnar storage
SELECT alter_table_set_access_method('events_2024', 'columnar');

-- Better compression for analytics
ALTER TABLE events_2024 SET (
    columnar.compression = zstd,
    columnar.stripe_row_limit = 150000,
    columnar.chunk_group_row_limit = 10000
);
```

### Table Compression

```sql
-- Use TOAST compression
ALTER TABLE events ALTER COLUMN event_data SET STORAGE EXTENDED;

-- Check compression
SELECT
    relname,
    pg_size_pretty(pg_relation_size(oid)) AS table_size,
    pg_size_pretty(pg_total_relation_size(oid)) AS total_size
FROM pg_class
WHERE relname = 'events';
```

## Checkpoint and WAL for Analytics

### Reduce Checkpoint Impact

```conf
# Longer checkpoint intervals for batch loads
checkpoint_timeout = 30min
max_wal_size = 16GB
min_wal_size = 4GB

# Spread I/O
checkpoint_completion_target = 0.9
```

### Bulk Load Optimization

```conf
# During bulk loads, can temporarily set:
# (Reset after load completes)
synchronous_commit = off
wal_level = minimal
max_wal_senders = 0
```

```sql
-- Use COPY for fast bulk loading
COPY events FROM '/path/to/data.csv' WITH (FORMAT csv, HEADER true);

-- Or from program
COPY events FROM PROGRAM 'zcat /path/to/data.csv.gz' WITH (FORMAT csv);
```

## Complete Analytics Configuration

```conf
# postgresql.conf - Analytics/OLAP optimized for 64GB RAM server

# Memory
shared_buffers = 16GB
effective_cache_size = 48GB
work_mem = 1GB
maintenance_work_mem = 2GB
hash_mem_multiplier = 2.0
huge_pages = try

# Connections (fewer for analytics)
max_connections = 50
superuser_reserved_connections = 3

# Parallel Query
max_parallel_workers = 16
max_parallel_workers_per_gather = 8
max_parallel_maintenance_workers = 4
max_worker_processes = 20
min_parallel_table_scan_size = 8MB
min_parallel_index_scan_size = 512kB

# Planner
default_statistics_target = 500
random_page_cost = 1.1
seq_page_cost = 1.0
effective_io_concurrency = 200
enable_partition_pruning = on

# JIT
jit = on
jit_above_cost = 100000
jit_inline_above_cost = 500000
jit_optimize_above_cost = 500000

# Checkpoints
checkpoint_timeout = 30min
checkpoint_completion_target = 0.9
max_wal_size = 16GB
min_wal_size = 4GB

# WAL
wal_buffers = 64MB
wal_compression = on

# Autovacuum (less aggressive for analytics)
autovacuum = on
autovacuum_max_workers = 2
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05

# Logging
log_min_duration_statement = 5000
log_checkpoints = on
```

## Monitoring Analytics Queries

### Query Progress

```sql
-- PostgreSQL 12+ progress monitoring
SELECT
    pid,
    datname,
    query,
    state,
    wait_event_type,
    wait_event,
    query_start,
    NOW() - query_start AS duration
FROM pg_stat_activity
WHERE state = 'active'
AND query NOT LIKE '%pg_stat_activity%';
```

### Check Parallel Workers

```sql
-- See active parallel workers
SELECT
    pid,
    leader_pid,
    query,
    state
FROM pg_stat_activity
WHERE leader_pid IS NOT NULL;
```

### Monitor Resource Usage

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top resource-consuming queries
SELECT
    substring(query, 1, 80) AS query,
    calls,
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    ROUND(mean_exec_time::numeric, 2) AS mean_ms,
    rows,
    shared_blks_hit + shared_blks_read AS total_blks
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

## Best Practices

1. **Partition large tables** - Essential for analytics at scale
2. **Use parallel queries** - Configure workers appropriately
3. **Create materialized views** - Pre-compute common aggregations
4. **Use BRIN indexes** - Ideal for time-series analytics
5. **Increase work_mem** - Avoid disk sorts
6. **Schedule heavy queries** - Run during off-peak hours
7. **Monitor query plans** - Use EXPLAIN ANALYZE regularly

## Conclusion

PostgreSQL analytics tuning focuses on:

1. **Higher work_mem** for in-memory sorts and aggregations
2. **Parallel query** configuration for multi-core utilization
3. **Partitioning** for efficient data management
4. **Appropriate indexes** (BRIN for sequential data)
5. **Materialized views** for pre-computed results
6. **JIT compilation** for complex expressions

Balance these settings based on your specific analytics workload patterns and available hardware resources.
