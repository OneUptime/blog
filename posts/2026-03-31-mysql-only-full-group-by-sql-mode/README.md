# How to Handle the ONLY_FULL_GROUP_BY SQL Mode in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, GROUP BY, SQL Mode

Description: Learn what MySQL's ONLY_FULL_GROUP_BY mode enforces, why queries fail, and the correct approaches to fix non-aggregated column errors.

---

## What Is ONLY_FULL_GROUP_BY?

`ONLY_FULL_GROUP_BY` is an SQL mode in MySQL that enforces SQL standard GROUP BY behavior. When enabled (the default since MySQL 5.7.5), MySQL rejects queries where a `SELECT`, `HAVING`, or `ORDER BY` clause references a column that is:

1. Not in the `GROUP BY` clause, and
2. Not functionally dependent on the GROUP BY columns, and
3. Not wrapped in an aggregate function

This prevents non-deterministic query results where MySQL would otherwise silently return an arbitrary value.

## Checking the Current SQL Mode

```sql
SELECT @@sql_mode;
-- Output includes: ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,...

SHOW VARIABLES LIKE 'sql_mode';
```

## Queries That Fail Under ONLY_FULL_GROUP_BY

```sql
CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  region VARCHAR(50),
  salesperson VARCHAR(100),
  amount DECIMAL(10,2)
);

INSERT INTO sales VALUES
  (1, 'East', 'Alice', 5000),
  (2, 'East', 'Bob', 7000),
  (3, 'West', 'Carol', 4500),
  (4, 'West', 'Dave', 6000);

-- This fails: 'salesperson' is not in GROUP BY
SELECT region, salesperson, SUM(amount)
FROM sales
GROUP BY region;
-- ERROR 1055: 'salesperson' is not in GROUP BY
```

## Fix 1: Add the Column to GROUP BY

The cleanest fix when you actually need the column in results:

```sql
SELECT region, salesperson, SUM(amount)
FROM sales
GROUP BY region, salesperson;
```

## Fix 2: Use an Aggregate Function

When you want a single representative value:

```sql
SELECT region, MAX(salesperson) AS top_salesperson, SUM(amount)
FROM sales
GROUP BY region;
```

Or `MIN()`, `ANY_VALUE()` depending on your intent.

## Fix 3: ANY_VALUE() for Non-Deterministic Access

Explicitly signal that you accept a non-deterministic value:

```sql
SELECT region, ANY_VALUE(salesperson) AS sample_rep, SUM(amount)
FROM sales
GROUP BY region;
```

## Fix 4: Functional Dependency Detection

MySQL 5.7.5 and later detects functional dependencies via primary keys. If you group by a primary key, non-key columns of the same table are implicitly allowed:

```sql
SELECT id, region, salesperson, amount
FROM sales
GROUP BY id;  -- OK: id is PK, all other columns are functionally dependent
```

## Fix 5: Use a Subquery or Window Function

For the "get the top row per group" pattern:

```sql
-- Window function approach (deterministic)
SELECT region, salesperson, amount
FROM (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY region ORDER BY amount DESC) AS rn
  FROM sales
) t
WHERE rn = 1;
```

## Temporarily Disabling the Mode (Not Recommended)

For testing or migration purposes only:

```sql
SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'ONLY_FULL_GROUP_BY', '');
```

Never disable it in production - it masks bugs and produces unpredictable results.

## Checking Functional Dependencies

MySQL 5.7.5 and later can detect certain functional dependencies automatically:

```sql
-- This works because order_id is a PK
SELECT order_id, customer_id, total, status
FROM orders
GROUP BY order_id;
-- No error - customer_id, total, status are functionally dependent on order_id
```

## Summary

`ONLY_FULL_GROUP_BY` enforces deterministic GROUP BY behavior by requiring non-grouped columns to be aggregated. Fix violations by adding columns to `GROUP BY`, using aggregate functions, applying `ANY_VALUE()` for intentionally non-deterministic picks, or refactoring with window functions for ranked results.
