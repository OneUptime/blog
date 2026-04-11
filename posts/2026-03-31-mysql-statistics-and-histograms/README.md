# How MySQL Statistics and Histograms Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Statistics, Histogram, Query Optimizer

Description: Understand how MySQL collects table statistics and histogram data to drive query optimization, and how to update or inspect them for better query plans.

---

## Overview

The MySQL query optimizer relies on statistics to estimate row counts, choose index access paths, and decide join order. Stale or missing statistics lead to bad execution plans and slow queries. MySQL 8.0 introduced column histograms to improve estimates for non-indexed columns.

## Index Statistics

MySQL automatically maintains index statistics via `ANALYZE TABLE`. These are stored in the data dictionary and used by the optimizer.

```sql
-- Update statistics for a table
ANALYZE TABLE orders;

-- View index statistics
SELECT table_name, index_name, seq_in_index,
       column_name, cardinality
FROM information_schema.statistics
WHERE table_schema = 'mydb'
  AND table_name   = 'orders';
```

`cardinality` is an estimate of unique values in the index. The optimizer uses it to decide if an index scan is cheaper than a full table scan.

## InnoDB Persistent Statistics

InnoDB stores statistics persistently so they survive restarts. Two key tables hold this data:

```sql
SELECT * FROM mysql.innodb_table_stats WHERE table_name = 'orders';
SELECT * FROM mysql.innodb_index_stats WHERE table_name = 'orders';
```

Key variables that control how statistics are gathered:

```sql
SHOW VARIABLES LIKE 'innodb_stats_persistent%';
-- innodb_stats_persistent            = ON
-- innodb_stats_persistent_sample_pages = 20  (pages sampled per index)
```

A higher sample page count produces more accurate cardinality estimates but takes longer to compute.

```text
[mysqld]
innodb_stats_persistent              = ON
innodb_stats_persistent_sample_pages = 50
innodb_stats_auto_recalc             = ON
```

## Column Histograms (MySQL 8.0+)

Histograms capture the data distribution of a column without requiring an index. They are stored in `information_schema.column_statistics` and are created manually.

```sql
-- Create a histogram with 100 buckets on a non-indexed column
ANALYZE TABLE orders UPDATE HISTOGRAM ON status WITH 100 BUCKETS;

-- Inspect the histogram
SELECT column_name,
       histogram->>'$."histogram-type"' AS type,
       JSON_LENGTH(histogram->'$."buckets"') AS bucket_count
FROM information_schema.column_statistics
WHERE table_name = 'orders';
```

Two histogram types exist:
- **singleton** - each bucket holds one distinct value (low-cardinality columns).
- **equi-height** - buckets cover ranges of values (high-cardinality columns).

## How the Optimizer Uses Histograms

Without a histogram, the optimizer assumes uniform distribution. With a histogram, it can detect skewed distributions and avoid plans that scan millions of rows for a rare value.

```sql
-- Before histogram: optimizer may choose full scan
EXPLAIN SELECT * FROM orders WHERE status = 'CANCELLED';

-- After histogram: optimizer gets accurate row estimate
ANALYZE TABLE orders UPDATE HISTOGRAM ON status WITH 50 BUCKETS;
EXPLAIN SELECT * FROM orders WHERE status = 'CANCELLED';
```

## Dropping Histograms

```sql
ANALYZE TABLE orders DROP HISTOGRAM ON status;
```

## Triggering Manual Statistics Refresh

If rows change significantly after a bulk load or delete, trigger a refresh:

```sql
ANALYZE TABLE orders;
-- If using non-persistent statistics (innodb_stats_persistent = OFF),
-- you can also enable automatic refresh on metadata queries:
SET GLOBAL innodb_stats_on_metadata = ON;
```

## Summary

MySQL uses index cardinality and column histograms to guide the query optimizer. Index statistics are automatically maintained by InnoDB but can be tuned with `innodb_stats_persistent_sample_pages`. Histograms, introduced in MySQL 8.0, provide distribution information for non-indexed columns, enabling the optimizer to generate accurate row estimates for skewed data and choose better execution plans.
