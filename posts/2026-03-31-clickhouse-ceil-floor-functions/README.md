# How to Use ceil() and floor() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Math Function, Rounding, Numeric

Description: Learn how ceil() and floor() round numeric values up or down in ClickHouse, with examples for price rounding, bucketing continuous values, and integer conversion.

---

`ceil()` and `floor()` are rounding functions that always round in a fixed direction. `ceil()` (ceiling) rounds a number up to the nearest integer or specified decimal precision, while `floor()` rounds down. Unlike `round()`, which moves toward the nearest value, these functions guarantee the direction of rounding, making them essential for financial calculations, bin assignment, and any scenario where directional rounding is required.

## Function Signatures

```text
ceil(x [, N])   -- rounds x up to N decimal places (default N=0)
floor(x [, N])  -- rounds x down to N decimal places (default N=0)
```

`ceil()` also has an alias: `ceiling()` is a synonym. Negative values of `N` round to tens, hundreds, etc.

## Basic Usage

Observe the fundamental behavior with positive and negative values.

```sql
SELECT
    ceil(3.1)    AS ceil_pos,
    ceil(3.9)    AS ceil_pos2,
    ceil(-3.1)   AS ceil_neg,
    floor(3.9)   AS floor_pos,
    floor(3.1)   AS floor_pos2,
    floor(-3.9)  AS floor_neg;
```

Note that `ceil(-3.1)` returns -3 (rounds up toward zero) and `floor(-3.9)` returns -4 (rounds down away from zero).

## Using the Precision Argument

The optional second argument controls decimal precision.

```sql
SELECT
    ceil(12.3456,  2)  AS ceil_2dp,
    floor(12.3456, 2)  AS floor_2dp,
    ceil(1234.5,  -2)  AS ceil_neg2,
    floor(1234.5, -2)  AS floor_neg2;
```

`ceil(12.3456, 2)` returns 12.35. `ceil(1234.5, -2)` returns 1300 (rounds up to the nearest hundred).

## Setting Up a Sample Table

Create a table of e-commerce pricing data to demonstrate practical rounding scenarios.

```sql
CREATE TABLE product_pricing
(
    product_id   UInt64,
    product_name String,
    cost_price   Float64,
    markup_pct   Float64
)
ENGINE = MergeTree
ORDER BY product_id;

INSERT INTO product_pricing VALUES
(1, 'Laptop Stand',   28.73, 40.0),
(2, 'USB Hub',         9.45, 55.0),
(3, 'Webcam',         31.20, 35.0),
(4, 'Keyboard',       22.80, 45.0),
(5, 'Mouse Pad',       4.15, 60.0);
```

## Ceiling for Conservative Price Rounding

When setting retail prices, use `ceil()` to ensure the price never falls below the desired minimum margin.

```sql
SELECT
    product_name,
    cost_price,
    markup_pct,
    cost_price * (1 + markup_pct / 100)        AS exact_price,
    ceil(cost_price * (1 + markup_pct / 100), 2) AS ceiling_price
FROM product_pricing
ORDER BY product_id;
```

## Floor for Conservative Discount Rounding

When advertising discounted prices, use `floor()` to ensure the displayed price is never higher than the computed discount price.

```sql
SELECT
    product_name,
    cost_price * (1 + markup_pct / 100)          AS full_price,
    floor(cost_price * (1 + markup_pct / 100) * 0.9, 2) AS discounted_price
FROM product_pricing;
```

## Bucketing Continuous Values with floor()

`floor()` with a precision or divisor is a standard technique for grouping continuous numeric values into equal-width buckets.

```sql
CREATE TABLE response_times
(
    endpoint  String,
    ts        DateTime,
    latency_ms Float64
)
ENGINE = MergeTree
ORDER BY (endpoint, ts);

INSERT INTO response_times VALUES
('/api/users',  '2024-08-01 10:00:00', 42.3),
('/api/users',  '2024-08-01 10:00:01', 155.8),
('/api/orders', '2024-08-01 10:00:02', 88.5),
('/api/users',  '2024-08-01 10:00:03', 310.2),
('/api/orders', '2024-08-01 10:00:04', 521.7),
('/api/users',  '2024-08-01 10:00:05', 75.1),
('/api/orders', '2024-08-01 10:00:06', 44.6);
```

Group latency values into 100ms buckets using `floor()`.

```sql
SELECT
    floor(latency_ms / 100) * 100   AS bucket_start,
    count()                         AS request_count,
    round(avg(latency_ms), 1)       AS avg_latency
FROM response_times
GROUP BY bucket_start
ORDER BY bucket_start;
```

## Converting Float to Integer Safely

`floor()` is a safe way to truncate a float to its integer part for non-negative numbers. For signed numbers, prefer `toInt64()` or `trunc()` if truncation toward zero is needed.

```sql
SELECT
    floor(9.99)   AS floor_positive,
    floor(-9.99)  AS floor_negative
;
```

## Ceiling for Page Number Calculations

Use `ceil()` to compute the number of pages needed for pagination.

```sql
SELECT
    total_rows,
    page_size,
    ceil(total_rows / page_size) AS total_pages
FROM (
    SELECT 1053 AS total_rows, 50 AS page_size
);
```

## Aligning Timestamps to Hour Boundaries

Combine `floor()` with timestamp arithmetic to snap event times to the start of their hour.

```sql
SELECT
    ts,
    toDateTime(floor(toUnixTimestamp(ts) / 3600) * 3600) AS hour_start
FROM response_times
ORDER BY ts;
```

## Summary

`ceil()` and `floor()` provide directional rounding that always moves in a fixed direction regardless of the decimal portion. Use `ceil()` for conservative price calculations, page count computations, and any scenario where rounding down would violate a constraint. Use `floor()` for bucketing continuous values into equal-width bins, timestamp alignment, and discount displays. Both accept an optional precision argument for sub-integer or super-integer rounding, making them flexible enough for a wide range of analytical and financial use cases.
