# How to Use JOIN with GROUP BY in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Join, GROUP BY, Database, Query

Description: Learn how to combine JOIN and GROUP BY in MySQL to produce grouped summaries across multiple related tables, with examples covering COUNT, SUM, HAVING, and common pitfalls.

---

`GROUP BY` groups rows that share a common value so that aggregate functions like `COUNT` and `SUM` can summarise each group. When combined with `JOIN`, you can aggregate data across related tables in a single query.

## Query execution order

Understanding the logical order helps avoid errors:

```text
FROM -> JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY -> LIMIT
```

`JOIN` brings tables together, `WHERE` filters individual rows, `GROUP BY` collapses them into groups, `HAVING` filters groups, and `SELECT` projects the final columns.

## Schema

```sql
CREATE TABLE categories (
    category_id INT PRIMARY KEY,
    name        VARCHAR(60)
);

CREATE TABLE products (
    product_id  INT PRIMARY KEY,
    name        VARCHAR(100),
    category_id INT,
    price       DECIMAL(10,2)
);

CREATE TABLE order_items (
    item_id    INT PRIMARY KEY,
    order_id   INT,
    product_id INT,
    quantity   INT
);
```

## Basic JOIN + GROUP BY

Count products in each category:

```sql
SELECT
    c.name          AS category,
    COUNT(p.product_id) AS product_count
FROM categories c
LEFT JOIN products p ON c.category_id = p.category_id
GROUP BY c.category_id, c.name
ORDER BY product_count DESC;
```

`LEFT JOIN` is used so that categories with no products still appear with a count of 0.

## GROUP BY on a three-table join

Total units sold per category:

```sql
SELECT
    c.name              AS category,
    SUM(oi.quantity)    AS total_units_sold
FROM categories c
INNER JOIN products    p  ON c.category_id = p.category_id
INNER JOIN order_items oi ON p.product_id  = oi.product_id
GROUP BY c.category_id, c.name
ORDER BY total_units_sold DESC;
```

## GROUP BY multiple columns

Group by both category and product to see per-product totals:

```sql
SELECT
    c.name           AS category,
    p.name           AS product,
    SUM(oi.quantity) AS units_sold
FROM categories c
INNER JOIN products    p  ON c.category_id = p.category_id
INNER JOIN order_items oi ON p.product_id  = oi.product_id
GROUP BY c.category_id, c.name, p.product_id, p.name
ORDER BY c.name, units_sold DESC;
```

## Filtering groups with HAVING

Show only categories with more than 100 units sold:

```sql
SELECT
    c.name              AS category,
    SUM(oi.quantity)    AS total_units_sold
FROM categories c
INNER JOIN products    p  ON c.category_id = p.category_id
INNER JOIN order_items oi ON p.product_id  = oi.product_id
GROUP BY c.category_id, c.name
HAVING total_units_sold > 100
ORDER BY total_units_sold DESC;
```

`HAVING` runs after `GROUP BY` and can reference aggregate function aliases defined in `SELECT`.

## Combining WHERE and HAVING

`WHERE` filters rows before grouping; `HAVING` filters groups after:

```sql
SELECT
    c.name,
    COUNT(DISTINCT oi.order_id) AS order_count
FROM categories c
INNER JOIN products    p  ON c.category_id = p.category_id
INNER JOIN order_items oi ON p.product_id  = oi.product_id
WHERE p.price > 10.00              -- filter individual rows first
GROUP BY c.category_id, c.name
HAVING order_count > 5             -- then filter groups
ORDER BY order_count DESC;
```

## ONLY_FULL_GROUP_BY and the GROUP BY rule

MySQL 8 enforces `ONLY_FULL_GROUP_BY` by default. Every column in `SELECT` that is not an aggregate must appear in `GROUP BY`:

```sql
-- Causes error in MySQL 8 (p.name not in GROUP BY)
SELECT c.name, p.name, COUNT(oi.item_id)
FROM categories c
INNER JOIN products    p  ON c.category_id = p.category_id
INNER JOIN order_items oi ON p.product_id  = oi.product_id
GROUP BY c.category_id, c.name;

-- Correct: add p.product_id, p.name to GROUP BY
SELECT c.name, p.name, COUNT(oi.item_id)
FROM categories c
INNER JOIN products    p  ON c.category_id = p.category_id
INNER JOIN order_items oi ON p.product_id  = oi.product_id
GROUP BY c.category_id, c.name, p.product_id, p.name;
```

## Using a derived table to pre-aggregate

Pre-aggregating in a subquery before joining can improve performance on large tables:

```sql
SELECT
    c.name,
    agg.total_units
FROM categories c
INNER JOIN (
    SELECT p.category_id, SUM(oi.quantity) AS total_units
    FROM products    p
    INNER JOIN order_items oi ON p.product_id = oi.product_id
    GROUP BY p.category_id
) AS agg ON c.category_id = agg.category_id
ORDER BY agg.total_units DESC;
```

MySQL can push the grouping into the subquery and scan a smaller intermediate result.

## GROUP BY with ROLLUP

Add subtotals and a grand total:

```sql
SELECT
    COALESCE(c.name, 'TOTAL') AS category,
    SUM(oi.quantity)          AS total_units
FROM categories c
INNER JOIN products    p  ON c.category_id = p.category_id
INNER JOIN order_items oi ON p.product_id  = oi.product_id
GROUP BY c.category_id, c.name WITH ROLLUP;
```

`WITH ROLLUP` adds a summary row for each group level and a grand total row at the end.

## Summary

Use `JOIN` with `GROUP BY` by first joining all required tables, applying row-level filters with `WHERE`, grouping with the dimensions you need, and filtering groups with `HAVING`. Always include all non-aggregated `SELECT` columns in `GROUP BY` to comply with MySQL's `ONLY_FULL_GROUP_BY` mode. Pre-aggregating in a subquery before a join is a useful technique for large datasets.
