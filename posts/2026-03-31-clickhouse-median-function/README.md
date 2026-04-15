# How to Use median() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Median, Percentile

Description: Learn how median() works in ClickHouse as an alias for quantile(0.5), and when to use medianExact() or medianTDigest() for accuracy or tail-optimized results.

---

ClickHouse provides the `median()` function as a convenient shorthand for computing the 50th percentile of a dataset. Under the hood, `median()` is an alias for `quantile(0.5)`, which means it uses reservoir sampling and returns an approximate result. For exact or tail-optimized median calculations, ClickHouse also provides `medianExact()` and `medianTDigest()`.

## Basic Syntax

```sql
-- Approximate median of response times
SELECT median(response_ms) AS median_response
FROM http_requests;
```

This is equivalent to:

```sql
SELECT quantile(0.5)(response_ms) AS median_response
FROM http_requests;
```

## median() vs medianExact()

`median()` uses reservoir sampling and may return a slightly different result each run. `medianExact()` partially sorts all values and returns the true median.

```sql
-- Approximate median (fast, uses sampling)
SELECT median(latency_ms) AS approx_median
FROM traces;

-- Exact median (partially sorts all values, accurate)
SELECT medianExact(latency_ms) AS exact_median
FROM traces;
```

Use `medianExact()` when:
- You need guaranteed accuracy for reporting
- The dataset fits comfortably in memory
- Reproducibility matters (e.g., regression testing)

## medianTDigest() for Large Datasets

`medianTDigest()` uses the t-digest algorithm to compute an approximate median with good accuracy while keeping memory usage bounded:

```sql
-- Memory-efficient approximate median
SELECT medianTDigest(latency_ms) AS tdigest_median
FROM large_events_table;
```

For the median specifically (p50), `medianTDigest()` is more accurate than `median()` while still being much faster than `medianExact()` on very large datasets.

## Grouping and Filtering

```sql
-- Median response time per service, last 7 days
SELECT
    service,
    median(response_ms) AS median_response
FROM http_requests
WHERE event_date >= today() - 7
GROUP BY service
ORDER BY median_response DESC;
```

```sql
-- Exact median per endpoint for today
SELECT
    endpoint,
    medianExact(latency_ms) AS exact_median,
    count()                  AS request_count
FROM http_requests
WHERE event_date = today()
GROUP BY endpoint
ORDER BY exact_median DESC
LIMIT 20;
```

## Comparing All Three Variants

```sql
-- Run all three median variants side by side
SELECT
    median(latency_ms)          AS approx_median,
    medianExact(latency_ms)     AS exact_median,
    medianTDigest(latency_ms)   AS tdigest_median
FROM http_requests
WHERE event_date = today();
```

For most production workloads with millions of rows, `median()` and `medianTDigest()` will give results very close to `medianExact()` at a fraction of the compute cost.

## medianExactWeighted() for Pre-Aggregated Data

When each row carries a weight representing multiple observations, use the weighted variant:

```sql
-- Correct median from a pre-aggregated table
SELECT medianExactWeighted(duration_ms, event_count) AS weighted_median
FROM aggregated_durations
WHERE date = today();
```

Using `medianExact()` without weighting on this table would give a biased result because each row would count equally regardless of its weight.

## Performance Notes

```sql
-- median() is fast on large datasets due to sampling
SELECT median(value) AS fast_median
FROM events
WHERE date >= today() - 30;

-- medianExact() is slower but safe for smaller aggregations
SELECT medianExact(value) AS accurate_median
FROM events
WHERE date = today()
  AND service = 'checkout';
```

As a rule of thumb, use `medianExact()` for filtered queries over bounded datasets, and `median()` or `medianTDigest()` for full-table scans or long time ranges.

## Summary

`median()` in ClickHouse is a convenient alias for `quantile(0.5)` that returns a fast approximate result using reservoir sampling. When accuracy is required, `medianExact()` provides the true median by partially sorting all values. For large datasets where accuracy and memory efficiency both matter, `medianTDigest()` offers a good balance. Use weighted variants (`medianExactWeighted()`) when working with pre-aggregated tables that include a count or weight column.
