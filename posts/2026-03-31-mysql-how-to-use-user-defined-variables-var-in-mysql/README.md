# How to Use User-Defined Variables (@var) in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Variable, User-Defined Variables, SQL

Description: Learn how to use user-defined variables (@var) in MySQL to store and reuse values within a session with practical examples.

---

## What Are User-Defined Variables

User-defined variables in MySQL are session-level variables prefixed with `@`. They allow you to store a value and reference it later in the same session. They are loosely typed, meaning the type is determined by the assigned value and can change dynamically.

Key characteristics:
- Prefixed with `@` (e.g., `@my_var`)
- Scoped to the current session
- Not visible to other connections
- Persist until the session ends or are reassigned
- Support types: integer, decimal, float, string, binary, NULL

## Assigning Variables

Use `SET` or `:=` in a `SELECT` to assign a variable:

```sql
-- Using SET
SET @greeting = 'Hello, MySQL!';
SET @count = 0;
SET @price = 99.95;

-- Using SELECT ... INTO
SELECT MAX(salary) INTO @max_salary FROM employees;

-- Using := in SELECT
SELECT @total := SUM(amount) FROM orders WHERE status = 'completed';
```

## Reading Variable Values

```sql
SELECT @greeting;
-- Output: Hello, MySQL!

SELECT @max_salary;
SELECT @total;
```

## Incrementing a Counter

A classic use of user-defined variables is creating row numbers:

```sql
SET @row_num = 0;

SELECT
  @row_num := @row_num + 1 AS row_number,
  name,
  salary
FROM employees
ORDER BY salary DESC;
```

## Using Variables in WHERE Clauses

```sql
SET @min_price = 100;
SET @max_price = 500;

SELECT name, price
FROM products
WHERE price BETWEEN @min_price AND @max_price;
```

## Reusing Query Results

Variables are useful to avoid repeating subqueries:

```sql
SET @avg_salary = (SELECT AVG(salary) FROM employees);

SELECT name, salary,
  CASE
    WHEN salary > @avg_salary THEN 'Above Average'
    WHEN salary < @avg_salary THEN 'Below Average'
    ELSE 'Average'
  END AS salary_category
FROM employees;
```

## Generating Running Totals

```sql
SET @running_total = 0;

SELECT
  order_date,
  amount,
  @running_total := @running_total + amount AS running_total
FROM orders
ORDER BY order_date;
```

## Using Variables with PREPARE

User-defined variables work with prepared statements:

```sql
SET @sql = 'SELECT * FROM orders WHERE user_id = ?';
SET @uid = 42;

PREPARE stmt FROM @sql;
EXECUTE stmt USING @uid;
DEALLOCATE PREPARE stmt;
```

## Variable Scope and Lifetime

```sql
-- Variable is NULL until set
SELECT @undefined_var;
-- Returns NULL

-- Variables persist for the session
SET @session_id = CONNECTION_ID();
SELECT @session_id;
```

## Common Pitfalls

- Do not rely on the evaluation order of user-defined variables in `SELECT` expressions — even with `ORDER BY`, the order in which row expressions are evaluated is not guaranteed by MySQL. For reliable row numbering and running totals, use window functions (`ROW_NUMBER()`, `SUM() OVER()`) available in MySQL 8.0+.
- Starting with MySQL 8.0.13, assigning values to user variables in statements other than `SET` is deprecated and may be removed in a future release. Prefer `SET` or window functions instead.
- Variables are not transaction-safe: they are not rolled back if a transaction is rolled back.

```sql
-- Potentially unreliable - evaluation order is not guaranteed
SELECT @n := @n + 1 AS n, name FROM employees; -- avoid this pattern

-- Preferred approach in MySQL 8.0+
SELECT ROW_NUMBER() OVER (ORDER BY name) AS n, name FROM employees;
```

## Summary

User-defined variables (`@var`) in MySQL are session-scoped variables that store values across multiple statements in the same connection. They are useful for counters, running totals, caching subquery results, and building dynamic SQL. Assign them with `SET` or `:=` in a `SELECT`, and remember they are not visible outside the current session.
