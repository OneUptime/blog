# How to Use isNull() and isNotNull() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NULL Handling, isNull, isNotNull, SQL

Description: Learn how to use isNull() and isNotNull() in ClickHouse to safely test for NULL values in Nullable columns and build robust data pipelines.

---

## Overview

ClickHouse uses `Nullable(T)` types to represent optional values. Standard SQL NULL comparisons like `col = NULL` do not work in ClickHouse - you must use `isNull(col)` or `isNotNull(col)` to test for NULL values correctly.

## Basic Usage

```sql
SELECT
    isNull(NULL)    AS null_check,
    isNull(1)       AS not_null_check,
    isNotNull(NULL) AS not_null_null,
    isNotNull('hi') AS not_null_string
```

Output:

```text
null_check | not_null_check | not_null_null | not_null_string
1          | 0              | 0             | 1
```

## Why = NULL Does Not Work

```sql
-- This returns NULL (not a boolean), so it never matches in WHERE clauses
SELECT NULL = NULL AS always_null

-- Correct approach
SELECT isNull(NULL) AS correct_null_check
-- 1
```

## Working with Nullable Columns

```sql
CREATE TABLE user_profiles
(
    user_id    UInt64,
    name       String,
    email      Nullable(String),
    age        Nullable(UInt8),
    referrer   Nullable(String)
)
ENGINE = MergeTree()
ORDER BY user_id;

INSERT INTO user_profiles VALUES
(1, 'Alice', 'alice@example.com', 30, 'google'),
(2, 'Bob',   NULL,                25, NULL),
(3, 'Carol', 'carol@example.com', NULL, 'twitter');
```

## Filtering NULL vs Non-NULL Rows

Find users with missing email:

```sql
SELECT user_id, name
FROM user_profiles
WHERE isNull(email)
```

Find users with a known referrer:

```sql
SELECT user_id, name, referrer
FROM user_profiles
WHERE isNotNull(referrer)
```

## Counting NULLs vs Non-NULLs

```sql
SELECT
    count()                      AS total_users,
    countIf(isNull(email))       AS missing_email,
    countIf(isNotNull(email))    AS with_email,
    countIf(isNull(age))         AS missing_age
FROM user_profiles
```

## Using isNull in CASE Expressions

```sql
SELECT
    user_id,
    name,
    CASE
        WHEN isNull(email)    THEN 'no_email'
        WHEN isNull(referrer) THEN 'direct'
        ELSE referrer
    END AS referrer_label
FROM user_profiles
```

## IS NULL and IS NOT NULL SQL Syntax

ClickHouse also supports standard SQL syntax:

```sql
SELECT user_id FROM user_profiles WHERE email IS NULL
SELECT user_id FROM user_profiles WHERE email IS NOT NULL
```

This is equivalent to `isNull()` and `isNotNull()` respectively.

## Combining with ifNull for Defaults

```sql
SELECT
    user_id,
    name,
    ifNull(email, 'unknown@example.com')   AS email_or_default,
    ifNull(referrer, 'direct')             AS referrer_or_default
FROM user_profiles
```

## Data Quality Checks

Build a completeness report for your data:

```sql
SELECT
    'email'    AS field,
    countIf(isNull(email))    AS null_count,
    round(countIf(isNull(email)) / count() * 100, 1) AS null_pct
FROM user_profiles
UNION ALL
SELECT
    'age',
    countIf(isNull(age)),
    round(countIf(isNull(age)) / count() * 100, 1)
FROM user_profiles
UNION ALL
SELECT
    'referrer',
    countIf(isNull(referrer)),
    round(countIf(isNull(referrer)) / count() * 100, 1)
FROM user_profiles
```

## Nullable Type Detection

Confirm a column is Nullable using `toTypeName()`:

```sql
SELECT toTypeName(email) FROM user_profiles LIMIT 1
-- Nullable(String)
```

## Summary

`isNull()` and `isNotNull()` are the correct functions for testing NULL values in ClickHouse Nullable columns. Standard `= NULL` comparisons always return `NULL` (which never evaluates as true in WHERE clauses) and must be avoided. Use `isNull` in WHERE clauses, `countIf` for completeness reporting, and combine with `ifNull()` to substitute default values for NULL entries.
