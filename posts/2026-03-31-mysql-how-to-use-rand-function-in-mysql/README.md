# How to Use RAND() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Rand, Random Numbers, Database, SQL Functions

Description: Learn how to use MySQL's RAND() function to generate random numbers, shuffle query results, and select random rows from tables.

---

## Overview

The `RAND()` function in MySQL returns a random floating-point value between 0 and 1. It is widely used for sampling data, generating test values, shuffling results, and selecting random records from tables.

## Basic Syntax

```sql
RAND()
RAND(seed)
```

Without arguments, `RAND()` generates a different value on each call. With an integer seed, it returns a reproducible sequence useful for testing.

## Generating Random Numbers

```sql
-- Generate a random float between 0 and 1
SELECT RAND();

-- Generate a random float with a fixed seed
SELECT RAND(42);

-- Generate a random integer between 1 and 100
SELECT FLOOR(1 + RAND() * 100) AS random_int;

-- Generate a random integer between 50 and 150
SELECT FLOOR(50 + RAND() * 101) AS random_in_range;
```

## Selecting Random Rows

```sql
-- Select 5 random rows from a table
SELECT * FROM products
ORDER BY RAND()
LIMIT 5;
```

Note: `ORDER BY RAND()` is simple but can be slow on large tables because MySQL must assign a random value to every row before sorting. For large datasets consider the offset method below.

## Efficient Random Row Selection on Large Tables

```sql
-- Faster approach using a random offset
SELECT * FROM products
WHERE id >= (
  SELECT FLOOR(RAND() * (SELECT MAX(id) FROM products))
)
ORDER BY id
LIMIT 1;
```

## Using RAND() in Column Expressions

```sql
-- Assign a random score to each row
SELECT name, price, RAND() AS random_score
FROM products
ORDER BY random_score;

-- Randomly assign users to A/B test groups
SELECT user_id,
  CASE WHEN RAND() < 0.5 THEN 'A' ELSE 'B' END AS test_group
FROM users;
```

## Seeded Randomness for Reproducibility

```sql
-- Same seed always produces same sequence in a query
SELECT RAND(100) AS r1, RAND(200) AS r2;

-- Useful in stored procedures for deterministic testing
DELIMITER $$
CREATE PROCEDURE generate_test_data()
BEGIN
  DECLARE i INT DEFAULT 1;
  WHILE i <= 10 DO
    INSERT INTO test_values (val) VALUES (FLOOR(1 + RAND(i) * 1000));
    SET i = i + 1;
  END WHILE;
END$$
DELIMITER ;
```

## Generating Random Strings

```sql
-- Generate a random hex-like string using MD5 and RAND
SELECT LEFT(MD5(RAND()), 12) AS random_token;

-- Generate a random UUID-style token
SELECT CONCAT(
  LEFT(MD5(RAND()), 8), '-',
  LEFT(MD5(RAND()), 4)
) AS random_ref;
```

## Practical Example: Random Coupon Assignment

```sql
CREATE TABLE coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20),
  discount_pct INT
);

INSERT INTO coupons (code, discount_pct) VALUES
('SAVE10', 10), ('SAVE20', 20), ('SAVE30', 30);

-- Pick a random coupon to assign to a new order
SELECT code, discount_pct
FROM coupons
ORDER BY RAND()
LIMIT 1;
```

## Performance Considerations

- `ORDER BY RAND()` forces a full table scan and sort - avoid it on tables with millions of rows.
- For large tables, compute a random offset or use a separate random index column.
- Seeded `RAND(n)` is useful in unit tests but should not be used for security-sensitive randomness.

## Summary

`RAND()` is a straightforward MySQL function for generating random floating-point values between 0 and 1. You can scale and floor the result to get integers in any range, use it to shuffle query results with `ORDER BY RAND()`, or generate random tokens. For performance-critical random row selection on large tables, use offset-based techniques instead of sorting the full result set.
