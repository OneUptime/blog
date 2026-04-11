# How to Use the MAX() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MAX Function, Aggregate Function

Description: Learn how to use the MySQL MAX() function to find maximum values in numeric, date, and string columns, with GROUP BY, HAVING, and window function patterns.

---

`MAX()` is a MySQL aggregate function that returns the largest non-NULL value in a set. It operates on numeric, date, and string data types and is commonly used to find the latest date, highest price, or most recent record in a group.

## Basic MAX

```sql
-- Most expensive product
SELECT MAX(price) AS max_price FROM products;

-- Most recent order date
SELECT MAX(order_date) AS latest_order FROM orders;

-- Alphabetically last customer name
SELECT MAX(last_name) AS last_alphabetically FROM customers;
```

## MAX with WHERE

```sql
-- Highest salary in the Engineering department
SELECT MAX(salary) AS max_engineering_salary
FROM employees
WHERE department = 'Engineering';

-- Latest completed order in 2025
SELECT MAX(completed_at) AS last_completion
FROM orders
WHERE status = 'completed'
  AND YEAR(completed_at) = 2025;
```

## MAX with GROUP BY

```sql
-- Highest salary per department
SELECT department, MAX(salary) AS max_salary
FROM employees
GROUP BY department
ORDER BY max_salary DESC;

-- Most recent order per customer
SELECT customer_id, MAX(order_date) AS last_order_date
FROM orders
GROUP BY customer_id;
```

## Retrieving the Full Row with the Maximum Value

`MAX()` returns only the value. To retrieve the complete row:

```sql
-- Full details of the most expensive product
SELECT product_id, product_name, price
FROM products
WHERE price = (SELECT MAX(price) FROM products);

-- Latest order per customer (with full details)
SELECT o.order_id, o.customer_id, o.order_date, o.total
FROM orders o
INNER JOIN (
  SELECT customer_id, MAX(order_date) AS last_date
  FROM orders
  GROUP BY customer_id
) AS latest ON o.customer_id = latest.customer_id
           AND o.order_date = latest.last_date;
```

## MAX with HAVING

```sql
-- Categories where the highest-priced product exceeds $500
SELECT category, MAX(price) AS max_price
FROM products
GROUP BY category
HAVING max_price > 500
ORDER BY max_price DESC;
```

## MAX as a Window Function

```sql
-- Show the highest salary in the department alongside each employee row
SELECT
  name,
  department,
  salary,
  MAX(salary) OVER (PARTITION BY department) AS dept_max_salary,
  salary / MAX(salary) OVER (PARTITION BY department) AS pct_of_max
FROM employees;
```

## Running Maximum with Window Function

```sql
-- Cumulative maximum order value over time
SELECT
  order_date,
  total,
  MAX(total) OVER (ORDER BY order_date
                   ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                  ) AS running_max
FROM orders
ORDER BY order_date;
```

## MAX of Expressions

```sql
-- Maximum revenue per order (quantity * price)
SELECT MAX(quantity * unit_price) AS max_line_value
FROM order_items;
```

## NULL Handling

`MAX()` ignores NULL values:

```sql
-- Returns maximum of non-NULL values; NULL rows are skipped
SELECT MAX(resolved_at) AS latest_resolution
FROM support_tickets
WHERE status = 'resolved';
```

## Summary

`MAX()` returns the largest non-NULL value in a column and works with numbers, dates, and strings. Use it with `WHERE` for scoped maximums, `GROUP BY` for per-group maximums, and `HAVING` to filter by the maximum. To retrieve the full row with the maximum value, use a subquery or join. In MySQL 8.0+, `MAX() OVER (PARTITION BY ...)` adds the group maximum to every row as a window function without collapsing rows.
