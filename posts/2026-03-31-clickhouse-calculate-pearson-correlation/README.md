# How to Calculate Pearson Correlation Coefficient in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Pearson Correlation, Statistics, corr(), Analytics, Data Science

Description: Learn how to calculate Pearson correlation coefficients in ClickHouse using the built-in corr() function to find linear relationships between metrics.

---

The Pearson correlation coefficient measures the linear relationship between two variables, returning a value between -1 (perfect negative correlation) and 1 (perfect positive correlation). ClickHouse provides the `corr()` aggregate function for computing this directly.

## The corr() Function

```sql
SELECT corr(x, y) FROM table;
-- Returns: value between -1 and 1
-- 1.0  = perfect positive correlation
-- 0.0  = no linear relationship
-- -1.0 = perfect negative correlation
```

## Basic Example: Latency vs Error Rate

```sql
SELECT
    service,
    corr(avg_latency_ms, error_rate) AS latency_error_correlation
FROM (
    SELECT
        service,
        toStartOfHour(timestamp) AS hour,
        avg(duration_ms) AS avg_latency_ms,
        countIf(status_code >= 500) / count() AS error_rate
    FROM http_requests
    WHERE timestamp >= now() - INTERVAL 30 DAY
    GROUP BY service, hour
)
GROUP BY service
ORDER BY abs(latency_error_correlation) DESC;
```

## Correlation Matrix

Compute correlations between multiple metrics at once:

```sql
WITH metrics AS (
    SELECT
        toStartOfHour(timestamp) AS hour,
        avg(cpu_pct) AS cpu,
        avg(memory_mb) AS memory,
        avg(response_ms) AS latency,
        sum(error_count) AS errors,
        sum(request_count) AS requests
    FROM system_metrics
    WHERE timestamp >= now() - INTERVAL 7 DAY
    GROUP BY hour
)
SELECT
    corr(cpu, latency) AS cpu_vs_latency,
    corr(cpu, errors) AS cpu_vs_errors,
    corr(memory, latency) AS memory_vs_latency,
    corr(memory, errors) AS memory_vs_errors,
    corr(requests, errors) AS requests_vs_errors,
    corr(cpu, memory) AS cpu_vs_memory
FROM metrics;
```

## Correlation Over Time Windows

Detect if correlations are changing:

```sql
SELECT
    toStartOfWeek(hour) AS week,
    corr(avg_latency, error_rate) AS correlation
FROM (
    SELECT
        toStartOfHour(timestamp) AS hour,
        avg(duration_ms) AS avg_latency,
        countIf(status_code >= 500) / count() AS error_rate
    FROM http_requests
    GROUP BY hour
)
GROUP BY week
ORDER BY week;
```

## Using corrMatrix for Multiple Columns

ClickHouse has `corrMatrix` for computing a full correlation matrix from an array of values:

```sql
SELECT corrMatrix(cpu, memory, latency) AS correlation_matrix
FROM (
    SELECT avg(cpu_pct) AS cpu, avg(memory_mb) AS memory, avg(response_ms) AS latency
    FROM system_metrics
    GROUP BY toStartOfHour(timestamp)
);
```

## Interpreting Results

```text
|r| >= 0.9  : Very strong correlation
|r| >= 0.7  : Strong correlation
|r| >= 0.5  : Moderate correlation
|r| >= 0.3  : Weak correlation
|r| < 0.3   : Very weak or no linear correlation
```

## Correlation with Significance

For a sense of statistical confidence, note that correlation alone does not prove causation, and Pearson assumes linear relationships and normally distributed variables:

```sql
SELECT
    service,
    corr(latency, error_rate) AS r,
    count() AS n,
    -- Rough t-statistic for H0: r=0
    corr(latency, error_rate) * sqrt(count() - 2) / sqrt(1 - pow(corr(latency, error_rate), 2)) AS t_stat
FROM hourly_metrics
GROUP BY service
HAVING abs(t_stat) > 2;  -- Roughly significant at p < 0.05 for large n
```

## Summary

ClickHouse's `corr()` function makes it straightforward to compute Pearson correlation coefficients between any two numeric metrics. Use it to find relationships between system metrics, user behavior signals, and business KPIs. For multiple variable correlations, `corrMatrix` computes the full correlation matrix in one pass.
