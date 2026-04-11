# How to Transform Rows into Comma-Separated Values in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, GROUP_CONCAT, Aggregation, String, Query

Description: Learn how to aggregate multiple rows into a single comma-separated string in MySQL using GROUP_CONCAT, with ordering, distinct values, and custom separators.

---

## Why Aggregate Rows into CSV?

Collapsing multiple rows into a single comma-separated string is useful for reports, API responses, and denormalized views. MySQL's `GROUP_CONCAT` function handles this efficiently at the database level, avoiding multiple round trips.

## Basic GROUP_CONCAT Usage

Aggregate product tags per product:

```sql
SELECT
  p.id,
  p.name,
  GROUP_CONCAT(t.tag) AS tags
FROM products p
JOIN product_tags t ON t.product_id = p.id
GROUP BY p.id, p.name;
```

Result: `1 | Widget | electronics,hardware,sale`

## Ordering Values Within the String

Use `ORDER BY` inside `GROUP_CONCAT` to control the order of values:

```sql
SELECT
  customer_id,
  GROUP_CONCAT(product_name ORDER BY order_date ASC SEPARATOR ', ') AS purchase_history
FROM orders
GROUP BY customer_id;
```

## Removing Duplicates with DISTINCT

```sql
SELECT
  customer_id,
  GROUP_CONCAT(DISTINCT category ORDER BY category SEPARATOR ', ') AS categories
FROM order_items oi
JOIN products p ON oi.product_id = p.id
GROUP BY customer_id;
```

## Custom Separators

Any string can be used as a separator:

```sql
SELECT
  team_id,
  GROUP_CONCAT(member_name ORDER BY member_name SEPARATOR ' | ') AS team_members
FROM team_memberships
GROUP BY team_id;
```

## Handling the Length Limit

`GROUP_CONCAT` has a default maximum length of 1024 bytes. For larger aggregations, increase it:

```sql
-- Set for the current session
SET SESSION group_concat_max_len = 65536;

-- Or globally
SET GLOBAL group_concat_max_len = 65536;

-- Check the current limit
SHOW VARIABLES LIKE 'group_concat_max_len';
```

## Combining with Other Aggregates

Mix `GROUP_CONCAT` with `COUNT`, `SUM`, and other aggregate functions:

```sql
SELECT
  department_id,
  COUNT(*) AS employee_count,
  AVG(salary) AS avg_salary,
  GROUP_CONCAT(name ORDER BY salary DESC SEPARATOR ', ') AS employees_by_salary
FROM employees
GROUP BY department_id;
```

## Using GROUP_CONCAT in Subqueries

Build dynamic IN lists or generate JSON-like output:

```sql
-- Subquery to get CSV of order IDs per customer
SELECT
  c.id,
  c.name,
  (SELECT GROUP_CONCAT(id ORDER BY created_at)
   FROM orders o WHERE o.customer_id = c.id) AS order_ids
FROM customers c;
```

## Generating JSON Arrays

In MySQL 5.7.22+, prefer `JSON_ARRAYAGG` for structured output:

```sql
SELECT
  customer_id,
  JSON_ARRAYAGG(product_name) AS products_json
FROM order_items
GROUP BY customer_id;
```

## Summary

Use `GROUP_CONCAT` to aggregate multiple rows into comma-separated strings in MySQL. Control ordering with `ORDER BY`, eliminate duplicates with `DISTINCT`, and adjust the maximum length via `group_concat_max_len`. For structured data, use `JSON_ARRAYAGG` in MySQL 5.7.22+ to produce proper JSON arrays.
