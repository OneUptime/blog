# How to Use TRUNCATE() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Numeric Function, Database

Description: Learn how to use MySQL TRUNCATE() to remove digits beyond a specified decimal place, truncating rather than rounding numeric values.

---

## What Is the TRUNCATE() Function?

`TRUNCATE()` in MySQL removes (truncates) all digits beyond a specified number of decimal places **without rounding**. It simply cuts the number off at the specified precision.

**Syntax:**

```sql
TRUNCATE(X, D)
```

- `X` - the numeric value to truncate.
- `D` - the number of decimal places to keep.
  - If `D` is positive: truncates to `D` decimal places.
  - If `D` is `0`: removes the fractional part.
  - If `D` is negative: truncates to the left of the decimal point (replaces digits with zeros).
- Returns `NULL` if either argument is `NULL`.

---

## Basic Examples

```sql
SELECT TRUNCATE(3.14159, 2);
-- Returns: 3.14  (digits beyond 2 decimal places are removed)

SELECT TRUNCATE(3.149, 2);
-- Returns: 3.14  (NOT 3.15 -- no rounding happens)

SELECT TRUNCATE(3.9999, 0);
-- Returns: 3  (NOT 4 -- just truncates decimal part)

SELECT TRUNCATE(123.456, 1);
-- Returns: 123.4

SELECT TRUNCATE(123.456, 0);
-- Returns: 123

SELECT TRUNCATE(123.456, -1);
-- Returns: 120  (truncates to nearest 10)

SELECT TRUNCATE(123.456, -2);
-- Returns: 100

SELECT TRUNCATE(123.456, -3);
-- Returns: 0

SELECT TRUNCATE(-3.149, 2);
-- Returns: -3.14  (truncates toward zero for negatives)
```

---

## TRUNCATE() vs ROUND()

This is the most critical distinction to understand:

```sql
SELECT TRUNCATE(3.999, 2);  -- 3.99  (just cuts, no rounding)
SELECT ROUND(3.999, 2);     -- 4.00  (rounds up)

SELECT TRUNCATE(3.145, 2);  -- 3.14  (cuts at 2 decimal places)
SELECT ROUND(3.145, 2);     -- 3.15  (rounds based on 3rd decimal)

SELECT TRUNCATE(-3.999, 2); -- -3.99 (truncates toward zero)
SELECT ROUND(-3.999, 2);    -- -4.00 (rounds away from zero)
```

The key rule: `TRUNCATE()` always moves the result **toward zero**; `ROUND()` applies mathematical rounding rules.

---

## How TRUNCATE() Behaves

```mermaid
flowchart LR
    A[Input number X] --> B{D >= 0?}
    B -- Yes --> C[Keep D decimal digits, discard rest]
    B -- No --> D[Replace abs(D) digits left of decimal with 0]
    C --> E[Return truncated number]
    D --> E
```

---

## Truncating to Whole Units

```sql
-- Truncate prices to whole dollars
SELECT
    product_name,
    price,
    TRUNCATE(price, 0) AS floor_price
FROM products;

-- Compare with FLOOR() for positive numbers (identical result)
SELECT TRUNCATE(9.9, 0);   -- 9
SELECT FLOOR(9.9);         -- 9

-- For negative numbers they differ
SELECT TRUNCATE(-9.9, 0);  -- -9  (toward zero)
SELECT FLOOR(-9.9);        -- -10 (toward negative infinity)
```

---

## Practical: Financial Calculations

Financial truncation is common when computing fees or tax breakdowns:

```sql
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10, 4)
);

INSERT INTO transactions (amount) VALUES
(99.9999), (149.5555), (0.0012), (1234.5678);

-- Truncate to cents (2 decimal places)
SELECT
    id,
    amount,
    TRUNCATE(amount, 2) AS truncated_cents
FROM transactions;
```

Result:

| id | amount    | truncated_cents |
|----|-----------|-----------------|
| 1  | 99.9999   | 99.99           |
| 2  | 149.5555  | 149.55          |
| 3  | 0.0012    | 0.00            |
| 4  | 1234.5678 | 1234.56         |

---

## Negative D: Truncating Tens, Hundreds, Thousands

```sql
SELECT TRUNCATE(987654, -3);
-- Returns: 987000  (truncate to nearest thousand)

SELECT TRUNCATE(987654, -4);
-- Returns: 980000  (truncate to nearest ten-thousand)

-- Useful for truncating to display significant figures
SELECT
    sales_total,
    TRUNCATE(sales_total, -3) AS to_nearest_thousand
FROM annual_summary;
```

---

## TRUNCATE() in Computed Columns

```sql
-- Store truncated price for tax tier computation
SELECT
    price,
    TRUNCATE(price / 100, 0) * 100 AS price_bracket
FROM products;
-- Groups 0-99.99 into 0, 100-199.99 into 100, etc.
```

---

## Comparison Table: TRUNCATE() vs FLOOR() vs CEIL() vs ROUND()

| Function           | 3.9 | -3.9 | 3.14159 (2dp) | -3.14159 (2dp) |
|--------------------|-----|------|---------------|-----------------|
| `TRUNCATE(x, 0)`   | 3   | -3   | n/a           | n/a             |
| `FLOOR(x)`         | 3   | -4   | n/a           | n/a             |
| `CEIL(x)`          | 4   | -3   | n/a           | n/a             |
| `ROUND(x, 2)`      | n/a | n/a  | 3.14          | -3.14           |
| `TRUNCATE(x, 2)`   | n/a | n/a  | 3.14          | -3.14           |

For positive numbers, `TRUNCATE(x, 0)` and `FLOOR(x)` produce the same result. For negative numbers they diverge.

---

## Using TRUNCATE() for Time Bucketing

```sql
-- Bucket Unix timestamps to the nearest 5 minutes (300 seconds)
SELECT
    event_id,
    TRUNCATE(UNIX_TIMESTAMP(event_time) / 300, 0) * 300 AS five_min_bucket,
    FROM_UNIXTIME(TRUNCATE(UNIX_TIMESTAMP(event_time) / 300, 0) * 300) AS bucket_start
FROM events
LIMIT 10;
```

---

## NULL Behavior

```sql
SELECT TRUNCATE(NULL, 2);    -- NULL
SELECT TRUNCATE(3.14, NULL); -- NULL
```

---

## Summary

`TRUNCATE(X, D)` removes all digits beyond `D` decimal places without any rounding, always moving the result toward zero. For positive numbers with non-negative `D`, it is similar to `FLOOR()` for whole-number truncation but differs for negative inputs. Use `TRUNCATE()` when you need exact decimal cutoffs without rounding, such as currency truncation for fees, value bucketing, and significant figure reduction with negative `D` values. For true mathematical rounding, use `ROUND()` instead.
