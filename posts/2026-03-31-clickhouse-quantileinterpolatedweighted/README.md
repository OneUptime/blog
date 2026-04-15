# How to Use quantileInterpolatedWeighted() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, quantileInterpolatedWeighted, Percentile

Description: Learn how quantileInterpolatedWeighted() computes weighted quantiles with linear interpolation in ClickHouse for accurate percentiles from pre-aggregated data.

---

ClickHouse's `quantileInterpolatedWeighted()` function computes weighted quantiles using linear interpolation between neighboring data points. Unlike functions that return one of the observed values, this function can return a value that falls between two data points, producing a smoother result. It is especially useful when working with pre-aggregated tables where each row carries a weight representing a count of observations.

## Basic Syntax

`quantileInterpolatedWeighted()` requires two arguments: the value column and the weight column.

```sql
-- 95th percentile with linear interpolation, weighted by request count
SELECT quantileInterpolatedWeighted(0.95)(latency_ms, request_count) AS p95
FROM aggregated_latency;
```

For multiple percentiles in one pass, use `quantilesInterpolatedWeighted()`:

```sql
-- Multiple weighted interpolated percentiles
SELECT quantilesInterpolatedWeighted(0.5, 0.75, 0.9, 0.95, 0.99)(latency_ms, request_count) AS percentiles
FROM aggregated_latency;
```

## How Linear Interpolation Works

When the exact quantile rank falls between two data points, `quantileInterpolatedWeighted()` computes a weighted linear interpolation between them rather than rounding to one side.

```sql
-- Example: if p95 rank falls between value 240 and 260 at 50%,
-- the result would be 250 rather than 240 or 260
SELECT quantileInterpolatedWeighted(0.95)(response_ms, weight) AS p95_interpolated
FROM sampled_responses;
```

This contrasts with `quantileExactWeighted()`, which always returns one of the observed values:

```sql
-- Compare exact weighted vs interpolated weighted
SELECT
    quantileExactWeighted(0.95)(response_ms, weight)        AS p95_exact,
    quantileInterpolatedWeighted(0.95)(response_ms, weight) AS p95_interpolated
FROM sampled_responses;
```

## Working with Pre-Aggregated Data

The most common use case is computing accurate percentiles from a table that has already been aggregated by value:

```sql
-- Table storing a histogram of observed latency values
-- Each row: a latency bucket value and how many times it was observed
SELECT quantileInterpolatedWeighted(0.99)(latency_bucket_ms, observation_count) AS p99
FROM latency_histogram
WHERE date = today()
  AND service = 'api-gateway';
```

Without weighting, running `quantileExact()` on this table would give an incorrect result since each row represents multiple observations.

## Comparing Weighted Quantile Functions

```sql
-- Compare exact vs interpolated weighted percentiles
SELECT
    quantileExactWeighted(0.95)(latency_ms, cnt)        AS exact_weighted_p95,
    quantileInterpolatedWeighted(0.95)(latency_ms, cnt) AS interpolated_p95
FROM (
    SELECT latency_ms, count() AS cnt
    FROM http_requests
    WHERE event_date = today()
    GROUP BY latency_ms
);
```

The interpolated version smooths the result at quantile boundaries, which is particularly noticeable at smaller sample sizes.

## Practical Example - Percentiles from a Histogram Table

```sql
-- Compute full percentile profile from a histogram table
SELECT
    service,
    quantileInterpolatedWeighted(0.50)(value_ms, cnt) AS p50,
    quantileInterpolatedWeighted(0.75)(value_ms, cnt) AS p75,
    quantileInterpolatedWeighted(0.90)(value_ms, cnt) AS p90,
    quantileInterpolatedWeighted(0.95)(value_ms, cnt) AS p95,
    quantileInterpolatedWeighted(0.99)(value_ms, cnt) AS p99
FROM latency_histograms
WHERE date >= today() - 7
GROUP BY service
ORDER BY p99 DESC;
```

## Multiple Quantiles in One Query

```sql
-- Retrieve all percentile levels as a single array
SELECT
    service,
    quantilesInterpolatedWeighted(0.5, 0.9, 0.95, 0.99)(value_ms, cnt) AS pct_array
FROM latency_histograms
WHERE date = today()
GROUP BY service;
```

The array elements correspond to the quantile levels in the order specified.

## Summary

`quantileInterpolatedWeighted()` is the right choice when computing percentiles from pre-aggregated data where each row has a weight column and you want interpolated results rather than discrete observed values. Note that the weight column must use an unsigned integer type (`UInt8`, `UInt16`, `UInt32`, or `UInt64`). For higher interpolation accuracy, consider the newer `quantileExactWeightedInterpolated()` function, which ClickHouse recommends as a more precise alternative. Both functions are well-suited for histogram-based latency tables and weighted metric stores in ClickHouse.
