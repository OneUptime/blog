# How to Get the Top N Records per Group in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Window Function, ROW_NUMBER, Analytics, SQL

Description: Learn how to get the top N records per group in MySQL using ROW_NUMBER(), RANK(), and DENSE_RANK() window functions with practical examples.

---

## What Is Top-N Per Group

"Top N per group" is a common query pattern where you want the best-performing, most recent, or highest-ranked rows within each category. For example:

- Top 3 products by sales per category
- Most recent 5 orders per customer
- Top scorer per department

MySQL 8.0 window functions (`ROW_NUMBER`, `RANK`, `DENSE_RANK`) make this elegant and efficient.

## Sample Dataset

```sql
CREATE TABLE products (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  category   VARCHAR(50),
  name       VARCHAR(100),
  sales      INT
);

INSERT INTO products (category, name, sales) VALUES
  ('Electronics', 'Phone X',    5000),
  ('Electronics', 'Laptop Pro', 3000),
  ('Electronics', 'Tablet Z',   2000),
  ('Electronics', 'Speaker S',  1500),
  ('Clothing',    'Jacket A',   800),
  ('Clothing',    'Shirt B',    1200),
  ('Clothing',    'Pants C',    600),
  ('Clothing',    'Hat D',      400),
  ('Books',       'Novel E',    300),
  ('Books',       'Guide F',    250),
  ('Books',       'Manual G',   100);
```

## Top 2 Products per Category Using ROW_NUMBER

`ROW_NUMBER()` assigns unique sequential numbers - no ties:

```sql
SELECT category, name, sales
FROM (
  SELECT
    category,
    name,
    sales,
    ROW_NUMBER() OVER (
      PARTITION BY category
      ORDER BY sales DESC
    ) AS rn
  FROM products
) ranked
WHERE rn <= 2
ORDER BY category, rn;
```

```text
+-------------+------------+-------+
| category    | name       | sales |
+-------------+------------+-------+
| Books       | Novel E    |   300 |
| Books       | Guide F    |   250 |
| Clothing    | Shirt B    |  1200 |
| Clothing    | Jacket A   |   800 |
| Electronics | Phone X    |  5000 |
| Electronics | Laptop Pro |  3000 |
+-------------+------------+-------+
```

## Top N Using RANK (Handles Ties)

`RANK()` gives tied rows the same rank and skips subsequent positions:

```sql
SELECT category, name, sales, rnk
FROM (
  SELECT
    category,
    name,
    sales,
    RANK() OVER (
      PARTITION BY category
      ORDER BY sales DESC
    ) AS rnk
  FROM products
) ranked
WHERE rnk <= 2
ORDER BY category, rnk;
```

If two products in Electronics both had 5000 sales, they would both receive rank 1, and rank 2 would be skipped.

## Top N Using DENSE_RANK (No Gaps After Ties)

`DENSE_RANK()` like `RANK()` handles ties but does not skip positions:

```sql
SELECT category, name, sales, drnk
FROM (
  SELECT
    category,
    name,
    sales,
    DENSE_RANK() OVER (
      PARTITION BY category
      ORDER BY sales DESC
    ) AS drnk
  FROM products
) ranked
WHERE drnk <= 2
ORDER BY category, drnk;
```

## Top N Most Recent Orders per Customer

```sql
SELECT customer_id, order_id, order_date, total
FROM (
  SELECT
    customer_id,
    order_id,
    order_date,
    total,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY order_date DESC
    ) AS rn
  FROM orders
) ranked
WHERE rn <= 3
ORDER BY customer_id, order_date DESC;
```

## MySQL 5.7 Alternative (Without Window Functions)

For MySQL 5.7, use a correlated subquery or user variable:

```sql
-- Correlated subquery approach
SELECT p1.category, p1.name, p1.sales
FROM products p1
WHERE (
  SELECT COUNT(*)
  FROM products p2
  WHERE p2.category = p1.category
    AND p2.sales > p1.sales
) < 2
ORDER BY p1.category, p1.sales DESC;
```

This counts how many products in the same category have higher sales. If fewer than 2 have higher sales, the product is in the top 2.

## Use WITH CTE for Readability

```sql
WITH ranked_products AS (
  SELECT
    category,
    name,
    sales,
    ROW_NUMBER() OVER (
      PARTITION BY category
      ORDER BY sales DESC
    ) AS rn
  FROM products
)
SELECT category, name, sales
FROM ranked_products
WHERE rn <= 3
ORDER BY category, sales DESC;
```

## Include the Rank in Output

```sql
WITH ranked_products AS (
  SELECT
    category,
    name,
    sales,
    RANK() OVER (PARTITION BY category ORDER BY sales DESC) AS sales_rank
  FROM products
)
SELECT category, name, sales, sales_rank
FROM ranked_products
WHERE sales_rank <= 3
ORDER BY category, sales_rank;
```

## Summary

Getting the top N records per group in MySQL 8.0 is best done with `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` wrapped in a subquery or CTE with a `WHERE rn <= N` filter. Use `RANK()` when you want ties included at the same rank, `DENSE_RANK()` when you want ties with no gaps, and `ROW_NUMBER()` when you want exactly N rows per group with no ties.
