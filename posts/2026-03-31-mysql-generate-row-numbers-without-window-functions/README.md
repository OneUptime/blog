# How to Generate Row Numbers Without Window Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Row Number, Query, User Variable, LEGACY

Description: Generate sequential row numbers in MySQL 5.6 and 5.7 without ROW_NUMBER() using user variables and self-join techniques for legacy compatibility.

---

## The Problem

MySQL 8.0 added `ROW_NUMBER() OVER()`, but MySQL 5.6 and 5.7 have no native row numbering function. Applications that need row numbers - for top-N queries, result ranking, or pagination display - must simulate this behavior.

## Sample Data

```sql
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department VARCHAR(50),
  name VARCHAR(100),
  salary DECIMAL(10,2)
);

INSERT INTO employees (department, name, salary) VALUES
('Engineering', 'Alice', 90000),
('Engineering', 'Bob',   75000),
('Engineering', 'Carol', 85000),
('Sales', 'Dave',  60000),
('Sales', 'Eve',   65000),
('Sales', 'Frank', 55000);
```

## Method 1 - Simple Row Number with User Variable

```sql
SET @row_num := 0;

SELECT
  @row_num := @row_num + 1 AS row_num,
  id,
  department,
  name,
  salary
FROM employees
ORDER BY department, salary DESC;
```

Result:

```text
+---------+----+-------------+-------+--------+
| row_num | id | department  | name  | salary |
+---------+----+-------------+-------+--------+
|       1 |  1 | Engineering | Alice |  90000 |
|       2 |  3 | Engineering | Carol |  85000 |
|       3 |  2 | Engineering | Bob   |  75000 |
|       4 |  5 | Sales       | Eve   |  65000 |
|       5 |  4 | Sales       | Dave  |  60000 |
|       6 |  6 | Sales       | Frank |  55000 |
+---------+----+-------------+-------+--------+
```

## Method 2 - Row Number per Partition (Simulating PARTITION BY)

```sql
SET @row_num := 0;
SET @prev_dept := NULL;

SELECT
  @row_num := IF(@prev_dept = department, @row_num + 1, 1) AS row_num,
  @prev_dept := department AS department,
  name,
  salary
FROM employees
ORDER BY department, salary DESC;
```

This resets the row number counter when the department changes.

## Method 3 - Using a Correlated Subquery

Without variables, use a correlated subquery that counts rows ranked before the current one:

```sql
SELECT
  (
    SELECT COUNT(*)
    FROM employees e2
    WHERE e2.department = e1.department
      AND e2.salary >= e1.salary
  ) AS rank_in_dept,
  e1.department,
  e1.name,
  e1.salary
FROM employees e1
ORDER BY e1.department, rank_in_dept;
```

This is less efficient but works when variable assignment is not available (e.g., inside views).

## Method 4 - Row Number in a Subquery for Filtering

A common use case is filtering to the top N per group. Combine the user variable method with a wrapping query:

```sql
SELECT * FROM (
  SELECT
    @row_num := IF(@prev_dept = department, @row_num + 1, 1) AS row_num,
    @prev_dept := department AS department,
    name,
    salary
  FROM employees,
       (SELECT @row_num := 0, @prev_dept := NULL) AS init
  ORDER BY department, salary DESC
) ranked
WHERE row_num <= 2;
```

This returns the top 2 earners per department.

## Inline Variable Initialization

Instead of separate SET statements, initialize variables inline:

```sql
SELECT
  @row_num := @row_num + 1 AS row_num,
  name,
  salary
FROM employees, (SELECT @row_num := 0) AS init
ORDER BY salary DESC;
```

## Summary

MySQL 5.7 and earlier simulates `ROW_NUMBER()` using user variables that increment or reset based on partition conditions. The key pattern is `@row_num := IF(@prev_group = group_col, @row_num + 1, 1)` combined with `@prev_group := group_col` for partitioned numbering. If you are on MySQL 8.0+, use `ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC)` directly.
