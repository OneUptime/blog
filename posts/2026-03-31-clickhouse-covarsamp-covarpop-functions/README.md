# How to Use covarSamp() and covarPop() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Covariance, Statistics

Description: Learn how to use covarSamp() and covarPop() in ClickHouse to measure linear co-movement between two variables, with monitoring and observability examples.

---

Covariance measures whether two numeric variables tend to move together. A positive covariance means they increase and decrease in tandem; a negative covariance means when one rises the other falls; near-zero covariance indicates no linear relationship. ClickHouse provides `covarSamp(x, y)` and `covarPop(x, y)` for sample and population covariance respectively. While covariance itself is scale-dependent and harder to interpret than correlation, it is a foundational building block for regression, correlation, and portfolio analysis.

## Syntax

Both functions take two numeric columns and return a Float64.

```sql
-- Sample covariance
SELECT covarSamp(x_column, y_column) FROM table_name;

-- Population covariance
SELECT covarPop(x_column, y_column) FROM table_name;
```

Use `covarSamp()` when your data is a sample from a larger population (Bessel's correction, divides by N-1). Use `covarPop()` when your data is the entire population (divides by N).

## Understanding the Sign

```sql
-- Does CPU usage co-move with response time?
SELECT
    covarSamp(cpu_percent, response_time_ms) AS cov_cpu_latency
FROM host_metrics
WHERE metric_time >= now() - INTERVAL 1 HOUR;
```

- Positive result: higher CPU tends to coincide with higher latency.
- Negative result: higher CPU coincides with lower latency (unusual but possible in burst-then-idle patterns).
- Near zero: no linear relationship detected.

## Practical Example - Latency and Error Rate Co-movement

```sql
-- Does error rate rise when latency rises, per service?
SELECT
    service_name,
    covarSamp(
        avg_latency_ms,
        error_rate
    ) AS cov_latency_errors,
    count() AS time_buckets
FROM (
    SELECT
        service_name,
        toStartOfMinute(timestamp)          AS minute,
        avg(response_time_ms)               AS avg_latency_ms,
        countIf(status_code >= 500) / count() AS error_rate
    FROM request_logs
    WHERE log_date = today()
    GROUP BY service_name, minute
)
GROUP BY service_name
ORDER BY abs(cov_latency_errors) DESC;
```

## Population vs Sample Covariance

```sql
-- Compare covarSamp and covarPop for the same data
SELECT
    covarPop(cpu_percent, memory_percent)  AS pop_covariance,
    covarSamp(cpu_percent, memory_percent) AS samp_covariance,
    count()                                AS n
FROM host_metrics
WHERE metric_time >= now() - INTERVAL 1 HOUR;
```

For large N they converge. For small N (under 30), the difference matters: `covarSamp()` is unbiased for samples.

## Covariance Matrix for Multiple Metrics

Compute pairwise covariances across several metrics to understand their relationships.

```sql
-- Pairwise covariances between three service metrics
SELECT
    covarSamp(latency_ms, cpu_pct)    AS cov_lat_cpu,
    covarSamp(latency_ms, mem_pct)    AS cov_lat_mem,
    covarSamp(cpu_pct, mem_pct)       AS cov_cpu_mem,
    varSamp(latency_ms)               AS var_latency,
    varSamp(cpu_pct)                  AS var_cpu,
    varSamp(mem_pct)                  AS var_mem
FROM (
    SELECT
        toStartOfMinute(timestamp) AS minute,
        avg(response_time_ms)      AS latency_ms,
        avg(cpu_percent)           AS cpu_pct,
        avg(memory_percent)        AS mem_pct
    FROM host_metrics
    WHERE metric_time >= now() - INTERVAL 6 HOUR
    GROUP BY minute
);
```

## Normalizing Covariance to Correlation

Covariance is scale-dependent: a covariance of 500 between CPU and latency is hard to interpret on its own. Dividing by the product of standard deviations gives the Pearson correlation (range -1 to 1), which is scale-free. ClickHouse's `corr()` function does this directly, but you can also compute it manually:

```sql
-- Manual Pearson correlation from covariance and stddev
SELECT
    covarSamp(cpu_percent, response_time_ms)
        / (stddevSamp(cpu_percent) * stddevSamp(response_time_ms)) AS pearson_r
FROM host_metrics
WHERE metric_time >= now() - INTERVAL 1 HOUR;
```

Compare this result with `corr(cpu_percent, response_time_ms)` - they should be identical.

## Covariance Over Time Windows

```sql
-- Track rolling covariance between latency and CPU over time
SELECT
    toStartOfHour(metric_time) AS hour,
    host_name,
    covarSamp(response_time_ms, cpu_percent) AS hourly_covariance
FROM host_metrics
WHERE metric_time >= now() - INTERVAL 24 HOUR
GROUP BY hour, host_name
ORDER BY hour DESC;
```

## Using -State and -Merge for Incremental Aggregation

```sql
CREATE TABLE hourly_covariance
(
    stat_hour DateTime,
    service   String,
    cov_state AggregateFunction(covarSamp, Float64, Float64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (stat_hour, service);

CREATE MATERIALIZED VIEW mv_hourly_covariance
TO hourly_covariance
AS
SELECT
    toStartOfHour(timestamp)                               AS stat_hour,
    service_name                                           AS service,
    covarSampState(toFloat64(response_time_ms),
                   toFloat64(cpu_percent))                 AS cov_state
FROM request_logs
GROUP BY stat_hour, service;

-- Query
SELECT
    stat_hour,
    service,
    covarSampMerge(cov_state) AS latency_cpu_covariance
FROM hourly_covariance
GROUP BY stat_hour, service
ORDER BY stat_hour DESC;
```

## Summary

`covarSamp(x, y)` and `covarPop(x, y)` measure the linear co-movement between two numeric variables in ClickHouse. `covarSamp()` applies Bessel's correction for unbiased estimation from samples, while `covarPop()` assumes the complete population. Covariance is most useful as a building block for correlation and regression analysis; divide by the product of the two standard deviations to obtain the scale-free Pearson correlation, or use ClickHouse's built-in `corr()` function directly.
