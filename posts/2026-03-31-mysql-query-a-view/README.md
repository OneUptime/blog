# How to Query a View in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, SELECT, Query, Performance

Description: Learn how to query MySQL views using SELECT, apply WHERE filters, join views with tables, and understand how MySQL processes view queries.

---

Once a view is created, you query it exactly like a regular table using `SELECT`. MySQL expands the view definition at query time and merges it with your outer query - or materializes it into a temporary table depending on the view's complexity.

## Basic SELECT on a View

Assuming a view `active_customers` exists:

```sql
CREATE VIEW active_customers AS
SELECT customer_id, first_name, last_name, email, city
FROM customers
WHERE status = 'active';
```

Query it:

```sql
SELECT * FROM active_customers;
```

Filter, sort, and limit as you would with any table:

```sql
SELECT first_name, last_name, city
FROM active_customers
WHERE city = 'New York'
ORDER BY last_name
LIMIT 20;
```

## Applying WHERE to a View

You can layer additional conditions on top of the view's own `WHERE` clause:

```sql
SELECT customer_id, email
FROM active_customers
WHERE city IN ('Chicago', 'Los Angeles');
```

MySQL merges both conditions: the view's `status = 'active'` and your `city IN (...)` filter.

## Joining a View with Another Table

Views can be joined to tables or other views:

```sql
SELECT
    ac.customer_id,
    ac.first_name,
    ac.last_name,
    COUNT(o.order_id) AS order_count
FROM active_customers ac
LEFT JOIN orders o ON ac.customer_id = o.customer_id
GROUP BY ac.customer_id, ac.first_name, ac.last_name
HAVING order_count > 5;
```

## Using EXPLAIN to Understand View Execution

MySQL can process a view in two ways:

```text
MERGE      - The view definition is merged into the outer query; indexes on base tables are used.
TEMPTABLE  - The view is materialized into a temp table first; no indexes on the result.
```

Check which algorithm MySQL uses:

```sql
EXPLAIN SELECT * FROM active_customers WHERE city = 'Miami'\G
```

The `MERGE` algorithm is preferred because it allows index use. A view using `GROUP BY`, `DISTINCT`, aggregate functions, `UNION`, or subqueries in the select list forces `TEMPTABLE`.

## Querying a View That Contains Aggregation

```sql
CREATE VIEW monthly_sales AS
SELECT
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    SUM(total) AS revenue
FROM orders
GROUP BY DATE_FORMAT(created_at, '%Y-%m');
```

Query it like a table:

```sql
SELECT month, revenue
FROM monthly_sales
WHERE month BETWEEN '2026-01' AND '2026-03'
ORDER BY month;
```

Note: because this view uses aggregation, MySQL must materialize it first (`TEMPTABLE` algorithm). You can still filter on `revenue` in the outer query, but the filter is applied after materialization rather than being pushed down into the base table scan.

## Checking Available Views

List all views in a database:

```sql
SHOW FULL TABLES IN mydb WHERE TABLE_TYPE = 'VIEW';
```

## Summary

Query a MySQL view with `SELECT`, `WHERE`, `ORDER BY`, `JOIN`, and all standard SQL clauses exactly as you would a base table. Understand that simple views use the `MERGE` algorithm and inherit base table indexes, while views with aggregation or `UNION` use `TEMPTABLE` and do not benefit from base table indexes. Use `EXPLAIN` to confirm how MySQL processes your view query.
