# How to Use ROUND() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Math Function, Database

Description: Learn how MySQL's ROUND() function rounds a number to a specified number of decimal places, with examples for financial and statistical calculations.

---

## What is ROUND()?

The `ROUND()` function in MySQL rounds a numeric value to a specified number of decimal places. For exact-value numbers (integers and `DECIMAL`), it uses the "round half away from zero" rule: values exactly at the midpoint (0.5) are rounded away from zero. For approximate-value numbers (`FLOAT` and `DOUBLE`), the result depends on the underlying C library and typically uses "round to nearest even" (banker's rounding). This is the most commonly used rounding function in financial reporting, statistical summaries, and display formatting.

The syntax is:

```sql
ROUND(X)
ROUND(X, D)
```

- `X` - the number to round
- `D` - the number of decimal places (default 0). Negative values round to the left of the decimal point.

## Basic Examples

```sql
SELECT ROUND(4.5);     -- Result: 5
SELECT ROUND(4.4);     -- Result: 4
SELECT ROUND(-4.5);    -- Result: -5  (away from zero)
SELECT ROUND(3.14159, 2); -- Result: 3.14
SELECT ROUND(3.145, 2);   -- Result: 3.15
```

## Rounding to Zero Decimal Places

```sql
SELECT ROUND(1234.567);
-- Result: 1235
```

## Rounding with Negative D

Negative `D` rounds to the left of the decimal point:

```sql
SELECT ROUND(1234.567, -1);  -- Result: 1230
SELECT ROUND(1234.567, -2);  -- Result: 1200
SELECT ROUND(1234.567, -3);  -- Result: 1000
SELECT ROUND(5678, -3);      -- Result: 6000
```

This is useful for rounding large numbers to the nearest hundred, thousand, etc.

## Financial Rounding

Round currency values to 2 decimal places:

```sql
SELECT
  order_id,
  ROUND(subtotal * 1.08, 2) AS total_with_tax
FROM orders;
```

Calculate average price rounded to cents:

```sql
SELECT
  category,
  ROUND(AVG(price), 2) AS avg_price
FROM products
GROUP BY category;
```

## Statistical Summaries

```sql
SELECT
  department,
  ROUND(AVG(salary), 0)         AS avg_salary,
  ROUND(STDDEV(salary), 2)      AS salary_stddev,
  ROUND(MAX(salary) - MIN(salary), 2) AS salary_range
FROM employees
GROUP BY department;
```

## Using ROUND() in UPDATE

Normalize stored values to 2 decimal places:

```sql
UPDATE pricing
SET price = ROUND(price, 2)
WHERE price != ROUND(price, 2);
```

## NULL Handling

`ROUND()` returns `NULL` when `X` is `NULL`:

```sql
SELECT ROUND(NULL, 2);
-- Result: NULL
```

## Floating Point Precision Warning

Due to floating-point representation, results may differ from exact-value rounding:

```sql
SELECT ROUND(2.445, 2);
-- Returns: 2.45 (literal is treated as exact-value DECIMAL)

SELECT ROUND(2.445E0, 2);
-- Returns: 2.44 (2.445E0 is a DOUBLE; binary representation is slightly less than 2.445)
```

For monetary values, use `DECIMAL` columns rather than `FLOAT` or `DOUBLE`:

```sql
CREATE TABLE prices (
  amount DECIMAL(10, 4)
);
```

## ROUND() vs TRUNCATE() vs FLOOR() vs CEIL()

```sql
SELECT ROUND(4.6);     -- 5   (rounds to nearest)
SELECT TRUNCATE(4.6, 0); -- 4 (drops decimals, no rounding)
SELECT FLOOR(4.6);     -- 4   (always rounds down)
SELECT CEIL(4.6);      -- 5   (always rounds up)

SELECT ROUND(-4.6);    -- -5  (away from zero)
SELECT FLOOR(-4.6);    -- -5  (most negative)
SELECT CEIL(-4.6);     -- -4  (least negative)
```

## Practical Example - Grade Letter Assignment

```sql
SELECT
  student_name,
  ROUND(AVG(score), 1) AS final_grade,
  CASE
    WHEN ROUND(AVG(score), 0) >= 90 THEN 'A'
    WHEN ROUND(AVG(score), 0) >= 80 THEN 'B'
    WHEN ROUND(AVG(score), 0) >= 70 THEN 'C'
    ELSE 'F'
  END AS letter_grade
FROM exam_scores
GROUP BY student_name;
```

## Summary

`ROUND(X, D)` rounds `X` to `D` decimal places, using the round-half-away-from-zero rule for exact-value types and the C library's rounding (often round-to-nearest-even) for approximate-value types. Negative `D` rounds to powers of 10 (tens, hundreds, etc.). Use `DECIMAL` columns for money to avoid floating-point drift. Unlike `TRUNCATE()`, `ROUND()` considers the next digit when deciding direction. It is the standard choice for financial totals, averages, and any output where standard rounding semantics are expected.
