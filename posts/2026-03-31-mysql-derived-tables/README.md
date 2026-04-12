# What Is a Derived Table in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Derived Table, Subquery, SQL, Query Optimization

Description: A derived table in MySQL is a subquery used in the FROM clause that produces a temporary result set, allowing you to filter or aggregate data before joining or selecting.

---

## Overview

A derived table in MySQL is a subquery that appears in the `FROM` clause of a SQL statement. The query engine executes the subquery first, producing a temporary virtual table, and the outer query then operates on that result. Derived tables are not stored anywhere - they exist only for the duration of the query.

Derived tables were available in MySQL long before Common Table Expressions (CTEs) were introduced. They remain widely used and are functionally equivalent to CTEs in many cases, though CTEs often provide better readability.

## Basic Syntax

```sql
SELECT col1, col2
FROM (
    SELECT col1, col2
    FROM some_table
    WHERE condition
) AS derived_alias;
```

The alias after the closing parenthesis is mandatory in MySQL - omitting it causes an error.

## Simple Example

Find departments with more than 5 employees by first aggregating in a derived table:

```sql
SELECT dept_name, emp_count
FROM (
    SELECT department_id, COUNT(*) AS emp_count
    FROM employees
    GROUP BY department_id
) AS dept_counts
JOIN departments d ON d.id = dept_counts.department_id
WHERE emp_count > 5;
```

The inner query produces the per-department count. The outer query joins that result to the departments table to retrieve the name.

## Filtering Before Joining

Derived tables are useful for reducing the number of rows before an expensive join:

```sql
SELECT c.name, recent.total
FROM customers c
JOIN (
    SELECT customer_id, SUM(amount) AS total
    FROM orders
    WHERE order_date >= '2025-01-01'
    GROUP BY customer_id
) AS recent ON c.id = recent.customer_id;
```

Without the derived table, the join would process the entire orders table before filtering by date.

## Derived Tables vs CTEs

Both approaches produce the same result. The CTE version:

```sql
WITH recent AS (
    SELECT customer_id, SUM(amount) AS total
    FROM orders
    WHERE order_date >= '2025-01-01'
    GROUP BY customer_id
)
SELECT c.name, recent.total
FROM customers c
JOIN recent ON c.id = recent.customer_id;
```

CTEs improve readability when subqueries are complex or reused multiple times. Derived tables remain useful for simple one-off inline transformations.

## Nesting Derived Tables

Derived tables can be nested, though readability degrades quickly:

```sql
SELECT final.dept_id, final.avg_salary
FROM (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM (
        SELECT dept_id, salary
        FROM employees
        WHERE active = 1
    ) AS active_employees
    GROUP BY dept_id
) AS final
JOIN departments d ON d.id = final.dept_id
ORDER BY final.avg_salary DESC;
```

## Performance Considerations

In MySQL 5.6 and earlier, derived tables were always materialized into a temporary table, which had performance costs. Starting in MySQL 5.7, the optimizer can merge simple derived tables directly into the outer query, eliminating the temporary table overhead. You can verify this with `EXPLAIN`:

```sql
EXPLAIN SELECT * FROM (SELECT id, name FROM employees WHERE active = 1) AS t;
```

## Summary

A derived table is a subquery in the FROM clause that acts as a temporary, in-query virtual table. It enables pre-aggregation, pre-filtering, and data transformation before the outer query runs. While CTEs have largely replaced derived tables for readability in MySQL 8.0, derived tables are still a fundamental SQL technique that any MySQL developer should understand and use when appropriate.