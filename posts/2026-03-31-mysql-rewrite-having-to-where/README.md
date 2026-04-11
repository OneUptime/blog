# How to Rewrite HAVING to WHERE When Possible in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Optimization, HAVING, WHERE, Performance

Description: Learn when and how to move conditions from HAVING to WHERE in MySQL to reduce row processing and improve query performance.

---

## Overview

`HAVING` and `WHERE` both filter rows, but they operate at different stages of query execution. `WHERE` filters rows before grouping, while `HAVING` filters groups after aggregation. Conditions that do not depend on aggregate functions can often be moved from `HAVING` to `WHERE`, reducing the number of rows that participate in the (expensive) grouping operation.

## Understanding the Execution Order

MySQL processes clauses in this logical order:

```text
1. FROM / JOIN     - Identify source tables
2. WHERE           - Filter individual rows (before grouping)
3. GROUP BY        - Group remaining rows
4. HAVING          - Filter groups (after aggregation)
5. SELECT          - Choose output columns
6. ORDER BY        - Sort results
7. LIMIT           - Restrict row count
```

Moving a filter from step 4 (HAVING) to step 2 (WHERE) means fewer rows are grouped - potentially orders of magnitude less work.

## Identifying Moveable Conditions

A condition can move from HAVING to WHERE if it does NOT reference aggregate functions:

```sql
-- HAVING condition references 'region' (not an aggregate) - CAN move
SELECT region, COUNT(*) AS order_count
FROM orders
GROUP BY region
HAVING region = 'US';      -- <- This is safe to move to WHERE

-- HAVING condition references COUNT(*) (aggregate) - CANNOT move
SELECT region, COUNT(*) AS order_count
FROM orders
GROUP BY region
HAVING COUNT(*) > 100;     -- <- Must stay in HAVING
```

## Before and After Examples

### Example 1: Simple Non-Aggregate Filter

```sql
-- BEFORE: Filters after grouping all regions
SELECT region, COUNT(*) AS order_count, SUM(amount) AS total
FROM orders
GROUP BY region
HAVING region IN ('US', 'CA');

-- AFTER: Filters before grouping - processes far fewer rows
SELECT region, COUNT(*) AS order_count, SUM(amount) AS total
FROM orders
WHERE region IN ('US', 'CA')
GROUP BY region;
```

### Example 2: Date Filter in HAVING

```sql
-- BEFORE: Groups all rows for all time, then filters by year
SELECT YEAR(created_at) AS order_year, COUNT(*) AS order_count
FROM orders
GROUP BY order_year
HAVING order_year = 2024;

-- AFTER: Only groups rows from 2024 (fewer rows aggregated)
SELECT YEAR(created_at) AS order_year, COUNT(*) AS order_count
FROM orders
WHERE created_at >= '2024-01-01'
  AND created_at < '2025-01-01'
GROUP BY order_year;
```

### Example 3: Mixed Conditions

When both types of conditions exist in HAVING, split them:

```sql
-- BEFORE: Both conditions in HAVING
SELECT customer_id, COUNT(*) AS cnt, SUM(amount) AS total
FROM orders
GROUP BY customer_id
HAVING customer_id > 1000
   AND cnt > 5
   AND total > 500;

-- AFTER: Non-aggregate to WHERE, aggregate stays in HAVING
SELECT customer_id, COUNT(*) AS cnt, SUM(amount) AS total
FROM orders
WHERE customer_id > 1000      -- Moved to WHERE
GROUP BY customer_id
HAVING cnt > 5                -- Stays in HAVING (aggregate)
   AND total > 500;           -- Stays in HAVING (aggregate)
```

## Why This Matters for Index Usage

Moving conditions to WHERE also enables index usage:

```sql
-- Create index on customer_id
CREATE INDEX idx_customer ON orders (customer_id);

-- The WHERE condition uses the index; HAVING cannot
SELECT customer_id, COUNT(*) AS order_count
FROM orders
WHERE customer_id BETWEEN 1000 AND 2000  -- Uses idx_customer
GROUP BY customer_id
HAVING order_count > 5;
```

## The Exception: Aliases in HAVING

MySQL allows HAVING to reference SELECT aliases, which WHERE cannot use:

```sql
-- Valid: HAVING uses the alias defined in SELECT
SELECT customer_id, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id
HAVING order_count > 10;

-- Invalid: WHERE cannot reference SELECT aliases
-- SELECT customer_id, COUNT(*) AS order_count
-- FROM orders
-- WHERE order_count > 10   -- ERROR: Unknown column 'order_count'
-- GROUP BY customer_id;
```

## Summary

Moving non-aggregate filter conditions from HAVING to WHERE is a high-impact optimization that reduces the number of rows participating in GROUP BY. Analyze every HAVING clause: conditions that reference plain columns (not aggregate functions) can and should move to WHERE. This both reduces CPU work during grouping and enables the optimizer to use indexes on the filtered columns. Keep only true aggregate-based conditions (those referencing COUNT, SUM, AVG, MIN, MAX) in HAVING.
