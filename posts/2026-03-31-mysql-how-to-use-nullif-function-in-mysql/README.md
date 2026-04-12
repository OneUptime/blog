# How to Use NULLIF() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NULLIF, NULL Handling, SQL Functions

Description: Learn how to use the NULLIF() function in MySQL to convert a specific value to NULL, with practical examples for division safety and data cleaning.

---

## What is NULLIF()

MySQL's `NULLIF()` function returns NULL if the two arguments are equal, otherwise returns the first argument.

Syntax:

```sql
NULLIF(expression1, expression2)
```

It is equivalent to:

```sql
CASE WHEN expression1 = expression2 THEN NULL ELSE expression1 END
```

`NULLIF()` is the logical opposite of `IFNULL()`.

## Basic Usage

```sql
SELECT NULLIF(10, 10);    -- Output: NULL (values are equal)
SELECT NULLIF(10, 20);    -- Output: 10   (values are not equal)
SELECT NULLIF('a', 'a');  -- Output: NULL
SELECT NULLIF('a', 'b');  -- Output: a
SELECT NULLIF(NULL, 10);  -- Output: NULL (first arg is already NULL)
```

## Preventing Division by Zero

The most common use case is safely dividing by a column that may contain zero:

```sql
-- Without NULLIF: division by zero produces a warning and returns NULL
SELECT total_sales / total_orders AS avg_order_value FROM store_stats;

-- With NULLIF: cleanly returns NULL without a division-by-zero warning
SELECT total_sales / NULLIF(total_orders, 0) AS avg_order_value
FROM store_stats;
```

Combine with `IFNULL()` to return 0 instead of NULL:

```sql
SELECT IFNULL(total_sales / NULLIF(total_orders, 0), 0) AS avg_order_value
FROM store_stats;
```

## Treating Placeholder Values as NULL

Sometimes data uses sentinel values like `'N/A'`, `'unknown'`, or `-1` to represent missing data:

```sql
SELECT
  name,
  NULLIF(phone, 'N/A') AS phone,
  NULLIF(age, -1) AS age,
  NULLIF(status, 'unknown') AS status
FROM contacts;
```

This lets aggregate functions ignore placeholder values:

```sql
-- Count records with a real phone number (not 'N/A')
SELECT COUNT(NULLIF(phone, 'N/A')) AS real_phone_count
FROM contacts;
```

## Using NULLIF() in Aggregate Queries

```sql
-- Average age excluding sentinel value -1
SELECT AVG(NULLIF(age, -1)) AS avg_age FROM users;

-- Count distinct non-empty categories
SELECT COUNT(DISTINCT NULLIF(category, '')) AS category_count FROM products;
```

## NULLIF() in Data Migration and Cleanup

```sql
-- Normalize empty strings to NULL
UPDATE users
SET middle_name = NULLIF(TRIM(middle_name), '');

-- Replace 'NA' sentinel with proper NULL
UPDATE products
SET color = NULLIF(color, 'NA');
```

## Combining NULLIF() with COALESCE()

```sql
-- Try primary, then fallback, ignoring placeholder values
SELECT
  name,
  COALESCE(
    NULLIF(mobile_phone, 'N/A'),
    NULLIF(home_phone, 'N/A'),
    'No phone'
  ) AS best_phone
FROM contacts;
```

## NULLIF() vs IF() vs IFNULL()

```sql
-- NULLIF: specific value becomes NULL
SELECT NULLIF(score, 0);     -- 0 becomes NULL

-- IFNULL: NULL becomes a default
SELECT IFNULL(score, 0);     -- NULL becomes 0

-- IF: full conditional expression
SELECT IF(score = 0, NULL, score);  -- Same as NULLIF(score, 0)
```

## Summary

`NULLIF(expr1, expr2)` converts a matching value to NULL, making it the ideal solution for safe division (avoid divide-by-zero errors), treating sentinel placeholder values as NULL in aggregations, and normalizing data during cleanup. Pair it with `IFNULL()` or `COALESCE()` to chain NULL handling logic in complex expressions.
