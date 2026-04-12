# How to Check If a View is Updatable in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, Information Schema, SQL, Database Administration

Description: Learn how to determine whether a MySQL view is updatable by querying the information_schema and understanding what makes a view updatable or read-only.

---

## What Makes a View Updatable?

A MySQL view is updatable when the database can map an INSERT, UPDATE, or DELETE on the view back to the underlying base table without ambiguity. Views become non-updatable when they include any of the following:

- Aggregate functions (`SUM`, `COUNT`, `AVG`, etc.)
- `DISTINCT`
- `GROUP BY` or `HAVING`
- `UNION` or `UNION ALL`
- Subqueries in the SELECT list
- Certain joins (in some configurations)
- References to non-updatable views

## Checking Updatability via information_schema

The `information_schema.VIEWS` table exposes an `IS_UPDATABLE` column:

```sql
SELECT TABLE_NAME, IS_UPDATABLE, CHECK_OPTION
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'mydb';
```

Sample output:

```text
+------------------+--------------+--------------+
| TABLE_NAME       | IS_UPDATABLE | CHECK_OPTION |
+------------------+--------------+--------------+
| active_employees | YES          | NONE         |
| dept_summary     | NO           | NONE         |
| order_counts     | NO           | NONE         |
+------------------+--------------+--------------+
```

## Checking a Single View

```sql
SELECT IS_UPDATABLE
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'active_employees';
```

## Why a View May Not Be Updatable - Examples

```sql
-- NOT updatable: uses GROUP BY and COUNT
CREATE VIEW dept_summary AS
SELECT department, COUNT(*) AS employee_count
FROM employees
GROUP BY department;

-- NOT updatable: uses DISTINCT
CREATE VIEW unique_cities AS
SELECT DISTINCT city FROM customers;

-- Updatable: simple filter with no aggregation
CREATE VIEW active_employees AS
SELECT id, name, department
FROM employees
WHERE status = 'active';
```

## Testing Updatability by Attempting an Update

You can also discover updatability by attempting an update and observing the error:

```sql
UPDATE dept_summary SET employee_count = 10 WHERE department = 'HR';
-- ERROR 1288 (HY000): The target table dept_summary of the UPDATE is not updatable
```

## Checking All Non-Updatable Views in a Schema

```sql
SELECT TABLE_NAME, VIEW_DEFINITION
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'mydb'
  AND IS_UPDATABLE = 'NO';
```

This query is useful during database audits to document which views are purely read-only reporting objects.

## Checking Updatability for Views with JOINs

Views with simple inner joins on a single key-preserved table can still be updatable for that table's columns:

```sql
-- May be partially updatable for the employees side
CREATE VIEW employee_dept AS
SELECT e.id, e.name, d.department_name
FROM employees e
JOIN departments d ON e.dept_id = d.id;

SELECT IS_UPDATABLE
FROM information_schema.VIEWS
WHERE TABLE_NAME = 'employee_dept'
  AND TABLE_SCHEMA = 'mydb';
```

MySQL marks join views as `YES` when at least one component of the join is updatable (that is, it uses the MERGE algorithm rather than a temporary table). Always verify before relying on join view updates.

## Summary

Use `information_schema.VIEWS` and its `IS_UPDATABLE` column to programmatically determine whether a view supports INSERT, UPDATE, and DELETE operations. Views containing aggregates, DISTINCT, GROUP BY, UNION, or complex subqueries are always non-updatable. For updatable views, pair them with `WITH CHECK OPTION` to enforce data integrity constraints on writes.
