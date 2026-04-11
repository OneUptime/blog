# How to Use the ON Clause in MySQL Joins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Join, Database, Query

Description: Learn how the ON clause specifies join conditions in MySQL, including equi-joins, non-equi-joins, multi-column joins, and filtering rows directly in the join condition.

---

The `ON` clause is the most flexible way to define the condition that links two tables in a MySQL join. Unlike the `USING` clause, `ON` works with any expression, including comparisons involving different column names, ranges, and functions.

## Syntax

```sql
SELECT ...
FROM table1 t1
JOIN table2 t2 ON t1.column = t2.column;
```

## Equi-join: matching on equal values

The most common pattern joins two tables where a foreign key equals a primary key:

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

SELECT e.name AS employee, d.name AS department
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id;
```

## Joining on columns with different names

When foreign key columns have different names, `ON` is the only option:

```sql
CREATE TABLE invoices (
    invoice_id  INT PRIMARY KEY,
    client_id   INT,
    total       DECIMAL(10,2)
);

CREATE TABLE clients (
    id   INT PRIMARY KEY,
    name VARCHAR(100)
);

SELECT c.name, i.invoice_id, i.total
FROM invoices i
INNER JOIN clients c ON i.client_id = c.id;
```

## Multi-column ON condition

```sql
CREATE TABLE price_history (
    product_id INT,
    region_id  INT,
    price      DECIMAL(10,2),
    effective  DATE
);

CREATE TABLE regions (
    region_id INT,
    product_id INT,
    name       VARCHAR(60)
);

SELECT ph.effective, ph.price, r.name AS region
FROM price_history ph
INNER JOIN regions r ON ph.product_id = r.product_id
                    AND ph.region_id  = r.region_id;
```

## Non-equi-join: range or inequality conditions

`ON` supports any comparison operator:

```sql
CREATE TABLE salary_bands (
    band_id    INT PRIMARY KEY,
    band_name  VARCHAR(30),
    min_salary DECIMAL(10,2),
    max_salary DECIMAL(10,2)
);

CREATE TABLE employees_pay (
    employee_id   INT PRIMARY KEY,
    name          VARCHAR(100),
    department_id INT,
    salary        DECIMAL(10,2)
);

SELECT ep.name, ep.salary, sb.band_name
FROM employees_pay ep
INNER JOIN salary_bands sb
    ON ep.salary BETWEEN sb.min_salary AND sb.max_salary;
```

## Filtering with ON vs WHERE

With `INNER JOIN`, putting a filter in `ON` or `WHERE` produces the same result. With `LEFT JOIN`, the position matters:

```sql
-- Filter in WHERE: removes non-matching rows entirely
SELECT e.name, d.name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
WHERE d.name = 'Engineering';

-- Filter in ON: keeps all employees, NULL for non-Engineering departments
SELECT e.name, d.name
FROM employees e
LEFT JOIN departments d
    ON e.department_id = d.department_id
    AND d.name = 'Engineering';
```

The second query returns all employees; those not in Engineering have `NULL` in the department column.

## ON with a subquery on one side

```sql
SELECT e.name, recent.max_salary
FROM employees e
INNER JOIN (
    SELECT department_id, MAX(salary) AS max_salary
    FROM employees_pay
    GROUP BY department_id
) AS recent ON e.department_id = recent.department_id;
```

## Joining on expressions

```sql
-- Match employees hired in the same year as a project was started
SELECT e.name, p.project_name
FROM employees e
INNER JOIN projects p
    ON YEAR(e.hire_date) = YEAR(p.start_date);
```

Note: joining on a function result prevents index use on the expression side. Add functional indexes where performance matters.

## Self-join using ON

`ON` is required for self-joins because there is only one table and you need two aliases:

```sql
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.employee_id;
```

## Summary

The `ON` clause is the most general join condition in MySQL. It supports equi-joins, non-equi-joins, multi-column conditions, expressions, and filtering within the join itself. Understanding how `ON` interacts with `LEFT JOIN` (versus `WHERE`) is especially important to avoid accidentally turning an outer join back into an inner join.
