# How to Use Decimal Data Type in ClickHouse for Precise Calculations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Decimal, Precision, Finance

Description: Learn how to use ClickHouse Decimal(P, S) for exact arithmetic in financial and accounting workloads, with precision, scale, and practical examples.

---

Floating point types like Float32 and Float64 are fast, but they cannot represent most decimal fractions exactly. For financial data, tax calculations, pricing engines, and accounting systems, even a tiny rounding error is unacceptable. ClickHouse's Decimal type provides exact fixed-point arithmetic and is the correct choice whenever you need numbers to add up precisely. This post explains the Decimal type family, how to choose precision and scale, and how to use it in real-world financial queries.

## Understanding Decimal(P, S)

ClickHouse Decimal types are parameterized by two values:

- **P (precision)** - total number of significant decimal digits (1 to 76)
- **S (scale)** - number of digits after the decimal point (0 to P)

ClickHouse maps Decimal(P, S) to one of four underlying storage types based on the precision:

| Alias         | Precision Range | Storage |
|---------------|-----------------|---------|
| Decimal32(S)  | 1-9             | 4 bytes |
| Decimal64(S)  | 10-18           | 8 bytes |
| Decimal128(S) | 19-38           | 16 bytes |
| Decimal256(S) | 39-76           | 32 bytes |

## Creating Tables with Decimal Columns

```sql
CREATE TABLE financial_ledger
(
    txn_id         UInt64,
    account_id     UInt64,
    amount         Decimal(18, 2),   -- Up to 9999999999999999.99
    tax_rate       Decimal(9, 6),    -- e.g. 0.087500 (8.75%)
    exchange_rate  Decimal(18, 8),   -- High precision for FX rates
    balance        Decimal(18, 2),
    created_at     DateTime
)
ENGINE = MergeTree()
ORDER BY (account_id, txn_id);
```

## Inserting Decimal Data

```sql
INSERT INTO financial_ledger
    (txn_id, account_id, amount, tax_rate, exchange_rate, balance, created_at) VALUES
(1, 1001, 1299.99, 0.087500, 1.08654321, 5420.50, '2026-01-15 10:30:00'),
(2, 1001, -250.00, 0.087500, 1.08654321, 5170.50, '2026-01-15 14:00:00'),
(3, 1002, 9999.00, 0.100000, 0.91234567, 9999.00, '2026-01-16 09:00:00');
```

## Arithmetic Operations

Decimal arithmetic in ClickHouse is exact. The result precision and scale follow specific promotion rules.

```sql
-- Addition and subtraction preserve the higher scale
SELECT
    toDecimal64(10.50, 2) + toDecimal64(0.07, 2)  AS sum_result,
    toDecimal64(100.00, 2) - toDecimal64(33.33, 2) AS diff_result;

-- Multiplication: result scale = S1 + S2
SELECT
    toDecimal64(1299.99, 2) * toDecimal64(0.0875, 4) AS tax_amount;
-- Returns 113.749125 (scale 6 = 2 + 4)
```

### Calculating Tax and Total

```sql
SELECT
    txn_id,
    amount,
    tax_rate,
    round(amount * tax_rate, 2)        AS tax_amount,
    amount + round(amount * tax_rate, 2) AS total_with_tax
FROM financial_ledger
WHERE amount > 0;
```

## Aggregate Functions with Decimal

```sql
SELECT
    account_id,
    sum(amount)           AS total_amount,
    avg(amount)           AS avg_amount,
    count()               AS txn_count,
    min(amount)           AS min_txn,
    max(amount)           AS max_txn
FROM financial_ledger
GROUP BY account_id
ORDER BY account_id;
```

## Decimal vs Float: When to Use Each

```sql
-- Float imprecision in financial context
SELECT
    toFloat64(0.1) + toFloat64(0.2)               AS float_result,
    toDecimal64(0.1, 1) + toDecimal64(0.2, 1)     AS decimal_result;
-- float_result:   0.30000000000000004
-- decimal_result: 0.3
```

Always use Decimal for:
- Monetary amounts and prices
- Tax rates and financial ratios
- Accounting balances and ledgers
- Any sum that must reconcile to an exact total

Use Float for:
- Scientific measurements where approximate values are acceptable
- Machine learning features and model outputs
- Cases where the value range exceeds Decimal's limits

## Choosing the Right Precision and Scale

```sql
-- Common patterns for financial data
CREATE TABLE pricing
(
    item_id        UInt32,
    unit_price     Decimal(10, 4),   -- Up to 999999.9999
    quantity       Decimal(10, 3),   -- Up to 9999999.999
    discount_pct   Decimal(5, 4),    -- 0.0000 to 9.9999
    line_total     Decimal(18, 4)    -- Computed: price * qty * (1 - discount)
)
ENGINE = MergeTree()
ORDER BY item_id;

INSERT INTO pricing (item_id, unit_price, quantity, discount_pct, line_total) VALUES
(1, 49.9900, 3.000, 0.1000, 134.9730),
(2, 199.9500, 1.000, 0.0000, 199.9500),
(3, 9.9900, 10.500, 0.0500, 99.6503);
```

## Type Casting and Conversion

```sql
SELECT
    toDecimal32(3.14159, 5)    AS pi_decimal32,
    toDecimal64(1299.9900, 4)  AS price_decimal64,
    CAST('9999999.99', 'Decimal(10, 2)') AS from_string;
```

## Summary

The Decimal(P, S) type is ClickHouse's answer to exact fixed-point arithmetic. It eliminates the rounding errors inherent in floating point types, making it the correct choice for any financial, accounting, or pricing workload. Choose the smallest precision that covers your data range - Decimal32 for simple ratios, Decimal64 for monetary amounts, and Decimal128 or Decimal256 for high-precision scientific data. Always use Decimal over Float when your numbers must add up to exact totals.
