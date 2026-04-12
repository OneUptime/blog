# How to Use IFNULL() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ifNull, NULL Handling, SQL Functions

Description: Learn how to use the IFNULL() function in MySQL to replace NULL values with a default, with practical SELECT and aggregate examples.

---

## What is IFNULL()

MySQL's `IFNULL()` function returns the first argument if it is not NULL, or returns the second argument as a default if the first is NULL.

Syntax:

```sql
IFNULL(expression, default_value)
```

It is a shorthand for the common pattern `IF(expr IS NULL, default, expr)`.

## Basic Usage

```sql
SELECT IFNULL(NULL, 'default value');
-- Output: default value

SELECT IFNULL('actual value', 'default value');
-- Output: actual value

SELECT IFNULL(0, 'default');
-- Output: 0  (0 is NOT NULL)

SELECT IFNULL('', 'default');
-- Output: ''  (empty string is NOT NULL)
```

## Using IFNULL() in a SELECT

```sql
SELECT
  name,
  IFNULL(phone, 'N/A') AS phone,
  IFNULL(email, 'no-email@domain.com') AS email
FROM employees;
```

Output:

```text
+-------------+-----------+----------------------------+
| name        | phone     | email                      |
+-------------+-----------+----------------------------+
| Alice Smith | 555-1234  | alice@example.com          |
| Bob Jones   | N/A       | no-email@domain.com        |
+-------------+-----------+----------------------------+
```

## IFNULL() with Numeric Defaults

Useful to avoid NULL in arithmetic:

```sql
-- Without IFNULL: NULL bonus makes the total NULL
SELECT name, salary + bonus AS total FROM employees;

-- With IFNULL: treat NULL bonus as 0
SELECT
  name,
  salary + IFNULL(bonus, 0) AS total_compensation
FROM employees;
```

## IFNULL() with Aggregate Functions

```sql
SELECT
  department,
  AVG(IFNULL(bonus, 0)) AS avg_bonus,
  SUM(IFNULL(overtime_hours, 0)) AS total_overtime
FROM employees
GROUP BY department;
```

## IFNULL() vs COALESCE()

`IFNULL()` only accepts two arguments. `COALESCE()` accepts multiple and returns the first non-NULL:

```sql
-- IFNULL: two arguments
SELECT IFNULL(primary_phone, 'N/A') FROM contacts;

-- COALESCE: use first available from multiple columns
SELECT COALESCE(mobile_phone, home_phone, work_phone, 'N/A') FROM contacts;
```

## IFNULL() vs NULLIF()

`NULLIF()` is the reverse - it converts a value TO NULL:

```sql
-- IFNULL: NULL -> default
SELECT IFNULL(NULL, 'default');   -- Output: default

-- NULLIF: specific value -> NULL
SELECT NULLIF('N/A', 'N/A');      -- Output: NULL
SELECT NULLIF('real value', 'N/A'); -- Output: real value
```

## Using IFNULL() in JOINs

Useful when LEFT JOIN produces NULLs:

```sql
SELECT
  e.name,
  IFNULL(d.department_name, 'Unassigned') AS department
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id;
```

## IFNULL() in ORDER BY

```sql
-- Sort NULL salaries last (treat them as 0 in ascending order)
SELECT name, salary
FROM employees
ORDER BY IFNULL(salary, 99999999);
```

## IFNULL() in UPDATE

```sql
-- Set bonus to 500 only if it is currently NULL
UPDATE employees
SET bonus = IFNULL(bonus, 500);
```

## Summary

`IFNULL(expression, default)` in MySQL replaces NULL values with a specified default, making it ideal for display formatting, safe arithmetic, and handling LEFT JOIN NULLs. Use it when you have exactly two choices (value or default). For fallback chains across multiple columns, use `COALESCE()` instead. Remember that `IFNULL()` does not convert empty strings or zero - only true NULL values.
