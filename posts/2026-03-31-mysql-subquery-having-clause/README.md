# How to Use Subqueries in the HAVING Clause in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Subquery, Database, Query

Description: Learn how to use scalar subqueries in the MySQL HAVING clause to filter grouped results against dynamically computed thresholds like averages, maximums, and percentiles.

---

The `HAVING` clause filters groups after `GROUP BY` aggregation. A subquery in `HAVING` lets you compare an aggregated group value against a dynamically computed threshold without hard-coding a number.

## How HAVING with a subquery differs from WHERE

```text
FROM -> JOIN -> WHERE (row filter) -> GROUP BY -> HAVING (group filter) -> SELECT
```

- `WHERE` cannot reference aggregate functions.
- `HAVING` can reference aggregate functions and scalar subqueries.

## Basic example: groups above the overall average

```sql
CREATE TABLE employees (
    employee_id   INT PRIMARY KEY,
    name          VARCHAR(100),
    department_id INT,
    salary        DECIMAL(10,2),
    active        TINYINT DEFAULT 1
);

-- Departments whose average salary exceeds the company-wide average
SELECT
    department_id,
    ROUND(AVG(salary), 2) AS dept_avg
FROM employees
GROUP BY department_id
HAVING AVG(salary) > (SELECT AVG(salary) FROM employees)
ORDER BY dept_avg DESC;
```

The subquery `(SELECT AVG(salary) FROM employees)` runs once and returns a single number. Each group's average is compared against it.

## Using MAX from another table as the threshold

```sql
CREATE TABLE salary_benchmarks (
    level        VARCHAR(30),
    benchmark    DECIMAL(10,2)
);

INSERT INTO salary_benchmarks VALUES ('senior', 90000.00);

-- Find departments where average salary exceeds the senior benchmark
SELECT
    department_id,
    AVG(salary) AS dept_avg
FROM employees
GROUP BY department_id
HAVING AVG(salary) > (
    SELECT benchmark FROM salary_benchmarks WHERE level = 'senior'
);
```

## Filtering by a percentage of the maximum

```sql
-- Departments whose average salary is at least 80% of the highest department average
SELECT
    department_id,
    AVG(salary) AS dept_avg
FROM employees
GROUP BY department_id
HAVING AVG(salary) >= 0.8 * (
    SELECT MAX(dept_avg)
    FROM (
        SELECT AVG(salary) AS dept_avg
        FROM employees
        GROUP BY department_id
    ) AS sub
);
```

## COUNT in HAVING compared against a subquery

```sql
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT,
    order_date  DATE,
    total       DECIMAL(10,2)
);

-- Find customers whose order count is above average
SELECT
    customer_id,
    COUNT(*) AS order_count
FROM orders
GROUP BY customer_id
HAVING COUNT(*) > (SELECT AVG(cnt) FROM (SELECT COUNT(*) AS cnt FROM orders GROUP BY customer_id) AS sub);
```

The inner derived table computes the order count per customer, and the outer subquery averages those counts.

## SUM in HAVING compared to a threshold from another table

```sql
-- Find customers who have spent more than the top spender spent last month
SELECT
    customer_id,
    SUM(total) AS total_spent
FROM orders
WHERE MONTH(order_date) = MONTH(CURDATE())
GROUP BY customer_id
HAVING SUM(total) > (
    SELECT MAX(monthly_total)
    FROM (
        SELECT customer_id, SUM(total) AS monthly_total
        FROM orders
        WHERE MONTH(order_date) = MONTH(CURDATE() - INTERVAL 1 MONTH)
        GROUP BY customer_id
    ) AS last_month
);
```

## Combining HAVING with a subquery and a WHERE clause

```sql
-- Among active employees, find departments where avg salary > company-wide avg of active employees
SELECT
    department_id,
    AVG(salary) AS dept_avg
FROM employees
WHERE active = 1                       -- row-level filter
GROUP BY department_id
HAVING AVG(salary) > (
    SELECT AVG(salary) FROM employees WHERE active = 1
)
ORDER BY dept_avg DESC;
```

## Rewriting with a CTE for readability

Complex `HAVING` subqueries become clearer as CTEs:

```sql
WITH company_avg AS (
    SELECT AVG(salary) AS avg_sal FROM employees
)
SELECT
    department_id,
    ROUND(AVG(salary), 2) AS dept_avg
FROM employees
GROUP BY department_id
HAVING AVG(salary) > (SELECT avg_sal FROM company_avg);
```

## Common mistakes

**Using a non-scalar subquery:** the subquery in `HAVING` must return one value:

```sql
-- Wrong: returns multiple rows
HAVING AVG(salary) > (SELECT salary FROM employees WHERE department_id = 5);

-- Correct: use an aggregate
HAVING AVG(salary) > (SELECT AVG(salary) FROM employees WHERE department_id = 5);
```

**Referencing a SELECT alias in HAVING:** MySQL allows referencing SELECT-list aliases in `HAVING`, which is an extension to standard SQL. The subquery is evaluated independently, not as an alias lookup.

## Summary

Subqueries in the `HAVING` clause let you filter groups against dynamically computed values. The subquery must be scalar. It runs once (non-correlated) and its result is compared against each group's aggregate value. For complex threshold logic, move the subquery into a CTE to keep the main query readable.
