# How to Calculate Spearman Rank Correlation in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Spearman Correlation, Statistics, Rank Correlation, Analytics, SQL

Description: Learn how to calculate Spearman rank correlation in ClickHouse using SQL-based ranking to find monotonic relationships between variables.

---

Spearman rank correlation measures the monotonic relationship between two variables by first converting values to ranks, then computing the Pearson correlation on those ranks. It is more robust than Pearson for non-linear relationships and outliers.

## Why Spearman Instead of Pearson?

```text
- Data has outliers that distort linear correlation
- Relationship is monotonic but not linear
- Variables are ordinal (ordered categories)
- Values follow non-normal distributions
```

## Computing Spearman Correlation in ClickHouse

ClickHouse provides a built-in `rankCorr()` aggregate function (added in v20.9) that computes Spearman's rank correlation coefficient directly:

```sql
SELECT rankCorr(x, y) AS spearman_r
FROM your_table;
```

If you need more control — for example, to apply your own tie-handling strategy — you can implement it manually by ranking values with window functions and applying `corr()` to the ranks:

```sql
WITH ranked AS (
    SELECT
        x,
        y,
        row_number() OVER (ORDER BY x) AS rank_x,
        row_number() OVER (ORDER BY y) AS rank_y
    FROM your_table
)
SELECT corr(rank_x, rank_y) AS spearman_r
FROM ranked;
```

## Practical Example: Service Latency vs Error Count

```sql
WITH hourly_metrics AS (
    SELECT
        toStartOfHour(timestamp) AS hour,
        avg(duration_ms) AS avg_latency,
        countIf(status_code >= 500) AS error_count
    FROM http_requests
    WHERE timestamp >= now() - INTERVAL 30 DAY
    GROUP BY hour
),
ranked AS (
    SELECT
        avg_latency,
        error_count,
        row_number() OVER (ORDER BY avg_latency) AS rank_latency,
        row_number() OVER (ORDER BY error_count) AS rank_errors
    FROM hourly_metrics
)
SELECT
    round(corr(rank_latency, rank_errors), 4) AS spearman_r,
    count() AS n_observations
FROM ranked;
```

## Spearman vs Pearson Comparison

Compute both to see if the relationship is linear or just monotonic:

```sql
WITH hourly AS (
    SELECT
        avg(duration_ms) AS latency,
        sum(errors) AS errors
    FROM metrics
    GROUP BY toStartOfHour(timestamp)
),
ranked AS (
    SELECT
        latency,
        errors,
        row_number() OVER (ORDER BY latency) AS rank_latency,
        row_number() OVER (ORDER BY errors) AS rank_errors
    FROM hourly
)
SELECT
    round(corr(latency, errors), 4) AS pearson_r,
    round(corr(rank_latency, rank_errors), 4) AS spearman_r
FROM ranked;
```

If Spearman is much higher than Pearson, the relationship is monotonic but non-linear.

## Handling Ties

When values are tied, use `rank()` instead of `row_number()` to assign the same rank to tied values:

```sql
WITH ranked AS (
    SELECT
        x,
        y,
        rank() OVER (ORDER BY x) AS rank_x,
        rank() OVER (ORDER BY y) AS rank_y
    FROM your_table
)
SELECT corr(rank_x, rank_y) AS spearman_r
FROM ranked;
```

## Per-Service Spearman Correlation

```sql
WITH hourly AS (
    SELECT
        service,
        toStartOfHour(timestamp) AS hour,
        avg(duration_ms) AS latency,
        countIf(status_code >= 500) AS errors
    FROM http_requests
    GROUP BY service, hour
),
ranked AS (
    SELECT
        service,
        latency,
        errors,
        row_number() OVER (PARTITION BY service ORDER BY latency) AS rank_latency,
        row_number() OVER (PARTITION BY service ORDER BY errors) AS rank_errors
    FROM hourly
)
SELECT
    service,
    round(corr(rank_latency, rank_errors), 4) AS spearman_r,
    count() AS n
FROM ranked
GROUP BY service
ORDER BY abs(spearman_r) DESC;
```

## Summary

Spearman rank correlation in ClickHouse is computed by ranking values with window functions and then applying `corr()` to the ranks. It is more robust than Pearson for skewed data and outliers. Use it when you want to detect monotonic relationships in metrics like latency, error rates, and resource utilization.
