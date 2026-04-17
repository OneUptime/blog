# How to Use abs() and sign() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Math Function, Numeric, Data Analysis

Description: Learn how abs() computes absolute values and sign() returns the sign indicator in ClickHouse, with examples for distance calculations, normalization, and direction detection.

---

`abs()` and `sign()` are fundamental numeric functions in ClickHouse. `abs()` returns the non-negative magnitude of a number, stripping its sign. `sign()` encodes the sign of a number as -1, 0, or 1. Together they are building blocks for distance calculations, deviation analysis, trend detection, and any computation where magnitude and direction need to be treated separately.

## Function Signatures

```text
abs(x)   -- returns |x|, the absolute value of x
sign(x)  -- returns -1 if x < 0, 0 if x = 0, 1 if x > 0
```

Both functions accept any numeric type. `abs()` preserves the type for floating-point and decimal inputs, and returns the corresponding unsigned integer type for signed integer inputs (for example `abs(Int32)` returns `UInt32`). `sign()` always returns an Int8.

## Basic Usage

Verify the basic behavior with simple constant expressions.

```sql
SELECT
    abs(-42)    AS abs_negative,
    abs(42)     AS abs_positive,
    abs(0)      AS abs_zero,
    sign(-42)   AS sign_negative,
    sign(0)     AS sign_zero,
    sign(42)    AS sign_positive;
```

## Setting Up a Sample Table

Create a table recording portfolio position changes over time, where gains are positive and losses are negative.

```sql
CREATE TABLE portfolio_changes
(
    account_id   UInt64,
    asset        String,
    change_date  Date,
    pnl          Float64
)
ENGINE = MergeTree
ORDER BY (account_id, asset, change_date);

INSERT INTO portfolio_changes VALUES
(1001, 'AAPL',  '2024-01-02',  125.50),
(1001, 'AAPL',  '2024-01-03',  -43.20),
(1001, 'GOOGL', '2024-01-02',  -88.75),
(1001, 'GOOGL', '2024-01-03',  211.00),
(1002, 'AAPL',  '2024-01-02',  -15.30),
(1002, 'TSLA',  '2024-01-02',  -320.00),
(1002, 'TSLA',  '2024-01-03',  180.25);
```

## Computing Total Absolute Exposure

Use `abs()` with `sum()` to measure the total magnitude of P&L movements regardless of direction.

```sql
SELECT
    account_id,
    sum(pnl)        AS net_pnl,
    sum(abs(pnl))   AS total_exposure,
    avg(abs(pnl))   AS avg_move_size
FROM portfolio_changes
GROUP BY account_id
ORDER BY account_id;
```

## Detecting Direction of Change

Use `sign()` to classify each entry as a gain, loss, or flat day without exposing the actual magnitude.

```sql
SELECT
    account_id,
    asset,
    change_date,
    pnl,
    CASE sign(pnl)
        WHEN  1 THEN 'gain'
        WHEN -1 THEN 'loss'
        ELSE        'flat'
    END AS direction
FROM portfolio_changes
ORDER BY account_id, asset, change_date;
```

## Counting Gains vs Losses

Combine `sign()` with conditional counting to summarize win/loss ratios per account.

```sql
SELECT
    account_id,
    countIf(sign(pnl) =  1) AS gain_days,
    countIf(sign(pnl) = -1) AS loss_days,
    countIf(sign(pnl) =  0) AS flat_days
FROM portfolio_changes
GROUP BY account_id;
```

## Filtering by Magnitude

Use `abs()` in a WHERE clause to filter rows where the absolute change exceeds a threshold, regardless of direction.

```sql
SELECT
    account_id,
    asset,
    change_date,
    pnl
FROM portfolio_changes
WHERE abs(pnl) > 100.0
ORDER BY abs(pnl) DESC;
```

## Computing Distance Between Values

`abs()` is the standard way to compute the absolute difference between two columns, equivalent to a 1D distance.

```sql
CREATE TABLE price_targets
(
    analyst     String,
    symbol      String,
    target_price Float64,
    current_price Float64
)
ENGINE = MergeTree
ORDER BY (analyst, symbol);

INSERT INTO price_targets VALUES
('analyst_a', 'AAPL',  195.00, 182.50),
('analyst_a', 'GOOGL', 150.00, 168.00),
('analyst_b', 'AAPL',  210.00, 182.50),
('analyst_b', 'TSLA',  220.00, 245.00);
```

```sql
SELECT
    analyst,
    symbol,
    target_price,
    current_price,
    abs(target_price - current_price)               AS price_distance,
    sign(target_price - current_price)              AS direction,
    round(abs(target_price - current_price) / current_price * 100, 2) AS pct_distance
FROM price_targets
ORDER BY price_distance DESC;
```

## Normalizing Deviations

Use `abs()` to compute mean absolute deviation, a robust measure of spread that is less sensitive to outliers than variance.

```sql
SELECT
    asset,
    any(asset_mean)             AS mean_pnl,
    avg(abs(pnl - asset_mean))  AS mad
FROM
(
    SELECT
        asset,
        pnl,
        avg(pnl) OVER (PARTITION BY asset) AS asset_mean
    FROM portfolio_changes
)
GROUP BY asset;
```

ClickHouse does not allow an aggregate function to wrap a window function directly, so the per-asset mean is computed with a window function in an inner query, then reused in the outer aggregation.

## Summary

`abs()` and `sign()` are concise but versatile functions for working with signed numeric data in ClickHouse. Use `abs()` to measure magnitude, compute distances, filter by deviation size, and calculate mean absolute deviation. Use `sign()` to classify direction, count gain vs loss events, and drive CASE-based category logic. Both functions work seamlessly with aggregates like `sum()`, `avg()`, and `countIf()`, making them natural companions for analytical queries on financial, metric, and sensor data.
