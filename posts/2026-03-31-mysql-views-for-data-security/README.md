# How to Use Views for Data Security in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, Security, User, Database Administration

Description: Learn how MySQL views provide row-level and column-level access control, letting you expose only the data each user or role should see.

---

## Views as a Security Layer

MySQL does not natively support row-level security the way PostgreSQL does, but views provide an effective substitute. By creating a view that filters rows or hides columns, and granting users SELECT only on that view (not the underlying table), you can enforce fine-grained access control at the database level.

## Hiding Sensitive Columns

Expose only non-sensitive columns to application users:

```sql
-- Base table contains salary and SSN
CREATE TABLE employees (
  id         INT PRIMARY KEY,
  name       VARCHAR(100),
  department VARCHAR(50),
  salary     DECIMAL(10,2),
  ssn        CHAR(11),
  hire_date  DATE
);

-- Public view hides salary and SSN
CREATE VIEW employees_public AS
SELECT id, name, department
FROM employees;

-- Grant access to the view only
GRANT SELECT ON mydb.employees_public TO 'app_user'@'%';
-- Do NOT grant SELECT on the base table
REVOKE SELECT ON mydb.employees FROM 'app_user'@'%';
```

Now `app_user` can query names and departments but cannot access salaries or SSNs.

## Implementing Row-Level Security

Filter rows based on a department or region so each team sees only its own data:

```sql
CREATE VIEW hr_employees AS
SELECT id, name, department, hire_date
FROM employees
WHERE department = 'HR';

GRANT SELECT ON mydb.hr_employees TO 'hr_user'@'%';
```

For dynamic row filtering based on the current user, combine views with `CURRENT_USER()`. Note that `CURRENT_USER()` returns the MySQL account in `'user'@'host'` format, so the column must store values in the same format:

```sql
CREATE VIEW my_orders AS
SELECT order_id, amount, status
FROM orders
WHERE order_owner = CURRENT_USER();
```

## DEFINER vs. INVOKER Security

Control which credentials are used when the view is executed:

```sql
-- DEFINER: view runs with the creator's privileges (default)
CREATE DEFINER='admin'@'localhost'
  SQL SECURITY DEFINER
  VIEW sales_summary AS
  SELECT region, SUM(amount) FROM sales GROUP BY region;

-- INVOKER: view runs with the calling user's privileges
CREATE SQL SECURITY INVOKER
  VIEW my_sales AS
  SELECT * FROM sales WHERE sales_owner = CURRENT_USER();
```

`SQL SECURITY DEFINER` lets you give users access to aggregated results without granting access to the raw table. `SQL SECURITY INVOKER` enforces the caller's own privileges.

## Protecting Views with WITH CHECK OPTION

When a view is updatable, add `WITH CHECK OPTION` to prevent writes that would escape the view's filter:

```sql
CREATE VIEW active_employees AS
SELECT id, name, status
FROM employees
WHERE status = 'active'
WITH CHECK OPTION;
```

Any attempt to insert a row with `status = 'inactive'` through this view raises an error.

## Auditing Access Patterns

Grant SELECT on a view and enable the general query log or audit plugin to trace who accessed sensitive data through the view - without exposing the underlying table name in the log.

```sql
-- Check what privileges a user has on views
SHOW GRANTS FOR 'app_user'@'%';
```

## Summary

MySQL views are a practical tool for column-level and row-level access control. Grant access to views rather than base tables, use `SQL SECURITY DEFINER` to allow access through a privileged proxy, and add `WITH CHECK OPTION` on updatable views to prevent data escaping the security boundary. This pattern reduces the risk of accidental data exposure without requiring application-level filtering.
