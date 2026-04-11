# How to Optimize GROUP BY Performance in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Index, Optimization, Performance

Description: Learn how to optimize MySQL GROUP BY queries by eliminating temporary tables and filesort through proper indexing, covering indexes, and query rewrites.

---

## Why GROUP BY Queries Can Be Slow

GROUP BY requires MySQL to collect rows into groups and compute aggregates for each group. Without an index, MySQL must scan all rows, create a temporary table to hold intermediate results, and then sort the temporary table. EXPLAIN shows this as `Using temporary; Using filesort`.

## Detecting Slow GROUP BY with EXPLAIN

```sql
EXPLAIN SELECT department, COUNT(*) FROM employees GROUP BY department;
```

```text
type: ALL, key: NULL, rows: 50000, Extra: Using temporary; Using filesort
```

This is the worst-case GROUP BY plan. MySQL scans 50,000 rows, creates a temp table, then sorts it.

## Fix: Index the GROUP BY Column

```sql
CREATE INDEX idx_department ON employees(department);

EXPLAIN SELECT department, COUNT(*) FROM employees GROUP BY department;
-- type: index, key: idx_department, Extra: Using index
```

`Using index` means MySQL reads the index in sorted order and groups adjacent matching values without a temporary table.

## Composite Index for WHERE + GROUP BY

When filtering with WHERE before grouping, the index must serve both:

```sql
-- Query: filter by status, group by category
SELECT category, COUNT(*) FROM products WHERE status = 'active' GROUP BY category;

-- No index: Using temporary; Using filesort
-- Add composite index (WHERE column first)
CREATE INDEX idx_status_category ON products(status, category);

EXPLAIN SELECT category, COUNT(*) FROM products WHERE status = 'active' GROUP BY category;
-- type: ref, key: idx_status_category, Extra: Using index
```

## Covering Index for Aggregate Queries

If the aggregate column is also in the index, MySQL can compute the aggregate entirely from the index:

```sql
-- Query: sum of salary grouped by department
SELECT department, SUM(salary) FROM employees GROUP BY department;

-- Create covering index
CREATE INDEX idx_dept_salary ON employees(department, salary);

EXPLAIN SELECT department, SUM(salary) FROM employees GROUP BY department;
-- type: index, Extra: Using index
-- MySQL reads (department, salary) from index without table lookups
```

## Avoid Implicit GROUP BY Sort

By default, MySQL sorts GROUP BY results. If you do not need the output sorted, suppress the implicit sort:

```sql
-- MySQL adds an implicit ORDER BY for GROUP BY (older behavior)
-- Force unsorted output (faster if you do not need sorted groups)
SELECT department, COUNT(*) FROM employees GROUP BY department ORDER BY NULL;
```

In MySQL 8.0, implicit sorting for GROUP BY was removed, so this is less necessary but still valid.

## GROUP BY with HAVING - Filter Early

Use WHERE to filter rows before grouping rather than using HAVING:

```sql
-- Less efficient: aggregates all rows, then filters with HAVING
SELECT region, SUM(total) FROM orders
GROUP BY region
HAVING region != 'unknown';

-- More efficient: filter rows before aggregation
SELECT region, SUM(total) FROM orders
WHERE region != 'unknown'
GROUP BY region;
```

## Loose Index Scan for GROUP BY

For certain aggregate functions like MIN(), MAX(), COUNT(DISTINCT), and SUM(DISTINCT), MySQL can use a "loose index scan" that skips directly between group boundaries instead of scanning every row:

```sql
-- Requires an index on (category, price)
CREATE INDEX idx_category_price ON products(category, price);

-- Check if EXPLAIN shows "Using index for group-by"
EXPLAIN SELECT category, MAX(price) FROM products GROUP BY category;
-- Extra: Using index for group-by (very efficient)
```

This requires an index where the GROUP BY column is the leftmost prefix and the aggregated column is also part of the index.

## Summary

GROUP BY optimization in MySQL follows a predictable pattern: create an index on the GROUP BY column (with WHERE columns preceding it in a composite index). For aggregate functions, add the aggregated column to the index to enable covering index scans. Avoid HAVING for row-level filtering, use WHERE instead. With the right indexes, EXPLAIN should show `Using index` rather than `Using temporary; Using filesort`.
