# How to Use GROUPING SETS in MySQL (Simulated)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, GROUPING SETS, UNION ALL, Aggregation, Report

Description: Learn how to simulate GROUPING SETS in MySQL using UNION ALL since MySQL lacks native GROUPING SETS, and when to use ROLLUP as an alternative.

---

## What Are GROUPING SETS?

`GROUPING SETS` is a SQL extension that lets you define multiple independent grouping specifications in a single query. For example, you might want totals by `(region, year)`, by `region` alone, and by `year` alone - all in one result set. MySQL does not support `GROUPING SETS` natively (unlike PostgreSQL, SQL Server, and Oracle). You can simulate it using `UNION ALL`.

## Simulating GROUPING SETS with UNION ALL

Each grouping specification becomes a separate `SELECT` statement combined with `UNION ALL`:

```sql
-- GROUPING SETS: (region, year), (region), (year), ()
SELECT region, YEAR(order_date) AS year, SUM(total_amount) AS revenue
FROM orders
GROUP BY region, YEAR(order_date)

UNION ALL

SELECT region, NULL AS year, SUM(total_amount)
FROM orders
GROUP BY region

UNION ALL

SELECT NULL AS region, YEAR(order_date), SUM(total_amount)
FROM orders
GROUP BY YEAR(order_date)

UNION ALL

SELECT NULL, NULL, SUM(total_amount)
FROM orders;
```

This is equivalent to `GROUP BY GROUPING SETS ((region, year), (region), (year), ())`.

## Using NULL as a Grouping Indicator

Use `COALESCE` or `GROUPING()`-style flags to label the aggregation type:

```sql
SELECT
  COALESCE(region, 'ALL')            AS region,
  COALESCE(CAST(yr AS CHAR), 'ALL') AS year,
  revenue,
  agg_type
FROM (
  SELECT region, YEAR(order_date) AS yr, SUM(total_amount) AS revenue,
         'region+year' AS agg_type
  FROM orders GROUP BY region, YEAR(order_date)

  UNION ALL

  SELECT region, NULL, SUM(total_amount), 'region_only'
  FROM orders GROUP BY region

  UNION ALL

  SELECT NULL, YEAR(order_date), SUM(total_amount), 'year_only'
  FROM orders GROUP BY YEAR(order_date)

  UNION ALL

  SELECT NULL, NULL, SUM(total_amount), 'grand_total'
  FROM orders
) t
ORDER BY agg_type, region, yr;
```

## ROLLUP as a Partial Alternative

For hierarchical groupings, `WITH ROLLUP` is more concise than `UNION ALL`:

```sql
-- ROLLUP generates: (region, status), (region), ()
SELECT
  COALESCE(region, 'All Regions') AS region,
  COALESCE(status, 'All Statuses') AS status,
  COUNT(*) AS orders,
  SUM(total_amount) AS revenue
FROM orders
GROUP BY region, status WITH ROLLUP;
```

Use ROLLUP when the groupings are strictly hierarchical. Use `UNION ALL` simulation when you need non-hierarchical independent groupings.

## Multi-Dimension Sales Summary

Simulate a three-grouping-set report for sales analytics:

```sql
SELECT 'by_region'   AS level, region, NULL AS category, SUM(total_amount) AS rev
FROM orders
GROUP BY region

UNION ALL

SELECT 'by_category', NULL, p.category, SUM(total_amount)
FROM orders o JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY p.category

UNION ALL

SELECT 'grand_total', NULL, NULL, SUM(total_amount)
FROM orders;
```

## Performance Considerations

Each `UNION ALL` branch performs a separate table scan. For large tables, consider:

```sql
-- Materialize once, then aggregate multiple ways
CREATE TEMPORARY TABLE order_agg AS
SELECT region, YEAR(order_date) AS yr, p.category, SUM(o.total_amount) AS revenue
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY region, yr, p.category;
```

Then query `order_agg` multiple times instead of the raw tables.

## Summary

MySQL does not support `GROUPING SETS` natively. Simulate it with `UNION ALL`, where each branch represents one grouping specification with `NULL` for non-grouped columns. Use `WITH ROLLUP` when groupings are strictly hierarchical. For performance, pre-aggregate into a temporary table to avoid multiple full table scans.
