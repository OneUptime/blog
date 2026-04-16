# How to Use isNull() and isNotNull() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NULL Handling, Conditional Function, Data Quality, Filtering

Description: Learn how to use isNull() and isNotNull() in ClickHouse for null checks, filtering, data quality validation, and conditional expressions.

---

`isNull(x)` returns 1 (UInt8) if `x` is NULL, and 0 otherwise. `isNotNull(x)` returns the opposite: 1 if `x` is not NULL. They are equivalent to the standard SQL `IS NULL` and `IS NOT NULL` operators but in function form, which makes them usable inside other function calls and expressions.

## Basic Usage

```sql
-- isNull() returns 1 for NULL, 0 for non-NULL
SELECT isNull(NULL)  AS null_check;     -- returns 1
SELECT isNull('abc') AS notnull_check;  -- returns 0

-- isNotNull() is the inverse
SELECT isNotNull(NULL)  AS not_null_check;   -- returns 0
SELECT isNotNull('abc') AS not_null_check2;  -- returns 1

-- Apply to a column
SELECT
    user_id,
    email,
    isNull(email)    AS email_missing,
    isNotNull(phone) AS has_phone
FROM users
LIMIT 10;
```

## NULL Filtering in WHERE Clauses

Use `isNull` and `isNotNull` (or the SQL equivalents) to filter rows based on NULL status.

```sql
-- Get users with no email address
SELECT user_id, name
FROM users
WHERE isNull(email)
LIMIT 20;

-- Equivalent using SQL syntax
SELECT user_id, name
FROM users
WHERE email IS NULL
LIMIT 20;

-- Get users who have both email and phone
SELECT user_id, name, email, phone
FROM users
WHERE isNotNull(email) AND isNotNull(phone)
LIMIT 20;
```

## Data Quality Checks

Use `isNull` to measure data completeness across columns.

```sql
-- Count NULL and non-NULL values per column
SELECT
    count()                   AS total_rows,
    countIf(isNull(email))    AS missing_email,
    countIf(isNull(phone))    AS missing_phone,
    countIf(isNull(address))  AS missing_address,
    countIf(isNotNull(email)) AS has_email,
    countIf(isNotNull(phone)) AS has_phone
FROM users;
```

## Completeness Percentage Report

```sql
-- Calculate completeness percentage for each column
SELECT
    count()                                          AS total,
    round(100.0 * countIf(isNotNull(email))    / count(), 2) AS email_pct,
    round(100.0 * countIf(isNotNull(phone))    / count(), 2) AS phone_pct,
    round(100.0 * countIf(isNotNull(address))  / count(), 2) AS address_pct,
    round(100.0 * countIf(isNotNull(birthdate))/ count(), 2) AS birthdate_pct
FROM users;
```

## Using isNull in Conditional Expressions

`isNull()` is useful inside `if()` and `multiIf()` as a function-form alternative to the `IS NULL` operator.

```sql
-- Use isNull inside if()
SELECT
    user_id,
    if(isNull(email), 'no email', email) AS email_display
FROM users
LIMIT 10;

-- Use isNull inside multiIf()
SELECT
    user_id,
    multiIf(
        isNotNull(mobile_phone), mobile_phone,
        isNotNull(home_phone),   home_phone,
        isNotNull(work_phone),   work_phone,
        'no phone'
    ) AS best_phone
FROM users
LIMIT 10;
```

## NULL Handling in Joins

After a LEFT JOIN, columns from the right table are NULL for rows with no match. Use `isNull` to identify unmatched rows.

```sql
-- Find users who have never placed an order
SELECT
    u.user_id,
    u.email
FROM users AS u
LEFT JOIN orders AS o ON u.user_id = o.user_id
WHERE isNull(o.order_id)
LIMIT 20;
```

## Aggregate Functions and NULL

Most aggregate functions in ClickHouse ignore NULL values automatically. Note that `count()` with no argument counts all rows (including NULLs), while `count(col)` counts only non-NULL values of `col`. Use `countIf(isNull(...))` to count NULLs explicitly.

```sql
-- count() counts all rows; count(value) counts non-NULL values
SELECT
    count()                 AS total_rows,
    count(value)            AS non_null_count,
    countIf(isNull(value))  AS null_count
FROM my_table;
```

## isNull vs = NULL

In SQL, comparing to NULL with `=` does not work as expected because `NULL = NULL` is NULL (not true). Always use `isNull()` or `IS NULL` for NULL checks.

```sql
-- WRONG: This never matches any rows
SELECT * FROM users WHERE email = NULL;

-- CORRECT:
SELECT * FROM users WHERE isNull(email);
-- or equivalently:
SELECT * FROM users WHERE email IS NULL;
```

## Summary

`isNull(x)` and `isNotNull(x)` return 1 or 0 based on whether a value is NULL. They are equivalent to `IS NULL` and `IS NOT NULL` but in function form, making them composable inside other expressions. Use them for NULL filtering, data quality checks, completeness reporting, and detecting unmatched rows after LEFT JOINs. Never compare to NULL using `=` - always use `isNull()` or `IS NULL`.
