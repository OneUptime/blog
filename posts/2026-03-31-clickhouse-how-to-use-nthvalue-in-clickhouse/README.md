# How to Use NTH_VALUE() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, NTH_VALUE, Analytics, SQL

Description: Learn how to use the NTH_VALUE() window function in ClickHouse to retrieve the value from a specific position within a window frame.

---

## What Is NTH_VALUE()

`NTH_VALUE(expr, n)` is a window function that returns the value of `expr` from the `n`-th row of the window frame. It generalizes `FIRST_VALUE()` (n=1) and `LAST_VALUE()`.

```sql
NTH_VALUE(expr, n) OVER (
    [PARTITION BY partition_column]
    ORDER BY sort_column
    [ROWS BETWEEN frame_start AND frame_end]
)
```

- `expr`: the column or expression to retrieve
- `n`: 1-based position within the window frame

## Basic NTH_VALUE() Example

```sql
CREATE TABLE scores (
    player String,
    game_id UInt32,
    score UInt32,
    played_at DateTime
) ENGINE = MergeTree()
ORDER BY (player, played_at);

-- Get each player's 1st, 2nd, and 3rd best scores
SELECT
    player,
    game_id,
    score,
    NTH_VALUE(score, 1) OVER (PARTITION BY player ORDER BY score DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS best_score,
    NTH_VALUE(score, 2) OVER (PARTITION BY player ORDER BY score DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS second_best,
    NTH_VALUE(score, 3) OVER (PARTITION BY player ORDER BY score DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS third_best
FROM scores;
```

## The Importance of Frame Specification

`NTH_VALUE()` operates within the window frame. Without specifying `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, the default frame may not include all rows:

```sql
-- Without frame spec: default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
-- This means NTH_VALUE(score, 3) may return the column default (0 for UInt32) for early rows
SELECT
    player,
    score,
    -- Returns 0 for early rows when the 3rd row is not yet in the frame (non-nullable column)
    NTH_VALUE(score, 3) OVER (PARTITION BY player ORDER BY score DESC) AS third_best_cumulative
FROM scores;

-- With UNBOUNDED frame: always returns the 3rd best overall
SELECT
    player,
    score,
    NTH_VALUE(score, 3) OVER (
        PARTITION BY player ORDER BY score DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS third_best_overall
FROM scores;
```

## Comparing NTH_VALUE, FIRST_VALUE, and LAST_VALUE

```sql
-- These are equivalent:
SELECT
    NTH_VALUE(score, 1) OVER w AS first_val,
    FIRST_VALUE(score) OVER w AS also_first,
    -- Get last by ordering DESC and taking 1st, or using LAST_VALUE with full frame
    LAST_VALUE(score) OVER (
        PARTITION BY player ORDER BY score DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_val
FROM scores
WINDOW w AS (
    PARTITION BY player ORDER BY score DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
);
```

## Practical Example: Ranking Benchmarks

```sql
CREATE TABLE benchmark_runs (
    benchmark_name LowCardinality(String),
    run_id UInt32,
    execution_ms UInt32,
    run_date Date
) ENGINE = MergeTree()
ORDER BY (benchmark_name, run_date);

-- Find fastest, 2nd fastest, and 3rd fastest runs per benchmark
SELECT DISTINCT
    benchmark_name,
    NTH_VALUE(execution_ms, 1) OVER (
        PARTITION BY benchmark_name ORDER BY execution_ms ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS fastest_ms,
    NTH_VALUE(execution_ms, 2) OVER (
        PARTITION BY benchmark_name ORDER BY execution_ms ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS second_fastest_ms,
    NTH_VALUE(execution_ms, 3) OVER (
        PARTITION BY benchmark_name ORDER BY execution_ms ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS third_fastest_ms
FROM benchmark_runs
ORDER BY benchmark_name;
```

## Using NTH_VALUE for Quartile Boundaries

```sql
-- Get actual quartile boundary values
WITH ordered_data AS (
    SELECT
        value,
        count() OVER () AS total_rows,
        ROW_NUMBER() OVER (ORDER BY value) AS rn
    FROM measurements
)
SELECT DISTINCT
    NTH_VALUE(value, intDiv(total_rows, 4)) OVER (
        ORDER BY value ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS q1_boundary,
    NTH_VALUE(value, intDiv(total_rows, 2)) OVER (
        ORDER BY value ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS median,
    NTH_VALUE(value, intDiv(total_rows * 3, 4)) OVER (
        ORDER BY value ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS q3_boundary
FROM ordered_data;
```

## Practical Example: Product Pricing Tiers

```sql
CREATE TABLE product_prices (
    category LowCardinality(String),
    product_id UInt32,
    price Float64
) ENGINE = MergeTree()
ORDER BY (category, price);

-- Show cheapest, middle, and most expensive product per category
SELECT DISTINCT
    category,
    NTH_VALUE(product_id, 1) OVER (
        PARTITION BY category ORDER BY price ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS cheapest_product,
    NTH_VALUE(price, 1) OVER (
        PARTITION BY category ORDER BY price ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS cheapest_price,
    NTH_VALUE(product_id, 1) OVER (
        PARTITION BY category ORDER BY price DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS most_expensive_product,
    NTH_VALUE(price, 1) OVER (
        PARTITION BY category ORDER BY price DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS max_price
FROM product_prices
ORDER BY category;
```

## Summary

`NTH_VALUE(expr, n)` retrieves the value from the n-th row of a window frame, making it useful for accessing specific ranked values within groups. Always specify `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` when you need the n-th value from the entire partition rather than just rows seen so far. For the first and last values, `FIRST_VALUE()` and `LAST_VALUE()` are more readable alternatives. NTH_VALUE excels at extracting podium positions, tier boundaries, and benchmark comparisons.
