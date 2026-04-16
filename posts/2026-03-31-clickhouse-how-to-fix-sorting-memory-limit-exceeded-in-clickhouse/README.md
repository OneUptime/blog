# How to Fix 'Sorting memory limit exceeded' in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Sorting, Memory, Query Optimization, Troubleshooting

Description: Fix ClickHouse 'Sorting memory limit exceeded' errors by enabling external sort, reducing sort key cardinality, and rewriting ORDER BY queries.

---

## Understanding the Error

ClickHouse raises this error when an ORDER BY operation consumes more memory than the configured sort buffer:

```text
DB::Exception: Sorting memory limit exceeded: would use 15.00 GiB, maximum: 10.00 GiB. (MEMORY_LIMIT_EXCEEDED)
```

Sorting is memory-intensive because ClickHouse must hold all rows being sorted in RAM simultaneously unless external sort is enabled.

## Diagnosing the Issue

```sql
-- Find queries that recently exceeded sort memory
SELECT
    query_id,
    user,
    formatReadableSize(memory_usage) AS peak_mem,
    query_duration_ms,
    left(query, 300) AS query_preview
FROM system.query_log
WHERE exception LIKE '%MEMORY_LIMIT_EXCEEDED%'
  AND event_time > now() - INTERVAL 24 HOUR
ORDER BY memory_usage DESC
LIMIT 10;
```

## Fix 1 - Enable External Sort (Spill to Disk)

The most direct fix is to allow ClickHouse to spill sort data to disk:

```sql
-- Allow up to 10 GB of sort data to spill to disk
SET max_bytes_before_external_sort = 10000000000;

-- Now run the sort-heavy query
SELECT user_id, count() AS events, sum(revenue) AS total_revenue
FROM analytics.transactions
GROUP BY user_id
ORDER BY total_revenue DESC
LIMIT 1000;
```

Set this permanently in `users.xml`:

```xml
<profiles>
  <default>
    <max_bytes_before_external_sort>10000000000</max_bytes_before_external_sort>
  </default>
</profiles>
```

## Fix 2 - Use LIMIT to Reduce Sort Work

If you only need the top N rows, ClickHouse can use a partial sort:

```sql
-- Instead of sorting everything:
SELECT user_id, sum(revenue) AS total
FROM analytics.sales
GROUP BY user_id
ORDER BY total DESC;

-- Sort only what you need:
SELECT user_id, sum(revenue) AS total
FROM analytics.sales
GROUP BY user_id
ORDER BY total DESC
LIMIT 100;
```

ClickHouse uses a partial sort algorithm for ORDER BY + LIMIT that keeps only N rows in memory.

## Fix 3 - Pre-Sort Data at Ingestion Time

If you frequently sort by the same column, store data pre-sorted:

```sql
-- Align the ORDER BY (sort key) with your common query sort order
CREATE TABLE analytics.sales (
    sale_date Date,
    region String,
    revenue Float64
)
ENGINE = MergeTree()
ORDER BY (sale_date, region, revenue);

-- This query now needs no extra sorting
SELECT sale_date, region, revenue
FROM analytics.sales
WHERE sale_date >= '2024-01-01'
ORDER BY sale_date, region;
```

## Fix 4 - Add a Projection for Common Sort Orders

```sql
-- Create a projection with the desired sort order
ALTER TABLE analytics.sales
ADD PROJECTION revenue_by_region
(
    SELECT *
    ORDER BY (region, sale_date)
);

ALTER TABLE analytics.sales MATERIALIZE PROJECTION revenue_by_region;

-- Queries sorted by region now use the projection without extra in-memory sorting
SELECT region, sale_date, revenue
FROM analytics.sales
ORDER BY region, sale_date;
```

## Fix 5 - Reduce Result Set Before Sorting

```sql
-- Pre-aggregate before sorting to reduce row count
WITH agg AS (
    SELECT
        user_id,
        sum(revenue) AS total_revenue,
        count() AS order_count
    FROM analytics.orders
    WHERE order_date >= '2024-01-01'
    GROUP BY user_id
)
SELECT *
FROM agg
ORDER BY total_revenue DESC
LIMIT 500;
```

## Monitoring Sort Memory Usage

```sql
-- Check sort-related memory metrics
SELECT metric, value
FROM system.metrics
WHERE metric LIKE '%Sort%';

-- Monitor memory tracking over time in metric_log
SELECT
    event_time,
    CurrentMetric_MemoryTracking AS memory_tracking
FROM system.metric_log
ORDER BY event_time DESC
LIMIT 100;
```

## Summary

"Sorting memory limit exceeded" in ClickHouse occurs when ORDER BY operations on large result sets exhaust available RAM. Enable external sort with `max_bytes_before_external_sort` as an immediate fix, and use `LIMIT` to leverage partial sorting for top-N queries. For recurring sort patterns, align the table's ORDER BY key with your most common sort columns or create projections, eliminating in-memory sorting entirely.
