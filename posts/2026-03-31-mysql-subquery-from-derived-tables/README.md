# How to Use Subqueries in the FROM Clause (Derived Tables) in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Subquery, Derived Table, Database, Query

Description: Learn how to write derived tables in MySQL using subqueries in the FROM clause to pre-aggregate, filter, and transform data before joining or selecting from the result.

---

A derived table is a subquery in the `FROM` clause. MySQL treats it as a temporary, inline view. You give it an alias and query it just like a real table. Derived tables are powerful for pre-aggregating data, isolating logic, and breaking complex queries into readable steps.

## Syntax

```sql
SELECT ...
FROM (
    SELECT ...
    FROM real_table
    WHERE ...
) AS derived_alias
WHERE ...;
```

The alias is required in MySQL. Without it, MySQL raises an error.

## Basic example: filter before joining

```sql
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT,
    total       DECIMAL(10,2),
    status      VARCHAR(20),
    order_date  DATE
);

CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name        VARCHAR(100)
);

-- Only consider shipped orders, then join to get customer names
SELECT c.name, shipped_orders.order_id, shipped_orders.total
FROM (
    SELECT order_id, customer_id, total
    FROM orders
    WHERE status = 'shipped'
) AS shipped_orders
INNER JOIN customers c ON shipped_orders.customer_id = c.customer_id;
```

## Pre-aggregating with a derived table

Aggregating before a join avoids inflating row counts:

```sql
-- Total revenue per customer, then join to get name and region
SELECT
    c.name,
    c.region,
    rev.total_revenue
FROM (
    SELECT customer_id, SUM(total) AS total_revenue
    FROM orders
    GROUP BY customer_id
) AS rev
INNER JOIN customers c ON rev.customer_id = c.customer_id
ORDER BY rev.total_revenue DESC;
```

If you joined first and aggregated after, you might accidentally count the same order multiple times if the join expanded rows.

## Derived table with LIMIT: top-N before joining

```sql
-- Get the top 5 customers by order count, then look up their details
SELECT c.name, top5.order_count
FROM (
    SELECT customer_id, COUNT(*) AS order_count
    FROM orders
    GROUP BY customer_id
    ORDER BY order_count DESC
    LIMIT 5
) AS top5
INNER JOIN customers c ON top5.customer_id = c.customer_id;
```

## Nested derived tables

You can nest derived tables, though deep nesting hurts readability. Consider CTEs instead:

```sql
SELECT region, avg_revenue
FROM (
    SELECT c.region, AVG(rev.total_revenue) AS avg_revenue
    FROM (
        SELECT customer_id, SUM(total) AS total_revenue
        FROM orders
        GROUP BY customer_id
    ) AS rev
    INNER JOIN customers c ON rev.customer_id = c.customer_id
    GROUP BY c.region
) AS region_avg
WHERE avg_revenue > 500;
```

The equivalent CTE form is easier to read:

```sql
WITH rev AS (
    SELECT customer_id, SUM(total) AS total_revenue
    FROM orders
    GROUP BY customer_id
),
region_avg AS (
    SELECT c.region, AVG(rev.total_revenue) AS avg_revenue
    FROM rev
    INNER JOIN customers c ON rev.customer_id = c.customer_id
    GROUP BY c.region
)
SELECT region, avg_revenue
FROM region_avg
WHERE avg_revenue > 500;
```

## Using derived tables to work around GROUP BY restrictions

MySQL's `ONLY_FULL_GROUP_BY` mode can be worked around with a derived table:

```sql
-- Find the highest-paid employee in each department
SELECT dept_max.department_id, e.name, e.salary
FROM (
    SELECT department_id, MAX(salary) AS max_salary
    FROM employees
    GROUP BY department_id
) AS dept_max
INNER JOIN employees e
    ON e.department_id = dept_max.department_id
    AND e.salary       = dept_max.max_salary;
```

## Derived table vs CTE vs VIEW

| Approach | Scope | Reusable | Notes |
|---|---|---|---|
| Derived table | Single query | No | Inline, good for one-off use |
| CTE (`WITH`) | Single query | Yes (within query) | More readable for complex logic |
| VIEW | Session/persistent | Yes | Stored in schema, reusable across queries |

## Materialization in MySQL 8

MySQL 8 can handle derived tables in two ways. The optimizer first tries to merge a simple derived table directly into the outer query (`derived_merge` optimization, enabled by default). When merging is not possible — for example, when the derived table uses aggregation, `DISTINCT`, `LIMIT`, or a `UNION` — MySQL materializes it: executes the subquery once and stores the result in an internal temporary table. You can check which strategy was used:

```sql
EXPLAIN FORMAT=JSON
SELECT c.name, rev.total_revenue
FROM (
    SELECT customer_id, SUM(total) AS total_revenue
    FROM orders
    GROUP BY customer_id
) AS rev
INNER JOIN customers c ON rev.customer_id = c.customer_id\G
```

Look for `"materialized_from_subquery"` or `"merged"` in the JSON output.

## Summary

Derived tables (subqueries in `FROM`) let you pre-filter, pre-aggregate, or transform data before it is joined or selected. Always provide an alias. For complex multi-step logic, consider CTEs (`WITH`) for better readability. Use `EXPLAIN` to see whether MySQL materializes or merges the derived table, and ensure the underlying base tables are properly indexed so the derived table subquery runs efficiently.
