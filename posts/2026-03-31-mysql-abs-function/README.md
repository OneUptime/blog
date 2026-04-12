# How to Use ABS() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Math Function, Database

Description: Learn how to use MySQL's ABS() function to return the absolute value of a number, with practical examples for financial and distance calculations.

---

## What is ABS()?

The `ABS()` function in MySQL returns the absolute (non-negative) value of a numeric expression. It converts negative numbers to their positive equivalents while leaving positive numbers and zero unchanged. This is useful in financial calculations, distance measurements, error margin checks, and any context where the magnitude of a value matters more than its sign.

The syntax is:

```sql
ABS(X)
```

`X` can be an integer, a decimal, a floating-point value, or any numeric expression.

## Basic Examples

```sql
SELECT ABS(-42);
-- Result: 42

SELECT ABS(42);
-- Result: 42

SELECT ABS(0);
-- Result: 0

SELECT ABS(-3.14);
-- Result: 3.14
```

## Using ABS() on Table Columns

Calculate absolute differences between two columns:

```sql
SELECT
  order_id,
  expected_delivery,
  actual_delivery,
  ABS(DATEDIFF(actual_delivery, expected_delivery)) AS delivery_delay_days
FROM orders;
```

## Financial Calculations

Find all transactions with an absolute value above a threshold:

```sql
SELECT
  transaction_id,
  amount,
  ABS(amount) AS abs_amount
FROM transactions
WHERE ABS(amount) > 1000
ORDER BY ABS(amount) DESC;
```

This catches both large debits (negative) and credits (positive).

## Computing Distance Between Values

```sql
SELECT
  product_id,
  target_price,
  actual_price,
  ABS(actual_price - target_price) AS price_variance
FROM product_pricing
ORDER BY price_variance DESC;
```

## ABS() with NULL

`ABS()` returns `NULL` when given a `NULL` input:

```sql
SELECT ABS(NULL);
-- Result: NULL
```

Use `COALESCE()` to substitute a default:

```sql
SELECT ABS(COALESCE(balance, 0)) AS abs_balance
FROM accounts;
```

## Using ABS() in WHERE Clause

Filter rows where a value deviates from a reference by more than a tolerance:

```sql
SELECT *
FROM sensor_readings
WHERE ABS(measured_value - expected_value) > 0.05;
```

## Combining ABS() with Aggregates

Find the maximum absolute deviation across a set of readings:

```sql
SELECT
  sensor_id,
  MAX(ABS(reading - baseline)) AS max_deviation
FROM sensor_data
GROUP BY sensor_id
HAVING max_deviation > 10;
```

## ABS() with Integer Division Remainder

Ensure a positive modulo result (MySQL's `MOD()` can return negative values for negative inputs):

```sql
SELECT ABS(MOD(-17, 5));
-- Result: 2  (ensures positive remainder)
```

## Practical Example - Account Balance Reconciliation

```sql
SELECT
  account_id,
  ledger_balance,
  actual_balance,
  ABS(ledger_balance - actual_balance) AS discrepancy
FROM accounts
WHERE ABS(ledger_balance - actual_balance) > 0.01
ORDER BY discrepancy DESC;
```

## Summary

`ABS()` returns the non-negative magnitude of a numeric value. It works with integers, decimals, and floating-point numbers, returning `NULL` for `NULL` input. Common use cases include computing financial discrepancies, sensor deviations, delivery delays, and distance between values. Use it in `WHERE` clauses with a tolerance threshold to catch out-of-range values regardless of sign.
