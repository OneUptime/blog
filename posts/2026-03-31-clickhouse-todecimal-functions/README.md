# How to Use toDecimal32(), toDecimal64(), toDecimal128() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Type Conversion, Decimal, Financial Calculation, Precision

Description: Learn how to use toDecimal32(), toDecimal64(), and toDecimal128() in ClickHouse for exact fixed-precision arithmetic in financial and accounting workflows.

---

ClickHouse provides `toDecimal32(x, scale)`, `toDecimal64(x, scale)`, and `toDecimal128(x, scale)` for converting values to fixed-precision decimal types. The `scale` parameter defines the number of decimal places. Unlike floating-point types, `Decimal` stores values exactly with no rounding errors, making it the correct choice for financial calculations, currency arithmetic, and any domain where exact decimal representation is required.

## Decimal Type Properties

```text
Decimal32(scale)  -> 9 significant digits  total  (4 bytes)
Decimal64(scale)  -> 18 significant digits total  (8 bytes)
Decimal128(scale) -> 38 significant digits total  (16 bytes)

scale = number of digits after the decimal point
```

## Basic Usage

```sql
-- Convert a float literal to Decimal64 with 2 decimal places
SELECT toDecimal64(3.14159, 2) AS two_decimal_places;
-- Returns: 3.14

-- Convert a string to Decimal64
SELECT toDecimal64('123.456', 3) AS from_string;
-- Returns: 123.456

-- Convert an integer to Decimal64 with scale
SELECT toDecimal64(100, 2) AS integer_to_decimal;
-- Returns: 100.00
```

## Currency Arithmetic

Currency calculations require exact representation. A dollar amount is typically stored with 2 or 4 decimal places.

```sql
-- Store and calculate prices with exact precision
CREATE TABLE transactions
(
    transaction_id UInt64,
    amount         Decimal64(4),   -- up to 4 decimal places
    tax_rate       Decimal64(4),
    transaction_at DateTime
)
ENGINE = MergeTree()
ORDER BY (transaction_id, transaction_at);

-- Insert with exact decimal values
INSERT INTO transactions VALUES
(1, toDecimal64('99.99', 4), toDecimal64('0.0875', 4), now()),
(2, toDecimal64('149.50', 4), toDecimal64('0.0875', 4), now());

-- Compute tax and total with exact precision
SELECT
    transaction_id,
    amount,
    tax_rate,
    round(amount * tax_rate, 2) AS tax_amount,
    amount + round(amount * tax_rate, 2) AS total
FROM transactions;
```

## Converting Float Inputs to Decimal

When receiving float data that should be treated as exact, convert to Decimal immediately.

```sql
-- Convert float revenue column to Decimal for exact summation
SELECT
    product_id,
    sum(toDecimal64(revenue_float, 4)) AS exact_total_revenue
FROM sales_with_float_revenue
GROUP BY product_id
ORDER BY product_id
LIMIT 10;
```

## Demonstrating Float vs Decimal Accuracy

```sql
-- Float arithmetic has rounding errors; Decimal does not
SELECT
    toFloat64(0.1) + toFloat64(0.2)                           AS float_sum,
    toDecimal64('0.1', 10) + toDecimal64('0.2', 10)           AS decimal_sum;
-- float_sum may be 0.30000000000000004
-- decimal_sum is exactly 0.3
```

## OrNull Variant for Safe Conversion

```sql
-- Safe conversion that returns NULL on parse failure
SELECT toDecimal64OrNull('123.45', 2) AS valid;    -- returns 123.45
SELECT toDecimal64OrNull('abc', 2)    AS invalid;  -- returns NULL
SELECT toDecimal64OrNull('', 2)       AS empty;    -- returns NULL

-- Safe parsing of financial data from CSV imports
SELECT
    raw_amount,
    toDecimal64OrNull(raw_amount, 4) AS parsed_amount
FROM financial_import
WHERE toDecimal64OrNull(raw_amount, 4) IS NOT NULL
LIMIT 10;
```

## Choosing the Right Decimal Type

```sql
-- Decimal32: small values, up to 9 digits (e.g., unit prices)
SELECT toDecimal32('999.99', 2) AS price;

-- Decimal64: standard financial use (up to 18 digits)
SELECT toDecimal64('1234567890.1234', 4) AS large_amount;

-- Decimal128: very high-precision calculations (up to 38 digits)
SELECT toDecimal128('9999999999999999.9999999999', 10) AS very_precise;
```

## Aggregating Decimal Values

Decimal aggregations produce exact results, unlike float aggregations.

```sql
-- Exact sum of financial transactions
SELECT
    currency,
    sum(toDecimal64(amount_str, 4)) AS total_amount,
    count()                          AS transaction_count,
    avg(toDecimal64(amount_str, 4)) AS avg_amount
FROM financial_records
GROUP BY currency
ORDER BY total_amount DESC
LIMIT 10;
```

## Scale Mismatch in Arithmetic

When performing arithmetic between Decimal values with different scales, ClickHouse adjusts the result scale based on the operation: for addition and subtraction, the result scale is the maximum of the two scales; for multiplication, the result scale is the sum of the two scales.

```sql
-- Multiplying Decimal64(2) by Decimal64(4) gives Decimal64(6) (scale = 2 + 4)
SELECT
    toDecimal64('100.50', 2) * toDecimal64('0.0875', 4) AS product;
```

## Summary

`toDecimal32()`, `toDecimal64()`, and `toDecimal128()` convert values to fixed-precision decimal types with an explicit scale (number of decimal places). Use `Decimal64(4)` for most currency and financial calculations. Use `Decimal128` when you need more than 18 significant digits. Always prefer `Decimal` over `Float` for monetary values to avoid rounding errors. Use `OrNull` variants when parsing untrusted string input.
