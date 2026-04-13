# How to Use Multiple CTEs in a Single Query in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CTE, SQL, Query, Readability

Description: Learn how to define and chain multiple CTEs in a single MySQL query using the WITH clause to break complex logic into clear, reusable named steps.

---

## Why Multiple CTEs?

A single `WITH` clause can define any number of CTEs separated by commas. Each CTE can reference CTEs defined before it in the same `WITH` clause, allowing you to build multi-step transformations that are far easier to read and debug than deeply nested subqueries.

## Syntax

```sql
WITH
  cte1 AS (
    SELECT ...
  ),
  cte2 AS (
    SELECT ... FROM cte1 ...
  ),
  cte3 AS (
    SELECT ... FROM cte2 ...
  )
SELECT * FROM cte3;
```

Only the final `SELECT` (or DML statement) consumes the CTEs.

## Practical Example: Sales Analysis Pipeline

Suppose you need to:
1. Calculate each salesperson's monthly revenue.
2. Rank salespeople within their region.
3. Flag the top performer per region.

Without CTEs, this would be three nested subqueries. With multiple CTEs:

```sql
WITH
  monthly_totals AS (
    SELECT
      salesperson_id,
      region,
      YEAR(sale_date)  AS yr,
      MONTH(sale_date) AS mo,
      SUM(amount)      AS monthly_revenue
    FROM sales
    GROUP BY salesperson_id, region, yr, mo
  ),
  ranked_salespeople AS (
    SELECT
      *,
      RANK() OVER (
        PARTITION BY region, yr, mo
        ORDER BY monthly_revenue DESC
      ) AS region_rank
    FROM monthly_totals
  ),
  top_performers AS (
    SELECT *
    FROM ranked_salespeople
    WHERE region_rank = 1
  )
SELECT
  tp.yr,
  tp.mo,
  tp.region,
  e.full_name AS top_salesperson,
  tp.monthly_revenue
FROM top_performers tp
JOIN employees e ON tp.salesperson_id = e.employee_id
ORDER BY tp.yr, tp.mo, tp.region;
```

Each CTE has one clear purpose, and the final `SELECT` is simple.

## CTEs Referencing Other CTEs

A later CTE can reference any CTE defined before it:

```sql
WITH
  active_customers AS (
    SELECT customer_id, signup_date
    FROM customers
    WHERE status = 'active'
  ),
  recent_orders AS (
    SELECT o.customer_id, COUNT(*) AS order_count, SUM(o.total) AS order_total
    FROM orders o
    JOIN active_customers ac ON o.customer_id = ac.customer_id
    WHERE o.order_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
    GROUP BY o.customer_id
  ),
  high_value AS (
    SELECT customer_id, order_count, order_total
    FROM recent_orders
    WHERE order_total > 500
  )
SELECT * FROM high_value ORDER BY order_total DESC;
```

## Mixing Regular and Recursive CTEs

If any CTE needs to be recursive, add `RECURSIVE` after `WITH`. The keyword applies to the whole clause, not just the recursive CTE:

```sql
WITH RECURSIVE
  category_tree AS (
    SELECT category_id, parent_id, category_name, 0 AS depth
    FROM categories WHERE parent_id IS NULL
    UNION ALL
    SELECT c.category_id, c.parent_id, c.category_name, ct.depth + 1
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.category_id
  ),
  deep_categories AS (
    SELECT * FROM category_tree WHERE depth >= 2
  )
SELECT * FROM deep_categories;
```

## Reusing a CTE Multiple Times

The same CTE name can appear in multiple places in the final query:

```sql
WITH order_stats AS (
  SELECT customer_id, COUNT(*) AS cnt, SUM(total) AS rev
  FROM orders
  GROUP BY customer_id
)
SELECT
  c.customer_id,
  c.name,
  os.cnt,
  os.rev,
  os.rev / SUM(os.rev) OVER () * 100 AS revenue_share_pct
FROM customers c
JOIN order_stats os ON c.customer_id = os.customer_id;
```

Note: When a CTE is referenced multiple times, MySQL materializes it into a temporary table once and shares the result across all references - it is not re-evaluated. For CTEs referenced only once, the optimizer may choose to merge the CTE into the outer query instead of materializing it. Use `EXPLAIN` to verify how the optimizer handles your CTEs.

## Summary

MySQL supports multiple CTEs in a single `WITH` clause, separated by commas. Later CTEs can reference earlier ones, creating a clear pipeline of transformations. This pattern replaces layered subqueries with named, readable steps, simplifies debugging, and naturally expresses multi-stage analytical logic.
