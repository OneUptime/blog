# How to Generate Number Sequences with Recursive CTEs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Recursive CTE, SQL, Sequence, Query

Description: Learn how to generate integer sequences, arithmetic progressions, and custom number series in MySQL using recursive CTEs without any procedural code.

---

## When Do You Need a Number Sequence?

Number sequences are useful in several scenarios:

- Generating test data by cross-joining with a sequence
- Creating pagination ranges
- Simulating `generate_series()` (PostgreSQL) behavior
- Building Cartesian products for matrix-style reports
- Filling gaps in numeric ID ranges

MySQL has no built-in `generate_series()` function, but `WITH RECURSIVE` provides the same capability.

## Basic Integer Sequence

```sql
WITH RECURSIVE nums AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM nums WHERE n < 10
)
SELECT n FROM nums;
```

This produces integers 1 through 10.

## Parameterized Sequence

Wrap the start and end values in a separate CTE so they are defined once:

```sql
WITH RECURSIVE
  params AS (
    SELECT 1 AS start_val, 100 AS end_val
  ),
  seq AS (
    SELECT start_val AS n FROM params
    UNION ALL
    SELECT n + 1 FROM seq, params WHERE n < end_val
  )
SELECT n FROM seq;
```

## Arithmetic Progression (Custom Step)

Increment by a value other than 1:

```sql
-- Even numbers 0 to 20
WITH RECURSIVE evens AS (
  SELECT 0 AS n
  UNION ALL
  SELECT n + 2 FROM evens WHERE n < 20
)
SELECT n FROM evens;
```

```sql
-- Multiples of 5 from 0 to 100
WITH RECURSIVE multiples AS (
  SELECT 0 AS n
  UNION ALL
  SELECT n + 5 FROM multiples WHERE n < 100
)
SELECT n FROM multiples;
```

## Generating Rows for Test Data

Use a sequence as a row generator to quickly populate tables with test data:

```sql
WITH RECURSIVE n AS (
  SELECT 1 AS i UNION ALL SELECT i + 1 FROM n WHERE i < 1000
)
INSERT INTO orders (customer_id, total, created_at)
SELECT
  FLOOR(1 + RAND() * 100),
  ROUND(10 + RAND() * 990, 2),
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY)
FROM n;
```

## Filling Gaps in an ID Range

Find missing IDs in a sequence by comparing the generated series to actual table rows:

```sql
WITH RECURSIVE all_ids AS (
  SELECT 1 AS id
  UNION ALL
  SELECT id + 1 FROM all_ids WHERE id < 500
)
SELECT a.id AS missing_id
FROM all_ids a
LEFT JOIN orders o ON a.id = o.order_id
WHERE o.order_id IS NULL;
```

## Generating a Multiplication Table

Cross-join two sequences to create a matrix:

```sql
WITH RECURSIVE r AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM r WHERE i < 10),
              c AS (SELECT 1 AS j UNION ALL SELECT j+1 FROM c WHERE j < 10)
SELECT r.i, c.j, r.i * c.j AS product
FROM r CROSS JOIN c
ORDER BY r.i, c.j;
```

## Generating Fibonacci Numbers

Recursive CTEs can carry multiple columns to track state:

```sql
WITH RECURSIVE fib AS (
  SELECT 0 AS a, 1 AS b
  UNION ALL
  SELECT b, a + b FROM fib WHERE b < 1000
)
SELECT a AS fibonacci_number FROM fib;
```

## Controlling Maximum Depth

The default `cte_max_recursion_depth` is 1000. Increase it per session for longer sequences:

```sql
SET SESSION cte_max_recursion_depth = 100000;

WITH RECURSIVE big_seq AS (
  SELECT 1 AS n UNION ALL SELECT n + 1 FROM big_seq WHERE n < 50000
)
SELECT COUNT(*) FROM big_seq;
```

## Summary

Recursive CTEs in MySQL 8 replace the need for stored procedures or temporary tables when generating number sequences. Use them to produce integer ranges, arithmetic progressions, Fibonacci sequences, and test data. For very large sequences, adjust `cte_max_recursion_depth` and consider whether a permanent numbers table might be more performant.
