# How to Use round() and roundToExp2() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Math Function, Rounding, Numeric

Description: Learn how round() rounds to N decimal places and roundToExp2() rounds to the nearest power of 2 in ClickHouse, with examples for currency, bucketing, and display formatting.

---

ClickHouse provides several rounding functions for different use cases. `round()` is the general-purpose rounding function that rounds to the nearest value at a specified decimal precision. `roundToExp2()` rounds a number down to the nearest power of 2, which is useful for logarithmic bucketing, memory size representations, and histogram binning where exponential intervals are more appropriate than linear ones.

## Function Signatures

```text
round(x [, N])    -- round x to N decimal places, banker's rounding for Float types
roundToExp2(x)    -- round x down to the nearest power of 2
```

The `N` parameter in `round()` defaults to 0. Positive values round to decimal places; negative values round to tens, hundreds, thousands, etc.

## Basic round() Usage

Observe standard rounding behavior. ClickHouse uses banker's rounding (round half to even) for Float types and round half away from zero for Decimal and integer types.

```sql
SELECT
    round(3.4)     AS round_down,
    round(3.5)     AS round_up,
    round(3.456, 2) AS two_dp,
    round(1234.5, -2) AS to_hundreds,
    round(-3.5)    AS neg_round;
```

`round(3.5)` returns 4 and `round(-3.5)` returns -4 because ClickHouse uses banker's rounding for Float types, rounding to the nearest even number. Note that `round(2.5)` returns 2 (not 3) under this rule.

## Basic roundToExp2() Usage

`roundToExp2()` snaps a value to the nearest power of 2 that does not exceed it.

```sql
SELECT
    roundToExp2(1)    AS exp2_1,
    roundToExp2(3)    AS exp2_3,
    roundToExp2(5)    AS exp2_5,
    roundToExp2(10)   AS exp2_10,
    roundToExp2(100)  AS exp2_100,
    roundToExp2(1000) AS exp2_1000;
```

Returns 1, 2, 4, 8, 64, 512 - each is the largest power of 2 not exceeding the input.

## Setting Up Sample Data

Create a table of financial transactions to demonstrate rounding for currency calculations.

```sql
CREATE TABLE transactions
(
    tx_id       UInt64,
    customer_id UInt64,
    amount      Float64,
    tax_rate    Float64
)
ENGINE = MergeTree
ORDER BY (customer_id, tx_id);

INSERT INTO transactions VALUES
(1, 101, 49.999,  0.085),
(2, 101, 12.345,  0.085),
(3, 102, 199.001, 0.10),
(4, 102, 7.995,   0.10),
(5, 103, 1234.56, 0.075);
```

## Rounding Currency Values

Use `round()` with two decimal places for monetary amounts to avoid floating-point display artifacts.

```sql
SELECT
    tx_id,
    round(amount, 2)                          AS rounded_amount,
    round(amount * (1 + tax_rate), 2)         AS total_with_tax,
    round(amount * tax_rate, 2)               AS tax_amount
FROM transactions;
```

## Rounding for Display Formatting

Round large numbers to a fewer decimal places for summary display.

```sql
SELECT
    customer_id,
    round(sum(amount), 2)          AS total_spent,
    round(avg(amount), 2)          AS avg_order,
    round(max(amount), 0)          AS max_order
FROM transactions
GROUP BY customer_id;
```

## Using Negative Precision

Round to the nearest ten or hundred using negative N values, useful for approximate reporting.

```sql
SELECT
    round(1537, -1)   AS nearest_ten,
    round(1537, -2)   AS nearest_hundred,
    round(1537, -3)   AS nearest_thousand;
```

Returns 1540, 1500, 2000.

## Logarithmic Bucketing with roundToExp2

Create latency histograms with exponentially spaced bins, which better represent the distribution of response times than linear bins.

```sql
CREATE TABLE api_latencies
(
    endpoint    String,
    latency_ms  UInt64
)
ENGINE = MergeTree
ORDER BY endpoint;

INSERT INTO api_latencies VALUES
('/search',  3), ('/search', 7), ('/search', 12), ('/search', 45),
('/search', 128), ('/search', 300), ('/search', 512), ('/search', 1100),
('/api',    2),  ('/api', 5),    ('/api', 18),   ('/api', 64),
('/api',    95), ('/api', 200),  ('/api', 800);
```

Group latencies by power-of-2 bucket to reveal the distribution shape.

```sql
SELECT
    endpoint,
    roundToExp2(latency_ms) AS latency_bucket_ms,
    count()                 AS request_count
FROM api_latencies
GROUP BY endpoint, latency_bucket_ms
ORDER BY endpoint, latency_bucket_ms;
```

## File Size Representation

`roundToExp2()` is natural for memory and storage sizes, which are conventionally described in powers of 2.

```sql
SELECT
    file_size_bytes,
    roundToExp2(file_size_bytes) AS nearest_power_of_2,
    log2(roundToExp2(file_size_bytes)) AS power_exponent
FROM (
    SELECT arrayJoin([1500, 4200, 15000, 65000, 500000]) AS file_size_bytes
);
```

## Combining round() with Aggregates

Apply `round()` to aggregate results for cleaner reporting output.

```sql
SELECT
    endpoint,
    round(avg(latency_ms), 1)    AS avg_latency,
    round(quantile(0.95)(latency_ms), 1) AS p95,
    round(max(latency_ms), 0)    AS max_latency
FROM api_latencies
GROUP BY endpoint;
```

## Summary

`round()` is the standard function for rounding to a specified number of decimal places. For Float types it uses banker's rounding (round half to even), while Decimal and integer types use round half away from zero. Use it for currency formatting, metric display, and any case where the nearest value at a given precision is needed. `roundToExp2()` provides logarithmic bucketing by snapping values down to the nearest power of 2, making it ideal for latency histograms, file size classification, and memory representations where exponentially spaced intervals are more meaningful than linear ones.
