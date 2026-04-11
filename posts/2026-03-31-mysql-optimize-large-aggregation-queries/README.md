# How to Optimize Large Aggregation Queries in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Aggregation, Query Optimization, Index

Description: Learn techniques to optimize slow GROUP BY and aggregation queries in MySQL using covering indexes, partitioning, summary tables, and configuration tuning.

---

## Why Aggregations Are Slow

`GROUP BY`, `SUM`, `COUNT`, and `AVG` across millions of rows force MySQL to read, sort, and hash large amounts of data. The main causes of slow aggregation queries are missing indexes, large buffer overflows to disk, and unnecessary column reads.

## Diagnose First with EXPLAIN

```sql
EXPLAIN
SELECT region, DATE_FORMAT(sale_date, '%Y-%m') AS month, SUM(revenue)
FROM fact_sales
WHERE sale_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY region, month;
```

Look for:
- `type: ALL` - full table scan, needs an index
- `Extra: Using filesort` - extra sort pass needed, may spill to disk
- `Extra: Using temporary` - temp table created, may need more memory

## Add Covering Indexes

A covering index includes all columns referenced by the query (filter, group, and select) so MySQL never touches the data rows:

```sql
-- Without this index: full table scan + filesort
-- With this index: index-only scan
ALTER TABLE fact_sales
  ADD INDEX idx_cover_agg (sale_date, region, revenue);

-- Verify: Extra should show "Using index"
EXPLAIN SELECT region, SUM(revenue)
FROM fact_sales
WHERE sale_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY region;
```

## Use Table Partitioning

Partition the fact table by date range so aggregation queries only scan relevant partitions:

```sql
ALTER TABLE fact_sales
  PARTITION BY RANGE (YEAR(sale_date) * 100 + MONTH(sale_date)) (
    PARTITION p202501 VALUES LESS THAN (202502),
    PARTITION p202502 VALUES LESS THAN (202503),
    PARTITION p202503 VALUES LESS THAN (202504),
    PARTITION p_future VALUES LESS THAN MAXVALUE
  );

-- Verify partition pruning
EXPLAIN PARTITIONS
SELECT SUM(revenue)
FROM fact_sales
WHERE sale_date BETWEEN '2025-01-01' AND '2025-01-31';
```

## Tune Memory Buffers

When aggregation data does not fit in memory, MySQL writes temporary results to disk, which is slow. Increase relevant buffers in `my.cnf`:

```ini
[mysqld]
# Allow larger sort operations in memory
sort_buffer_size       = 32M
# Allow larger GROUP BY hash tables in memory
tmp_table_size         = 256M
max_heap_table_size    = 256M
# Increase InnoDB buffer pool to cache index pages
innodb_buffer_pool_size = 8G
```

## Rewrite with Pre-Aggregated Tables

For frequently run reports, maintain a summary table and query it instead:

```sql
-- Pre-aggregated daily summary
CREATE TABLE summary_daily_sales (
  sale_date    DATE          NOT NULL,
  region       VARCHAR(50)   NOT NULL,
  total_revenue DECIMAL(14,2) NOT NULL,
  order_count   INT          NOT NULL,
  PRIMARY KEY (sale_date, region)
) ENGINE=InnoDB;

-- Report from summary table - instant, no scan of fact table needed
SELECT
  DATE_FORMAT(sale_date, '%Y-%m') AS month,
  region,
  SUM(total_revenue)              AS revenue
FROM summary_daily_sales
WHERE sale_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY month, region;
```

## Use CTEs to Stage Intermediate Aggregations

Break complex multi-level aggregations into CTEs to avoid repeating expensive subqueries:

```sql
WITH daily AS (
  SELECT sale_date, region, SUM(revenue) AS day_revenue
  FROM fact_sales
  WHERE sale_date BETWEEN '2025-01-01' AND '2025-12-31'
  GROUP BY sale_date, region
),
monthly AS (
  SELECT DATE_FORMAT(sale_date, '%Y-%m') AS month, region,
         SUM(day_revenue) AS month_revenue
  FROM daily
  GROUP BY month, region
)
SELECT month, region, month_revenue,
       SUM(month_revenue) OVER (PARTITION BY region ORDER BY month) AS cumulative
FROM monthly
ORDER BY region, month;
```

## Check the Slow Query Log

```sql
-- Enable slow query log to identify expensive aggregation queries
SET GLOBAL slow_query_log    = ON;
SET GLOBAL long_query_time   = 2;  -- log queries over 2 seconds
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

## Summary

Optimizing large aggregation queries in MySQL requires a combination of covering indexes, table partitioning, memory buffer tuning, and pre-aggregated summary tables. Always start with EXPLAIN to identify the bottleneck before changing indexes or configuration. For queries that run on a schedule, a summary table refresh is almost always faster than scanning the full fact table.
