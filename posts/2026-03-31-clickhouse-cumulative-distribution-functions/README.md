# How to Implement Cumulative Distribution Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CDF, Statistics, Window Function, Analytics

Description: Learn how to compute cumulative distribution functions in ClickHouse using window functions and quantile aggregates to analyze data distributions.

---

A Cumulative Distribution Function (CDF) tells you what fraction of values fall at or below a given threshold. ClickHouse makes CDF computation straightforward with window functions and aggregate functions.

## Computing CDF with Window Functions

```sql
SELECT
    response_time_ms,
    count() AS freq,
    sum(count()) OVER (ORDER BY response_time_ms ROWS UNBOUNDED PRECEDING) AS cumulative,
    sum(count()) OVER () AS total,
    round(
        sum(count()) OVER (ORDER BY response_time_ms ROWS UNBOUNDED PRECEDING)
        / sum(count()) OVER (),
        4
    ) AS cdf
FROM http_requests
GROUP BY response_time_ms
ORDER BY response_time_ms;
```

This returns each unique value alongside its cumulative probability.

## Bucketed CDF

For continuous data, bucket values into ranges first:

```sql
SELECT
    bucket,
    count() AS freq,
    round(
        sum(count()) OVER (ORDER BY bucket ROWS UNBOUNDED PRECEDING)
        / sum(count()) OVER (),
        4
    ) AS cdf
FROM (
    SELECT intDiv(response_time_ms, 50) * 50 AS bucket
    FROM http_requests
)
GROUP BY bucket
ORDER BY bucket;
```

## Using quantile Functions

ClickHouse's `quantile` and `quantiles` aggregates let you directly query specific CDF percentiles:

```sql
SELECT
    quantile(0.50)(response_time_ms) AS p50,
    quantile(0.90)(response_time_ms) AS p90,
    quantile(0.95)(response_time_ms) AS p95,
    quantile(0.99)(response_time_ms) AS p99
FROM http_requests;
```

For multiple percentiles in one pass:

```sql
SELECT quantiles(0.5, 0.75, 0.90, 0.95, 0.99)(response_time_ms) AS percentiles
FROM http_requests;
```

## Inverse CDF: Checking Threshold Coverage

To find what percentage of requests complete under 200ms:

```sql
SELECT
    countIf(response_time_ms <= 200) / count() AS fraction_under_200ms
FROM http_requests;
```

## Sampling for Large Datasets

For very large tables, use `quantileTDigest` or `quantileGK` for memory-efficient approximate computation:

```sql
SELECT quantileTDigest(0.99)(response_time_ms) AS p99_approx
FROM http_requests;
```

## Summary

ClickHouse supports CDF computation via running `sum()` window functions over grouped data or through `quantile` aggregate functions. Use bucketed windows for continuous distributions and `quantileTDigest` for approximate but memory-efficient percentile queries on large tables.
