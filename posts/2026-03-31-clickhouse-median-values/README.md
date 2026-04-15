# How to Calculate Median Values in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Median, quantileExact, median Function, Statistics

Description: Learn how to calculate exact and approximate median values in ClickHouse using the median, quantile, and quantileExact functions for statistical analysis.

---

## Median vs. Average

Medians are more robust than averages for skewed distributions. A single high-value outlier can dramatically inflate an average. For latency, revenue, and file sizes, the median better represents the typical user experience.

## Basic Median

ClickHouse provides a `median` function as a shortcut for the 0.5 quantile:

```sql
SELECT
    median(latency_ms) AS median_latency,
    avg(latency_ms) AS avg_latency
FROM requests
WHERE event_time >= today() - 1;
```

## median vs. quantileExact vs. quantile

Three options with different accuracy-performance tradeoffs:

```sql
-- median: approximate (reservoir sampling), fast for large datasets
SELECT median(latency_ms) FROM requests;

-- quantile(0.5): same reservoir sampling approximation
SELECT quantile(0.5)(latency_ms) FROM requests;

-- quantileExact(0.5): exact, requires sorting all values
SELECT quantileExact(0.5)(latency_ms) FROM requests;
```

For datasets under ~10 million rows, use `quantileExact`. For billions of rows, `median` or `quantile` is sufficient.

## Median by Group

Compare median latency across services:

```sql
SELECT
    service,
    median(latency_ms) AS p50,
    quantile(0.95)(latency_ms) AS p95,
    quantile(0.99)(latency_ms) AS p99,
    count() AS requests
FROM http_logs
WHERE event_time >= today() - 1
GROUP BY service
ORDER BY p50 DESC;
```

## Median Over Time

Track median latency hourly:

```sql
SELECT
    toStartOfHour(event_time) AS hour,
    medianExact(latency_ms) AS median_latency,
    count() AS requests
FROM requests
WHERE event_time >= now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour;
```

## Weighted Median

For aggregated data where each row represents multiple samples:

```sql
SELECT quantileExactWeighted(0.5)(latency_ms, request_count) AS weighted_median
FROM aggregated_metrics
WHERE metric_date = today() - 1;
```

## Moving Median

Calculate a 7-day rolling median:

```sql
SELECT
    day,
    daily_median,
    median(daily_median) OVER (
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_7d_median
FROM (
    SELECT toDate(event_time) AS day, median(latency_ms) AS daily_median
    FROM requests GROUP BY day
    ORDER BY day
);
```

## Comparing Median and Mean

Find metrics where the mean significantly exceeds the median, indicating outliers:

```sql
SELECT
    endpoint,
    median(latency_ms) AS median_ms,
    round(avg(latency_ms), 2) AS mean_ms,
    round(avg(latency_ms) / median(latency_ms), 2) AS mean_to_median_ratio
FROM requests
WHERE event_time >= today() - 1
GROUP BY endpoint
HAVING mean_to_median_ratio > 2
ORDER BY mean_to_median_ratio DESC;
```

## Summary

ClickHouse calculates medians with the `median` function (approximate, fast) or `quantileExact(0.5)` (exact, slower). Group medians compare distributions across dimensions, time-series medians track trend changes, and weighted medians handle pre-aggregated data. A large mean-to-median ratio signals outlier contamination.
