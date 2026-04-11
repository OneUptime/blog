# What Is a User-Defined Variable in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Variable, SQL, Session, Query

Description: User-defined variables in MySQL are session-scoped variables you define with @ prefix to store values temporarily during a connection for use across multiple statements.

---

## Overview

A user-defined variable in MySQL is a variable that you create and set within a session to hold a value temporarily. These variables are prefixed with `@` and are scoped to the current connection - they persist for the duration of the session and are automatically discarded when the connection closes. No explicit declaration is required.

User-defined variables are useful for passing values between queries, accumulating running totals, and simplifying complex multi-step SQL logic without needing stored procedures.

## Setting a User-Defined Variable

Use the `SET` statement or the `:=` assignment operator inside a query:

```sql
-- Using SET
SET @greeting = 'Hello, World!';
SET @count = 0;

-- Using := in a SELECT
SELECT @total := SUM(amount) FROM orders;
```

Note: assigning user variables with `:=` inside `SELECT` statements is deprecated as of MySQL 8.0 and may be removed in a future release. Prefer using `SET` for variable assignment.

## Reading a User-Defined Variable

```sql
SELECT @greeting;
```

```text
+----------------+
| @greeting      |
+----------------+
| Hello, World!  |
+----------------+
```

If a variable has never been set, its value is `NULL`.

## Supported Data Types

User-defined variables can hold the following types: integer, decimal, floating-point, binary string, or non-binary string. MySQL determines the type from the assigned value.

```sql
SET @int_val = 42;
SET @str_val = 'mysql';
SET @float_val = 3.14;
SET @null_val = NULL;
```

## Using Variables in Queries

A common use case is carrying a value across multiple queries:

```sql
SET @max_salary = (SELECT MAX(salary) FROM employees);

SELECT name, salary
FROM employees
WHERE salary = @max_salary;
```

## Running Totals with User-Defined Variables

Before window functions were widely available, user-defined variables were the standard technique for computing running totals:

```sql
SET @running_total = 0;

SELECT
  order_date,
  amount,
  @running_total := @running_total + amount AS running_total
FROM orders
ORDER BY order_date;
```

Note: in MySQL 8.0+, prefer window functions for running totals as they are cleaner and more reliable.

## Simulating Row Numbers (Legacy Technique)

```sql
SET @row_num = 0;

SELECT
  @row_num := @row_num + 1 AS row_num,
  name
FROM employees
ORDER BY name;
```

Again, the `ROW_NUMBER()` window function is preferable in MySQL 8.0.

## Variable Scope and Lifetime

- Variables are session-specific: two connections cannot share user-defined variables
- Variables persist until the session ends or they are explicitly reassigned
- Variables are not transaction-aware - rolling back a transaction does not restore a previous variable value

```sql
START TRANSACTION;
SET @x = 10;
ROLLBACK;
SELECT @x;  -- still returns 10
```

## Summary

User-defined variables in MySQL provide a lightweight mechanism for storing temporary values within a session. They are particularly useful for passing values between statements and implementing iterative logic in SQL. While many use cases have been superseded by window functions in MySQL 8.0, user-defined variables remain a practical tool for dynamic, session-scoped data manipulation.