# How to Use CTEs with INSERT, UPDATE, and DELETE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CTE, DML, SQL, Query

Description: Learn how to use CTEs with INSERT, UPDATE, and DELETE statements in MySQL to write readable, multi-step data modification queries.

---

## CTEs Are Not Just for SELECT

In MySQL 8.0, CTEs can be used with `SELECT`, `INSERT`, `UPDATE`, and `DELETE` statements. For `UPDATE` and `DELETE`, the `WITH` clause precedes the statement. For `INSERT ... SELECT`, the `WITH` clause is placed between the `INSERT` clause and the `SELECT`. This allows you to define complex filtering or transformation logic once in a named CTE and then use it in a DML operation.

## CTE with INSERT ... SELECT

Use a CTE to compute data and insert the results into a table:

```sql
INSERT INTO customer_monthly_stats (customer_id, yr, mo, order_count, revenue)
WITH monthly_summary AS (
  SELECT
    customer_id,
    YEAR(order_date)  AS yr,
    MONTH(order_date) AS mo,
    COUNT(*)          AS order_count,
    SUM(total)        AS revenue
  FROM orders
  WHERE order_date >= '2024-01-01'
  GROUP BY customer_id, yr, mo
)
SELECT customer_id, yr, mo, order_count, revenue
FROM monthly_summary;
```

Note that the `WITH` clause appears after `INSERT INTO` and before `SELECT`. The CTE handles the aggregation; the `INSERT` statement receives clean rows.

## CTE with UPDATE

You can use a CTE to compute data from the target table itself and then join the result in the `UPDATE ... JOIN` syntax. The CTE is materialized before the `UPDATE` executes, so referencing the target table inside the CTE is safe:

```sql
WITH avg_salary AS (
  SELECT department_id, AVG(salary) AS dept_avg
  FROM employees
  GROUP BY department_id
)
UPDATE employees e
JOIN avg_salary a ON e.department_id = a.department_id
SET e.salary_band = CASE
  WHEN e.salary > a.dept_avg * 1.2 THEN 'High'
  WHEN e.salary < a.dept_avg * 0.8 THEN 'Low'
  ELSE 'Mid'
END;
```

The CTE computes department averages once; the `UPDATE` uses them in a single join pass.

## CTE with DELETE

Use a CTE to identify rows to delete, then reference the CTE in the `DELETE ... JOIN` pattern:

```sql
WITH stale_sessions AS (
  SELECT session_id
  FROM user_sessions
  WHERE last_activity < DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND is_active = 0
)
DELETE s
FROM user_sessions s
JOIN stale_sessions ss ON s.session_id = ss.session_id;
```

This removes expired, inactive sessions without embedding the logic directly in the `DELETE`.

## Chaining Multiple CTEs in a DML Statement

You can chain multiple CTEs in a single DML statement:

```sql
INSERT INTO notifications (customer_id, message, created_at)
WITH
  flagged_orders AS (
    SELECT order_id
    FROM orders
    WHERE status = 'pending'
      AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
  ),
  customer_ids AS (
    SELECT DISTINCT customer_id
    FROM orders o
    JOIN flagged_orders f ON o.order_id = f.order_id
  )
SELECT
  ci.customer_id,
  'You have pending orders older than 7 days.',
  NOW()
FROM customer_ids ci;
```

## CTE for Upsert Logic

Combine a CTE with `INSERT ... ON DUPLICATE KEY UPDATE` for clean upsert logic:

```sql
INSERT INTO leaderboard (player_id, score, last_updated)
WITH new_scores AS (
  SELECT player_id, SUM(points) AS total_points
  FROM game_events
  WHERE event_date = CURDATE()
  GROUP BY player_id
)
SELECT player_id, total_points, NOW()
FROM new_scores
ON DUPLICATE KEY UPDATE
  score        = VALUES(score),
  last_updated = VALUES(last_updated);
```

> **Note:** The `VALUES()` function in `ON DUPLICATE KEY UPDATE` is deprecated as of MySQL 8.0.20. For new code, prefer the row alias syntax introduced in MySQL 8.0.19.

## Key Considerations

- CTEs used with `UPDATE` or `DELETE` are materialized before the DML executes, so it is safe to reference the target table inside the CTE definition. This is similar to how derived tables work in MySQL.
- For `INSERT ... SELECT`, the `WITH` clause must be placed between `INSERT INTO ... (columns)` and `SELECT`, not before `INSERT`.
- CTEs can also be used with `REPLACE ... SELECT` using the same placement rule (`REPLACE ... WITH ... SELECT`). However, `INSERT ... ON DUPLICATE KEY UPDATE` is generally preferred over `REPLACE` because `REPLACE` performs a delete-then-insert, which can trigger cascading deletes and reset auto-increment values.

## Summary

CTEs in MySQL 8 work cleanly with `INSERT`, `UPDATE`, and `DELETE`. They let you separate complex filter or aggregation logic from the DML operation itself, resulting in queries that are easier to read, test, and maintain. For `UPDATE` and `DELETE`, the `WITH` clause precedes the statement and you join the CTE to the target table. For `INSERT ... SELECT`, the `WITH` clause is placed between `INSERT INTO` and `SELECT`.
