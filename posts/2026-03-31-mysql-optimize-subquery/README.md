# How to Optimize Subquery Performance in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Subquery, Optimization, Performance

Description: Learn how to optimize MySQL subqueries by rewriting correlated subqueries as JOINs, using EXISTS instead of IN, and understanding how the optimizer handles subqueries.

---

## Why Subqueries Can Be Slow

Subqueries are convenient to write but can execute very inefficiently. The main performance problem is the correlated subquery - one that references columns from the outer query and must re-execute for every row the outer query processes.

## Identifying Slow Subqueries with EXPLAIN

```sql
EXPLAIN SELECT o.id, o.total,
  (SELECT name FROM customers WHERE id = o.customer_id) AS cname
FROM orders o;
```

```text
id | select_type        | table     | type  | rows
1  | PRIMARY            | o         | ALL   | 800000
2  | DEPENDENT SUBQUERY | customers | const | 1
```

`DEPENDENT SUBQUERY` means the subquery re-executes 800,000 times - once per row in orders.

## Rewrite Correlated Subqueries as JOINs

The most impactful optimization is converting correlated subqueries to JOINs:

```sql
-- Before: correlated subquery (slow)
SELECT o.id, o.total,
  (SELECT name FROM customers WHERE id = o.customer_id) AS cname
FROM orders o;

-- After: LEFT JOIN (fast, preserves rows with no matching customer)
SELECT o.id, o.total, c.name AS cname
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id;
```

The JOIN executes the customer lookup once per match using the index, not once per order row.

## IN Subquery vs JOIN

```sql
-- IN with subquery (may be slow on older MySQL versions)
SELECT * FROM products
WHERE category_id IN (SELECT id FROM categories WHERE active = 1);

-- Equivalent JOIN (explicit, consistent performance)
SELECT p.*
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE c.active = 1;
```

MySQL 8.0 often rewrites IN subqueries to semijoin automatically. Check with `SHOW WARNINGS` after `EXPLAIN` to confirm.

## Use EXISTS Instead of IN for Large Subqueries

When the subquery returns a large result set, `EXISTS` can be more efficient because it stops as soon as one match is found:

```sql
-- IN: evaluates entire subquery result set
SELECT * FROM customers
WHERE id IN (SELECT DISTINCT customer_id FROM orders WHERE total > 1000);

-- EXISTS: stops at first match per customer
SELECT * FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.total > 1000);
```

## Use Derived Tables for Pre-Aggregation

When a subquery performs aggregation, make it a derived table (subquery in FROM) that MySQL can materialize once:

```sql
-- Subquery in WHERE that runs repeatedly
SELECT * FROM products p
WHERE price > (SELECT AVG(price) FROM products WHERE category_id = p.category_id);
-- DEPENDENT SUBQUERY: runs once per product row

-- Better: pre-aggregate in FROM clause
SELECT p.*
FROM products p
JOIN (
  SELECT category_id, AVG(price) AS avg_price
  FROM products
  GROUP BY category_id
) agg ON p.category_id = agg.category_id
WHERE p.price > agg.avg_price;
-- Aggregation runs once, result materialized, then joined
```

## CTEs for Readable Non-Correlated Subqueries

In MySQL 8.0, use CTEs for complex multi-step queries:

```sql
WITH high_value_customers AS (
  SELECT customer_id
  FROM orders
  GROUP BY customer_id
  HAVING SUM(total) > 10000
)
SELECT c.name, c.email
FROM customers c
JOIN high_value_customers hvc ON c.id = hvc.customer_id;
```

## Check for Subquery Optimization in EXPLAIN

```sql
-- MySQL 8.0 may automatically convert IN subquery to semijoin
EXPLAIN SELECT * FROM orders WHERE customer_id IN (
  SELECT id FROM customers WHERE country = 'US'
);
SHOW WARNINGS;
-- Check if optimizer rewrote it as SEMI JOIN
```

## Summary

Subquery performance in MySQL depends heavily on whether the subquery is correlated or not. Correlated subqueries that appear in SELECT lists or WHERE clauses with `DEPENDENT SUBQUERY` in EXPLAIN are the most dangerous - convert them to JOINs or derived tables. Use EXISTS for large membership tests. MySQL 8.0 handles many subquery patterns better than older versions, but explicit JOIN rewrites remain the most reliable approach for predictable performance.
