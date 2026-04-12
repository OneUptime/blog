# How to Handle the ALGORITHM Clause in MySQL Views

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, Algorithm, Performance, SQL

Description: Learn how MySQL's ALGORITHM clause for views controls whether a view is merged into the query or materialized as a temporary table, and how to choose the right option.

---

## Overview of the ALGORITHM Clause

MySQL allows three values in the `ALGORITHM` clause when creating or altering a view:

| Algorithm  | Behavior |
|------------|----------|
| `MERGE`    | View definition is merged into the outer query; base table indexes are accessible |
| `TEMPTABLE`| View is fully materialized into a temp table before the outer query runs |
| `UNDEFINED`| MySQL chooses the algorithm automatically (default) |

## Syntax

```sql
CREATE [OR REPLACE] ALGORITHM = {MERGE | TEMPTABLE | UNDEFINED}
VIEW view_name AS
SELECT ...;
```

## MERGE Algorithm

With MERGE, the optimizer rewrites the outer query by substituting the view's SELECT in place of the view reference. The result is a single combined query that can use all base table indexes:

```sql
CREATE ALGORITHM = MERGE VIEW active_customers AS
SELECT id, name, email
FROM customers
WHERE status = 'active';

-- MySQL merges this into: SELECT id, name FROM customers WHERE status='active' AND region='US'
SELECT id, name FROM active_customers WHERE region = 'US';
```

EXPLAIN will show the base table (`customers`) being accessed, and the optimizer can apply any index on `status` or `region`.

## TEMPTABLE Algorithm

With TEMPTABLE, MySQL fully executes the view's SELECT and writes the result to a temporary table. The outer query then runs against that temporary table - no base table indexes are available for the outer WHERE:

```sql
CREATE ALGORITHM = TEMPTABLE VIEW order_counts AS
SELECT customer_id, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id;

-- The filter customer_id=42 runs on the temp table, not on the orders index
SELECT * FROM order_counts WHERE customer_id = 42;
```

## When MySQL Forces TEMPTABLE

Regardless of the specified algorithm, MySQL cannot use MERGE when the view contains:

- Aggregate functions or window functions (`SUM`, `COUNT`, `AVG`, etc.)
- `DISTINCT`
- `GROUP BY`
- `HAVING`
- `LIMIT`
- `UNION` or `UNION ALL`
- Subqueries in the SELECT list

If MERGE is explicitly requested but cannot be used, MySQL issues a warning and sets the algorithm to UNDEFINED, which then falls back to TEMPTABLE:

```sql
-- MERGE is specified but MySQL warns and falls back to TEMPTABLE
CREATE ALGORITHM = MERGE VIEW bad_merge AS
SELECT department, COUNT(*) FROM employees GROUP BY department;
```

## UNDEFINED - Letting MySQL Decide

`UNDEFINED` (or simply omitting the clause) tells MySQL to choose the best algorithm:

```sql
CREATE VIEW my_view AS
SELECT id, name FROM customers WHERE status = 'active';
-- MySQL prefers MERGE here
```

MySQL prefers MERGE when possible because it tends to produce better execution plans.

## Verifying the Algorithm in Use

Use `SHOW CREATE VIEW` to see the full view definition including the `ALGORITHM` clause:

```sql
SHOW CREATE VIEW active_customers;
```

Note that `information_schema.VIEWS.VIEW_DEFINITION` only contains the bare SELECT statement and does not include the ALGORITHM. You can also use EXPLAIN to confirm:

```sql
EXPLAIN SELECT * FROM active_customers WHERE region = 'US';
```

If EXPLAIN shows the base table (`customers`) directly, MERGE is in effect. If it shows a derived table (`<derived2>` or similar), TEMPTABLE is being used.

## Changing the Algorithm on an Existing View

```sql
ALTER ALGORITHM = MERGE VIEW active_customers AS
SELECT id, name, email
FROM customers
WHERE status = 'active';
```

## Summary

The ALGORITHM clause gives you explicit control over whether MySQL merges a view into the outer query (MERGE) or materializes it first (TEMPTABLE). Use MERGE for simple filter and projection views to retain base table index access. TEMPTABLE is unavoidable for views with aggregation or DISTINCT, so focus optimization effort on indexing the base table columns used in the view's own WHERE and GROUP BY clauses.
