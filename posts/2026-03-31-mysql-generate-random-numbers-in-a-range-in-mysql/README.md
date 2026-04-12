# How to Generate Random Numbers in a Range in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Random Numbers, Rand Function, Math Function, SQL

Description: Learn how to generate random integers and floats within a specific range in MySQL using RAND(), FLOOR(), and CEIL() with practical examples.

---

## Introduction

MySQL's `RAND()` function returns a random float between 0 and 1. To generate random numbers within a specific range, you combine `RAND()` with mathematical functions like `FLOOR()`, `CEIL()`, or `ROUND()`. This is useful for test data generation, random sampling, simulations, and A/B testing.

## Random Integer Formula

To generate a random integer between `min` and `max` (both inclusive):

```sql
FLOOR(RAND() * (max - min + 1)) + min
```

## Basic Range Examples

```sql
-- Random integer between 1 and 10
SELECT FLOOR(RAND() * 10) + 1 AS rand_1_to_10;

-- Random integer between 0 and 99
SELECT FLOOR(RAND() * 100) AS rand_0_to_99;

-- Random integer between 50 and 100
SELECT FLOOR(RAND() * 51) + 50 AS rand_50_to_100;

-- Random integer between 100 and 999
SELECT FLOOR(RAND() * 900) + 100 AS rand_100_to_999;
```

## Random Float in a Range

To generate a random float between `min` and `max`:

```sql
-- General formula
RAND() * (max - min) + min

-- Random float between 1.0 and 10.0
SELECT RAND() * 9.0 + 1.0 AS rand_float;

-- Round to 2 decimal places
SELECT ROUND(RAND() * 9.0 + 1.0, 2) AS rand_float_2dp;
```

## Generating a Series of Random Numbers

```sql
-- 10 random integers between 1 and 100
SELECT FLOOR(RAND() * 100) + 1 AS random_number
FROM (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
) AS n;
```

## Random Number for Each Row in a Table

```sql
SELECT
  id,
  name,
  FLOOR(RAND() * 100) + 1 AS random_score
FROM students;
```

## Generating Test Data with Random Values

```sql
-- Insert test records with random scores
INSERT INTO test_scores (student_id, subject, score, test_date)
SELECT
  id,
  'Math',
  FLOOR(RAND() * 41) + 60,  -- Score between 60 and 100
  DATE_ADD('2024-01-01', INTERVAL FLOOR(RAND() * 366) DAY)
FROM students;
```

## Simulating Dice Rolls

```sql
-- Single six-sided die
SELECT FLOOR(RAND() * 6) + 1 AS d6;

-- Two dice
SELECT die1, die2, die1 + die2 AS total
FROM (
  SELECT
    FLOOR(RAND() * 6) + 1 AS die1,
    FLOOR(RAND() * 6) + 1 AS die2
) AS rolls;
```

## Random Boolean (True/False)

```sql
-- 50/50 random boolean
SELECT ROUND(RAND()) AS random_bool;
-- Returns: 0 or 1

-- Biased: ~70% true
SELECT IF(RAND() < 0.7, 1, 0) AS biased_bool;
```

## Random A/B Test Assignment

```sql
-- Assign users to A or B groups randomly with equal probability
UPDATE users
SET test_group = IF(RAND() < 0.5, 'A', 'B')
WHERE test_group IS NULL;
```

## Random Price Variation

```sql
SELECT
  product_name,
  base_price,
  ROUND(base_price * (0.9 + RAND() * 0.2), 2) AS varied_price
  -- Varies price by +/-10%
FROM products;
```

## Generating Random Dates in a Range

```sql
-- Random date between 2024-01-01 and 2024-12-31
SELECT DATE_ADD('2024-01-01', INTERVAL FLOOR(RAND() * 366) DAY) AS random_date;
```

## Reproducible Random Numbers with Seed

```sql
-- Seeded RAND() for reproducible results (useful for testing)
SELECT FLOOR(RAND(42) * 100) + 1;  -- Always returns same value with seed 42
```

## Random Number Distribution Visualization

```sql
-- Count distribution of random numbers in buckets (should be roughly equal)
SELECT
  bucket,
  COUNT(*) AS frequency
FROM (
  SELECT FLOOR(RAND() * 10) AS bucket
  FROM information_schema.columns
  LIMIT 1000
) AS samples
GROUP BY bucket
ORDER BY bucket;
```

## Performance Consideration

Note that `RAND()` is evaluated once per row in most contexts but may behave unexpectedly with `ORDER BY RAND()` in large queries. For generating many random values, do it in application code and INSERT the results for better control.

## Summary

Generate random integers in a range with `FLOOR(RAND() * (max - min + 1)) + min` and random floats with `RAND() * (max - min) + min`. MySQL's `RAND()` function is useful for test data generation, simulations, A/B assignments, and random sampling. Use a seed with `RAND(seed)` for reproducible sequences during testing.
