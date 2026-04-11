# How to Use WITH CHECK OPTION in MySQL Views

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, SQL, Database Administration, Security

Description: Learn how WITH CHECK OPTION prevents inserts and updates through a MySQL view that would make the row invisible to the view's WHERE clause.

---

## What Is WITH CHECK OPTION?

When you create an updatable view in MySQL, users can INSERT or UPDATE rows through the view. Without any guard, a user could insert a row that does not satisfy the view's WHERE condition - the row is written to the underlying table but disappears from the view immediately. `WITH CHECK OPTION` blocks such operations by verifying that every INSERT or UPDATE made through the view still satisfies the defining SELECT's WHERE clause.

## Creating a View WITH CHECK OPTION

```sql
CREATE OR REPLACE VIEW active_employees AS
SELECT id, name, department, status
FROM employees
WHERE status = 'active'
WITH CHECK OPTION;
```

Now any attempt to insert or update a row through `active_employees` where `status != 'active'` raises an error.

## Demonstrating the Constraint

```sql
-- This succeeds because status = 'active'
INSERT INTO active_employees (id, name, department, status)
VALUES (101, 'Alice', 'Engineering', 'active');

-- This fails - status 'inactive' violates the view's WHERE clause
INSERT INTO active_employees (id, name, department, status)
VALUES (102, 'Bob', 'Engineering', 'inactive');
-- ERROR 1369 (HY000): CHECK OPTION failed 'mydb.active_employees'
```

## LOCAL vs. CASCADED Check Option

MySQL supports two variants:

```sql
-- CASCADED (default) - checks this view AND all underlying views
CREATE VIEW v_dept AS
SELECT * FROM active_employees WHERE department = 'Engineering'
WITH CASCADED CHECK OPTION;

-- LOCAL - checks this view's WHERE clause and recurses into underlying views that have their own CHECK OPTION
CREATE VIEW v_dept_local AS
SELECT * FROM active_employees WHERE department = 'Engineering'
WITH LOCAL CHECK OPTION;
```

`CASCADED` propagates the check down the full chain of view dependencies, enforcing all underlying views' WHERE clauses even if they lack their own CHECK OPTION. `LOCAL` enforces the current view's predicate and recurses into underlying views, but only enforces checks on those that were themselves defined with a CHECK OPTION.

## Verifying CHECK OPTION on Existing Views

```sql
SELECT TABLE_NAME, VIEW_DEFINITION, CHECK_OPTION
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'active_employees';
```

The `CHECK_OPTION` column returns `NONE`, `LOCAL`, or `CASCADE`.

## Practical Use Case - Partitioned Data Access

A common pattern is giving different application roles access to their own data slice through views with `WITH CHECK OPTION` so they cannot accidentally write to other partitions:

```sql
CREATE VIEW region_us_orders AS
SELECT order_id, customer_id, amount, region
FROM orders
WHERE region = 'US'
WITH CHECK OPTION;
```

Any attempt to set `region = 'EU'` through this view will fail, keeping data partitions clean without application-level enforcement.

## Key Limitations

- The view must be updatable for `WITH CHECK OPTION` to apply.
- Views with `GROUP BY`, `DISTINCT`, aggregate functions, or `UNION` are not updatable and cannot use `WITH CHECK OPTION` meaningfully.
- Columns not in the view's SELECT list but required by the base table must have defaults or be nullable.

## Summary

`WITH CHECK OPTION` is a lightweight, database-enforced safety net for updatable views. It ensures every write made through a view conforms to the view's own filter criteria, preventing invisible row escapes. Use `CASCADED` (the default) when your views are layered to enforce checks across the entire chain.
