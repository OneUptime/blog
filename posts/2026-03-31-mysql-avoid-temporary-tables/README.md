# How to Avoid Using Temporary Tables in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Index, Performance, Optimization

Description: Learn how to eliminate Using temporary in MySQL EXPLAIN output by adding indexes for GROUP BY and DISTINCT, rewriting UNION queries, and restructuring aggregations.

---

## What Causes Temporary Tables?

MySQL creates internal temporary tables when it cannot process a query in a single pass. The most common causes are:

- `GROUP BY` on a column without an index
- `DISTINCT` on multiple columns without an index
- `UNION` (without ALL) - needs deduplication
- `ORDER BY` with a different sort order than the GROUP BY
- Subqueries that produce intermediate result sets
- Certain JOIN patterns with ORDER BY

`EXPLAIN` reveals this with `Extra: Using temporary`.

## Indexing GROUP BY Columns

The most common fix is adding an index on the GROUP BY column:

```sql
EXPLAIN SELECT category, COUNT(*) FROM products GROUP BY category;
-- Extra: Using temporary; Using filesort

CREATE INDEX idx_category ON products(category);

EXPLAIN SELECT category, COUNT(*) FROM products GROUP BY category;
-- Extra: Using index (temporary table eliminated)
```

MySQL reads the index in sorted order and groups adjacent equal values without creating a temporary table.

## Composite Index for WHERE + GROUP BY

```sql
-- Filter by status, group by region
EXPLAIN SELECT region, COUNT(*) FROM orders
WHERE status = 'shipped'
GROUP BY region;
-- Extra: Using where; Using temporary; Using filesort

CREATE INDEX idx_status_region ON orders(status, region);

EXPLAIN SELECT region, COUNT(*) FROM orders
WHERE status = 'shipped'
GROUP BY region;
-- Extra: Using index (no temp table)
```

## DISTINCT Without an Index

```sql
EXPLAIN SELECT DISTINCT country FROM customers;
-- Extra: Using temporary

CREATE INDEX idx_country ON customers(country);

EXPLAIN SELECT DISTINCT country FROM customers;
-- Extra: Using index
```

## Replace UNION with UNION ALL

`UNION` requires deduplication, which needs a temporary table. If you know the sets do not overlap (or duplicates are acceptable), use `UNION ALL`:

```sql
-- UNION: creates temporary table for deduplication
EXPLAIN
SELECT customer_id FROM orders WHERE region = 'east'
UNION
SELECT customer_id FROM orders WHERE status = 'new';
-- Extra: Using temporary

-- UNION ALL: no deduplication, no temporary table
EXPLAIN
SELECT customer_id FROM orders WHERE region = 'east'
UNION ALL
SELECT customer_id FROM orders WHERE status = 'new';
-- No temporary table
```

## ORDER BY Different From GROUP BY

```sql
-- GROUP BY category, ORDER BY count - without index, needs temp table
EXPLAIN SELECT category, COUNT(*) AS cnt FROM products
GROUP BY category
ORDER BY cnt DESC;
-- Extra: Using temporary; Using filesort
```

Adding an index on the GROUP BY column enables streaming aggregation, eliminating the temporary table. A filesort remains for sorting by the aggregate:

```sql
CREATE INDEX idx_category ON products(category);

EXPLAIN SELECT category, COUNT(*) AS cnt FROM products
GROUP BY category
ORDER BY cnt DESC;
-- Extra: Using index; Using filesort (temporary table eliminated)
```

## Increase Temporary Table Size in Memory

When temporary tables cannot be avoided, keep them in memory:

```sql
-- Check current limits
SHOW VARIABLES LIKE 'tmp_table_size';
SHOW VARIABLES LIKE 'max_heap_table_size';

-- Increase for analytical queries
SET SESSION tmp_table_size = 134217728;       -- 128MB
SET SESSION max_heap_table_size = 134217728;  -- 128MB
```

Monitor disk spills:

```sql
SHOW GLOBAL STATUS LIKE 'Created_tmp_disk_tables';
SHOW GLOBAL STATUS LIKE 'Created_tmp_tables';
-- Ratio of disk to total should be very low (< 5%)
```

## Summary

Avoiding temporary tables in MySQL comes down to giving the optimizer an index it can use to process GROUP BY, DISTINCT, and UNION in a single sorted pass. Add indexes matching your GROUP BY columns (with equality WHERE columns first in composite indexes), replace UNION with UNION ALL when safe, and increase `tmp_table_size` when temporary tables are unavoidable. Use EXPLAIN to confirm `Using temporary` is eliminated after your changes.
