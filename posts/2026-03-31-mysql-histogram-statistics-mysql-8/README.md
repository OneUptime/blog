# How to Use Histogram Statistics in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Optimization, Statistics, Index

Description: Learn how MySQL 8.0 histogram statistics improve query optimizer decisions for columns with non-uniform data distributions.

---

## What Are Histogram Statistics?

The MySQL query optimizer uses statistics to estimate how many rows a query will return from each table. Traditionally, MySQL only tracked index statistics. For non-indexed columns, the optimizer made rough guesses about data distribution, leading to poor execution plans.

MySQL 8.0 introduced column histograms - statistical summaries of value distributions for specific columns. With histograms, the optimizer can make much better cardinality estimates for non-indexed columns, choosing more efficient join orders and access methods.

## Creating a Histogram

```sql
-- Create a histogram on a non-indexed column
ANALYZE TABLE orders UPDATE HISTOGRAM ON status;

-- Create histograms on multiple columns at once
ANALYZE TABLE orders UPDATE HISTOGRAM ON status, region, payment_method;

-- Specify the number of buckets (default: 100, max: 1024)
ANALYZE TABLE orders UPDATE HISTOGRAM ON status WITH 50 BUCKETS;
```

More buckets provide higher precision but use more memory. For a column with few distinct values (like `status`), fewer buckets are needed.

## Viewing Histogram Data

```sql
-- View histogram metadata from information_schema
SELECT
    COLUMN_NAME,
    HISTOGRAM->>'$."histogram-type"' AS type,
    HISTOGRAM->>'$."number-of-buckets-specified"' AS buckets,
    JSON_LENGTH(HISTOGRAM->>'$."buckets"') AS actual_buckets
FROM information_schema.COLUMN_STATISTICS
WHERE SCHEMA_NAME = 'myapp'
  AND TABLE_NAME = 'orders';

-- View the full histogram JSON
SELECT
    COLUMN_NAME,
    HISTOGRAM
FROM information_schema.COLUMN_STATISTICS
WHERE SCHEMA_NAME = 'myapp'
  AND TABLE_NAME = 'orders'
  AND COLUMN_NAME = 'status'\G
```

## Histogram Types

MySQL creates two types of histograms automatically:

- **Singleton histogram** - Used when the number of distinct values is less than or equal to the bucket count. Each bucket holds one distinct value and its frequency.
- **Equi-height histogram** - Used when distinct values exceed the bucket count. Each bucket covers a range of values with roughly equal row counts.

```sql
-- Check which type was created
SELECT
    COLUMN_NAME,
    HISTOGRAM->>'$."histogram-type"' AS histogram_type
FROM information_schema.COLUMN_STATISTICS
WHERE SCHEMA_NAME = 'myapp'
  AND TABLE_NAME = 'orders';
```

## Practical Example: Improving Query Plans

```sql
-- Sample data with skewed distribution
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50),
    user_id INT,
    created_at TIMESTAMP
);

-- Most rows are 'page_view', very few are 'purchase'
-- Without histogram, optimizer may not know this

-- Check plan before histogram
EXPLAIN SELECT * FROM events WHERE event_type = 'purchase';

-- Create histogram
ANALYZE TABLE events UPDATE HISTOGRAM ON event_type WITH 100 BUCKETS;

-- Check plan after histogram - rows estimate should be more accurate
EXPLAIN SELECT * FROM events WHERE event_type = 'purchase';
```

## Dropping Histograms

```sql
-- Drop a histogram for a specific column
ANALYZE TABLE orders DROP HISTOGRAM ON status;

-- Drop multiple histograms
ANALYZE TABLE orders DROP HISTOGRAM ON status, region;
```

## When to Use Histograms

Histograms are most beneficial for:
- Columns frequently used in `WHERE` clauses that are not indexed
- Columns with highly skewed value distributions
- Join columns without indexes where cardinality estimates affect join order

## Summary

Histogram statistics in MySQL 8.0 give the query optimizer accurate data distribution information for non-indexed columns. By creating histograms on frequently filtered columns - especially those with skewed distributions - you can eliminate bad execution plans caused by inaccurate row estimates, leading to faster queries without adding indexes.
