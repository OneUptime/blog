# How to Calculate Skewness and Kurtosis in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Statistics, Skewness, Kurtosis, Analytics

Description: Learn how to calculate skewness and kurtosis in ClickHouse to measure the shape and tail behavior of your data distributions.

---

## What Are Skewness and Kurtosis?

Skewness measures the asymmetry of a distribution around its mean. A positive skew means the tail is on the right; negative skew means the tail is on the left. Kurtosis measures the "tailedness" of a distribution - how much of the variance comes from extreme values compared to a normal distribution.

Both metrics are critical for understanding whether your data follows assumptions required by many statistical models.

## Built-in Functions in ClickHouse

ClickHouse provides native aggregate functions for both metrics:

- `skewSamp` and `skewPop` for skewness
- `kurtSamp` and `kurtPop` for kurtosis

The `Samp` variants use sample formulas (dividing by n-1) while `Pop` variants use population formulas (dividing by n).

## Calculating Skewness

```sql
SELECT
    skewSamp(response_time_ms) AS skewness_sample,
    skewPop(response_time_ms)  AS skewness_population
FROM request_logs
WHERE toDate(created_at) = today();
```

A skewness near 0 indicates a symmetric distribution. Values above 1 or below -1 are considered highly skewed.

## Calculating Kurtosis

```sql
SELECT
    kurtSamp(latency_ms) AS kurtosis_sample,
    kurtPop(latency_ms)  AS kurtosis_population
FROM api_metrics
WHERE service = 'checkout';
```

ClickHouse returns Pearson's kurtosis, where a value of 3 corresponds to a normal distribution. To get excess kurtosis (where 0 is normal), subtract 3 from the result. Values higher than 3 indicate heavy tails - a warning sign for outliers.

## Combining with Other Statistics

A useful pattern is to compute a full statistical summary in one query:

```sql
SELECT
    count()                     AS total,
    avg(response_time_ms)       AS mean,
    stddevSamp(response_time_ms) AS std_dev,
    skewSamp(response_time_ms)  AS skewness,
    kurtSamp(response_time_ms)  AS kurtosis,
    min(response_time_ms)       AS min_val,
    max(response_time_ms)       AS max_val
FROM request_logs
WHERE toDate(created_at) >= today() - 7;
```

## Segmenting by Dimension

You can break down skewness and kurtosis by a dimension to spot per-service anomalies:

```sql
SELECT
    service_name,
    skewSamp(latency_ms) AS skewness,
    kurtSamp(latency_ms) AS kurtosis
FROM service_metrics
GROUP BY service_name
ORDER BY skewness DESC;
```

Services with high positive skewness often have occasional very slow requests dragging the tail.

## Practical Thresholds

```text
Skewness:
  -0.5 to 0.5  => approximately symmetric
  -1.0 to -0.5 or 0.5 to 1.0 => moderately skewed
  < -1.0 or > 1.0 => highly skewed

Kurtosis (Pearson's, as returned by ClickHouse):
  ~3  => normal-like tails (mesokurtic)
  > 4 => heavy tails (leptokurtic)
  < 2 => light tails (platykurtic)
```

## Summary

ClickHouse provides `skewSamp`, `skewPop`, `kurtSamp`, and `kurtPop` as first-class aggregate functions. Use them alongside `avg`, `stddevSamp`, and percentile functions to build a complete picture of your data's distribution. High skewness or kurtosis in latency metrics often signals performance problems worth investigating.
