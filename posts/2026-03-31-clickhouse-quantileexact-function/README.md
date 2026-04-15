# How to Use quantileExact() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, quantileExact, Percentile

Description: Learn how to compute exact percentiles with quantileExact() in ClickHouse, when to use it over approximate methods, and how to apply weighted variants.

---

ClickHouse provides several quantile functions for percentile calculations. While `quantile()` uses sampling for speed, `quantileExact()` computes the true percentile by loading all values into memory and partially sorting them - giving you precise results at the cost of higher memory usage. This post covers the syntax, variants, and tradeoffs.

## Basic Syntax

The `quantileExact()` function takes a level parameter between 0 and 1 and a column expression.

```sql
-- Compute exact 95th percentile of response_time
SELECT quantileExact(0.95)(response_time) AS p95
FROM requests;
```

You can compute multiple exact quantiles in a single pass using `quantilesExact()`:

```sql
-- Compute multiple exact percentiles at once
SELECT quantilesExact(0.5, 0.75, 0.9, 0.95, 0.99)(response_time) AS percentiles
FROM requests;
```

The return value is an array containing the requested percentiles in order.

## Exact vs Approximate Percentile

`quantile()` uses reservoir sampling and returns an approximate result. `quantileExact()` loads all values and partially sorts them to find the exact rank.

```sql
-- Approximate (fast, low memory)
SELECT quantile(0.99)(response_time) AS approx_p99
FROM requests;

-- Exact (slower, higher memory, guaranteed accuracy)
SELECT quantileExact(0.99)(response_time) AS exact_p99
FROM requests;
```

Use `quantileExact()` when:
- The dataset is small enough that sorting is feasible
- Regulatory or SLA reporting requires exact values
- You need reproducible, deterministic results

## Using quantileExactWeighted()

`quantileExactWeighted()` accepts a weight column, allowing each value to contribute proportionally to the percentile calculation.

```sql
-- Weighted exact percentile: each request weighted by its byte size
SELECT quantileExactWeighted(0.95)(response_time, bytes_sent) AS weighted_p95
FROM requests;
```

This is useful for weighted sampling scenarios where rows represent aggregated counts rather than individual observations.

```sql
-- Aggregated table: value with pre-aggregated counts
SELECT quantileExactWeighted(0.5)(duration_ms, event_count) AS weighted_median
FROM aggregated_durations
WHERE date = today();
```

## quantileExactLow and quantileExactHigh

ClickHouse also provides `quantileExactLow()` and `quantileExactHigh()` for discrete quantile definitions:

```sql
-- Return the lower observed value at the quantile boundary
SELECT quantileExactLow(0.5)(response_time) AS median_low
FROM requests;

-- Return the upper observed value at the quantile boundary
SELECT quantileExactHigh(0.5)(response_time) AS median_high
FROM requests;
```

These differ from `quantileExact()` at boundaries where the exact quantile falls between two data points.

## Performance Tradeoffs

```sql
-- Measure impact: run on a large dataset
SELECT
    quantile(0.95)(response_time)      AS approx_p95,
    quantileExact(0.95)(response_time) AS exact_p95
FROM requests
WHERE event_date >= today() - 7;
```

For datasets with tens of millions of rows, `quantileExact()` can be significantly slower and use much more memory than `quantile()`. Prefer `quantileExact()` for smaller aggregations or when run with a narrow `WHERE` clause.

## Practical Example - SLA Reporting

```sql
-- Exact SLA percentiles by service
SELECT
    service_name,
    quantileExact(0.50)(latency_ms) AS p50,
    quantileExact(0.95)(latency_ms) AS p95,
    quantileExact(0.99)(latency_ms) AS p99
FROM service_requests
WHERE event_date = today()
GROUP BY service_name
ORDER BY p99 DESC;
```

## Summary

`quantileExact()` delivers precise percentile values by loading all input data into memory and partially sorting it, making it ideal for SLA reporting, compliance use cases, and smaller datasets where accuracy outweighs performance concerns. For large-scale approximate workloads, prefer `quantile()` or `quantileTDigest()`. Use `quantileExactWeighted()` when your data carries a weight column representing pre-aggregated counts.
