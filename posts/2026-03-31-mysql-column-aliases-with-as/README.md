# How to Use Column Aliases with AS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Column Alias, SELECT

Description: Learn how to use column aliases with AS in MySQL SELECT statements to rename columns, simplify expressions, and improve query readability.

---

Column aliases let you rename a column or expression in your query results. They are defined with the `AS` keyword in the `SELECT` clause and appear as the column heading in the output. Aliases make computed expressions readable and simplify downstream code that references column names.

## Basic Column Alias

```sql
-- Rename a column in the output
SELECT
  first_name AS given_name,
  last_name AS family_name,
  email AS email_address
FROM customers;
```

The original column names in the table remain unchanged - the alias only affects the result set.

## Alias Without the AS Keyword

`AS` is optional - MySQL accepts aliases with just a space:

```sql
-- These are equivalent
SELECT salary AS annual_salary FROM employees;
SELECT salary annual_salary FROM employees;
```

Using `AS` explicitly is strongly recommended for readability and to avoid accidental omissions.

## Aliasing Computed Expressions

```sql
-- Name the computed columns clearly
SELECT
  product_name,
  price,
  price * 0.9 AS discounted_price,
  price - (price * 0.9) AS savings,
  ROUND(price * 0.9, 2) AS rounded_price
FROM products;
```

Without aliases, MySQL would display the raw expression (like `price * 0.9`) as the column heading, which is hard to work with in application code.

## Using Aliases in ORDER BY

Aliases defined in `SELECT` can be used in `ORDER BY`:

```sql
SELECT
  product_name,
  price * quantity AS line_total
FROM order_items
ORDER BY line_total DESC;
```

## Aliases in GROUP BY

In MySQL (unlike standard SQL), you can reference `SELECT` aliases in `GROUP BY`:

```sql
SELECT
  YEAR(order_date) AS order_year,
  MONTH(order_date) AS order_month,
  COUNT(*) AS order_count,
  SUM(total) AS revenue
FROM orders
GROUP BY order_year, order_month
ORDER BY order_year, order_month;
```

## Aliases Cannot Be Used in WHERE

A common mistake is trying to filter on a `SELECT` alias in the `WHERE` clause:

```sql
-- This FAILS: aliases are not available in WHERE
SELECT price * 0.9 AS discounted_price
FROM products
WHERE discounted_price < 20;  -- Error!

-- Correct: repeat the expression in WHERE
SELECT price * 0.9 AS discounted_price
FROM products
WHERE price * 0.9 < 20;

-- Or use a subquery or CTE
SELECT * FROM (
  SELECT product_name, price * 0.9 AS discounted_price
  FROM products
) AS p
WHERE p.discounted_price < 20;
```

## Aliases with Spaces or Special Characters

Use backticks for aliases with spaces or reserved words:

```sql
SELECT
  order_date AS `Order Date`,
  total AS `Total Amount (USD)`
FROM orders;
```

## Aliasing Aggregate Functions

```sql
SELECT
  department,
  COUNT(*) AS headcount,
  AVG(salary) AS avg_salary,
  MAX(salary) AS max_salary,
  MIN(salary) AS min_salary
FROM employees
GROUP BY department;
```

## Summary

Column aliases defined with `AS` rename columns and expressions in query results. The `AS` keyword is optional but recommended for clarity. Aliases can be used in `ORDER BY`, `GROUP BY`, and `HAVING` clauses, but not in `WHERE`. For aliases containing spaces or reserved words, wrap them in backticks. Aliases are especially valuable for computed expressions and aggregate functions to produce clean, descriptive result column names.
