# How to Use sum() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Sum

Description: Learn how to use sum(), sumIf(), sumWithOverflow(), and Decimal-safe summation in ClickHouse with practical examples and overflow handling.

---

`sum()` is one of the core aggregate functions in ClickHouse. It totals numeric column values across rows, and comes with powerful variants - `sumIf()` for conditional sums, `sumWithOverflow()` for same-type wrapping arithmetic, and full support for `Decimal` types when precision matters. This post covers everything you need to use `sum()` effectively.

## Basic sum()

`sum(column)` adds up all non-NULL values in the specified column across the rows in each group.

```sql
CREATE TABLE sales
(
    sale_id    UInt64,
    user_id    UInt64,
    product    String,
    quantity   UInt32,
    price      Float64,
    region     String,
    sale_date  Date
)
ENGINE = MergeTree()
ORDER BY (sale_date, sale_id);

-- Total revenue across all sales
SELECT sum(price * quantity) AS total_revenue
FROM sales;

-- Revenue per region
SELECT
    region,
    sum(price * quantity) AS revenue
FROM sales
GROUP BY region
ORDER BY revenue DESC;
```

`sum()` ignores NULL values - rows where the column is NULL do not contribute to the result.

## sumIf() - Conditional Sum

`sumIf(column, condition)` sums only the rows where the condition is true. It avoids a subquery and completes the work in a single table scan.

```sql
-- Revenue only for completed sales in a specific region
SELECT
    sumIf(price * quantity, region = 'EU')    AS eu_revenue,
    sumIf(price * quantity, region = 'US')    AS us_revenue,
    sumIf(price * quantity, region = 'APAC')  AS apac_revenue,
    sum(price * quantity)                      AS total_revenue
FROM sales;
```

Combine `sumIf` with date conditions for time-windowed aggregations:

```sql
SELECT
    product,
    sumIf(price * quantity, sale_date >= today() - 7)  AS last_7d_revenue,
    sumIf(price * quantity, sale_date >= today() - 30) AS last_30d_revenue,
    sum(price * quantity)                               AS all_time_revenue
FROM sales
GROUP BY product
ORDER BY last_7d_revenue DESC;
```

## Overflow Handling

ClickHouse integer types have fixed bit widths. Standard `sum()` automatically promotes the result type to help prevent overflow. For `UInt32` inputs, the result is `UInt64`. For `Int32`, it becomes `Int64`. This handles most real-world cases without overflow.

```sql
-- Safe: result is promoted to UInt64 automatically
SELECT sum(quantity) FROM sales;
```

However, summing `UInt64` or `Int64` values can still overflow because there is no wider native integer type to promote to.

### sumWithOverflow()

`sumWithOverflow()` uses the same data type as the input, which means it wraps around on overflow rather than upcasting. Use it only when you know the total will not exceed the type's range and you want to avoid the overhead of type promotion.

```sql
-- Sum stays in UInt32 - wraps on overflow
SELECT sumWithOverflow(quantity) FROM sales;
```

If you need to sum values that could exceed `UInt64`, cast to a wider type first:

```sql
SELECT sum(toUInt128(quantity)) FROM sales;
```

## Summing Decimal Types

When working with financial data, use `Decimal` types to avoid floating-point rounding errors. `sum()` fully supports `Decimal`.

```sql
CREATE TABLE transactions
(
    txn_id    UInt64,
    account   String,
    amount    Decimal(18, 4),
    txn_date  Date
)
ENGINE = MergeTree()
ORDER BY (txn_date, txn_id);

INSERT INTO transactions VALUES
    (1, 'acc_001', 1234.5678, '2026-03-31'),
    (2, 'acc_001',  999.9999, '2026-03-31'),
    (3, 'acc_002', 5000.0000, '2026-03-31');

-- Precise decimal sum
SELECT
    account,
    sum(amount) AS total_amount
FROM transactions
GROUP BY account;
```

The result type of `sum(Decimal(18, 4))` is `Decimal(38, 4)` - ClickHouse widens the precision to prevent overflow.

## sum() with GROUP BY

The most common usage pattern is summing across groups.

```sql
-- Daily revenue trend
SELECT
    sale_date,
    sum(price * quantity)  AS daily_revenue,
    count()                AS order_count
FROM sales
GROUP BY sale_date
ORDER BY sale_date;
```

```sql
-- Revenue share by product (using sum in a ratio)
SELECT
    product,
    sum(price * quantity)                                          AS product_revenue,
    round(product_revenue / sum(price * quantity) OVER () * 100, 2) AS pct_of_total
FROM sales
GROUP BY product
ORDER BY product_revenue DESC;
```

## Combining sum() with Other Aggregates

```sql
-- Full sales summary per region per month
SELECT
    region,
    toStartOfMonth(sale_date)   AS month,
    count()                      AS orders,
    sum(quantity)                AS units_sold,
    sum(price * quantity)        AS revenue,
    avg(price)                   AS avg_unit_price
FROM sales
GROUP BY region, month
ORDER BY region, month;
```

## Summary

`sum()` totals non-NULL values and automatically promotes the result type to prevent common overflow scenarios. Use `sumIf()` to compute multiple conditional sums in a single scan. For financial data, use `Decimal` columns with `sum()` to maintain precision. Reach for `sumWithOverflow()` only when you explicitly want same-type wrapping arithmetic.
