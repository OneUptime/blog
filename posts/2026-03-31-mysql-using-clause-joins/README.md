# How to Use the USING Clause in MySQL Joins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Join, Database, Query

Description: Learn how the USING clause simplifies MySQL joins when both tables share a column with the same name, reducing syntax and eliminating duplicate columns in the result.

---

The `USING` clause is a shorthand for `ON t1.col = t2.col` when the join column has the same name in both tables. It also removes the duplicate column from `SELECT *` output, which `ON` does not do.

## Syntax

```sql
SELECT ...
FROM table1
JOIN table2 USING (column_name);
```

The column listed in `USING` must exist in both tables with the same name.

## Basic example

```sql
CREATE TABLE departments (
    department_id INT PRIMARY KEY,
    name          VARCHAR(60)
);

CREATE TABLE employees (
    employee_id   INT PRIMARY KEY,
    name          VARCHAR(100),
    department_id INT
);

-- With ON
SELECT e.name AS employee, d.name AS department
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id;

-- Equivalent with USING
SELECT e.name AS employee, d.name AS department
FROM employees e
INNER JOIN departments d USING (department_id);
```

Both queries produce identical rows. The difference is that with `USING`, the result set contains only one `department_id` column instead of two.

## Duplicate column elimination

```sql
-- ON produces two copies of department_id in SELECT *
SELECT *
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id;
-- Columns: employee_id, name, department_id, department_id, name

-- USING produces only one department_id
SELECT *
FROM employees e
INNER JOIN departments d USING (department_id);
-- Columns: department_id, employee_id, name, name
```

The merged `department_id` column is placed first in the result when using `USING`.

## Using USING with multiple columns

When two tables share more than one common column name and you want to join on all of them, list them in a comma-separated parenthesized list:

```sql
CREATE TABLE order_audit (
    order_id    INT,
    customer_id INT,
    audited_at  DATETIME,
    notes       TEXT
);

CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT,
    order_date  DATE
);

SELECT o.order_date, oa.notes
FROM orders o
INNER JOIN order_audit oa USING (order_id, customer_id);
```

## LEFT JOIN with USING

`USING` works with all join types:

```sql
SELECT d.name AS department, e.name AS employee
FROM departments d
LEFT JOIN employees e USING (department_id)
ORDER BY d.name;
```

Departments with no employees will appear with `NULL` in the `employee` column.

## Referencing the USING column in WHERE and ORDER BY

Because `USING` collapses the two columns into one, reference it without a table qualifier:

```sql
SELECT department_id, e.name
FROM employees e
INNER JOIN departments d USING (department_id)
WHERE department_id = 3;
```

The SQL standard forbids qualifying a `USING` column with a table name. MySQL allows it as an extension, but other databases may reject it:

```sql
-- Works in MySQL, but not portable to other databases
SELECT e.department_id
FROM employees e
INNER JOIN departments d USING (department_id);
```

For portability, prefer the unqualified column name.

## When USING works and when it does not

| Situation | USING? |
|---|---|
| Column has the same name in both tables | Yes |
| Column names differ (e.g. `emp_id` vs `id`) | No - use ON |
| Join condition involves a function or expression | No - use ON |
| Self-join where join columns have different names | No - use ON with aliases |

## Summary

The `USING` clause is a concise way to write equi-joins when both tables have a column with the same name. It removes the duplicate join column from `SELECT *` results and keeps query syntax compact. When column names differ or the join condition involves an expression, use `ON` instead.
