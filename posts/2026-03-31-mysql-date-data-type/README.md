# How to Use DATE Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Data Type, Date, Storage

Description: Learn how the DATE data type works in MySQL, its storage format, supported range, date functions, and best practices for date-only columns.

---

## What Is the DATE Data Type

`DATE` stores a calendar date without any time component, in the format `YYYY-MM-DD`. MySQL uses 3 bytes of storage for each `DATE` value.

The supported range is `1000-01-01` to `9999-12-31`.

## Declaring a DATE Column

```sql
CREATE TABLE employees (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    birth_date DATE,
    hire_date  DATE NOT NULL
);
```

## Inserting DATE Values

```sql
INSERT INTO employees (name, birth_date, hire_date)
VALUES ('Alice Johnson', '1990-05-14', '2020-03-01');

-- MySQL also accepts these formats in some contexts
INSERT INTO employees (name, birth_date, hire_date)
VALUES ('Bob Smith', '19851201', CURDATE());
```

## Querying by Date

```sql
-- Exact match
SELECT * FROM employees WHERE hire_date = '2020-03-01';

-- Range query
SELECT * FROM employees
WHERE hire_date BETWEEN '2020-01-01' AND '2020-12-31';

-- Using date functions
SELECT * FROM employees
WHERE YEAR(hire_date) = 2023;
```

## Useful DATE Functions

```sql
-- Current date
SELECT CURDATE();          -- 2026-03-31
SELECT CURRENT_DATE();     -- same as CURDATE()

-- Arithmetic
SELECT hire_date,
       DATE_ADD(hire_date, INTERVAL 90 DAY) AS probation_end
FROM employees;

-- Difference in days
SELECT name,
       DATEDIFF(CURDATE(), hire_date) AS days_employed
FROM employees;

-- Formatting output
SELECT name, DATE_FORMAT(hire_date, '%W, %M %e, %Y') AS hire_label
FROM employees;
-- Output: Sunday, March 1, 2020
```

## Extracting Parts of a Date

```sql
SELECT
    name,
    YEAR(hire_date)  AS hire_year,
    MONTH(hire_date) AS hire_month,
    DAY(hire_date)   AS hire_day,
    DAYNAME(hire_date) AS day_name,
    WEEK(hire_date)  AS week_num
FROM employees;
```

## Indexing DATE Columns

Indexing a `DATE` column enables efficient range scans:

```sql
ALTER TABLE employees ADD INDEX idx_hire_date (hire_date);

-- Efficient: uses the index
SELECT * FROM employees WHERE hire_date >= '2023-01-01';

-- Avoid wrapping indexed columns in functions (defeats the index)
-- SELECT * FROM employees WHERE YEAR(hire_date) = 2023;  -- slow
```

## DATE vs DATETIME vs TIMESTAMP

| Type | Stores | Bytes | Range |
|---|---|---|---|
| DATE | Date only | 3 | 1000-01-01 to 9999-12-31 |
| DATETIME | Date + time | 5 | 1000-01-01 to 9999-12-31 |
| TIMESTAMP | Date + time (UTC) | 4 | 1970-01-01 to 2038-01-19 |

Use `DATE` when you only need the calendar date (birthdays, deadlines, event dates) and the time-of-day is irrelevant.

## Summary

`DATE` is a space-efficient 3-byte type for storing calendar dates. It integrates with a rich set of MySQL date functions for arithmetic, extraction, and formatting. Index `DATE` columns and avoid wrapping them in functions in `WHERE` clauses to maintain query performance. When time-of-day matters, use `DATETIME` or `TIMESTAMP` instead.
