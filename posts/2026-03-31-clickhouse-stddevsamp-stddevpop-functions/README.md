# How to Use stddevSamp() and stddevPop() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Standard Deviation, Statistics

Description: Learn how to use stddevSamp() and stddevPop() in ClickHouse to measure data spread in the same units as your metric, with practical monitoring examples.

---

Standard deviation is one of the most interpretable statistical measures because its result is expressed in the same units as the original data. If you measure response time in milliseconds, the standard deviation is also in milliseconds - making it immediately actionable. ClickHouse provides `stddevSamp()` for sample standard deviation and `stddevPop()` for population standard deviation, both built as aggregate functions that compose naturally with GROUP BY, window functions, and materialized views.

## The Relationship to Variance

Standard deviation is simply the square root of variance. ClickHouse provides it as a dedicated function rather than requiring you to wrap `varSamp()` in `sqrt()` every time.

```sql
-- These produce equivalent results
SELECT sqrt(varSamp(response_time_ms)) FROM request_logs;
SELECT stddevSamp(response_time_ms)    FROM request_logs;
```

The same sample vs population distinction applies:

- `stddevSamp(x)` uses N-1 in the denominator (Bessel's correction) - use for samples.
- `stddevPop(x)` uses N in the denominator - use for complete populations.

## Basic Usage

```sql
-- Standard deviation of API latency per endpoint
SELECT
    endpoint,
    avg(response_time_ms)      AS mean_latency_ms,
    stddevSamp(response_time_ms) AS stddev_latency_ms,
    count()                     AS request_count
FROM request_logs
WHERE log_date = today()
GROUP BY endpoint
ORDER BY stddev_latency_ms DESC
LIMIT 20;
```

A high standard deviation relative to the mean indicates high variance in performance - a common signal that an endpoint has inconsistent behavior under load.

## Practical Example - SLA Monitoring

```sql
-- Identify services where latency spread exceeds 200ms
SELECT
    service_name,
    round(avg(response_time_ms), 2)        AS mean_ms,
    round(stddevSamp(response_time_ms), 2) AS stddev_ms,
    count()                                AS requests
FROM request_logs
WHERE log_date = today()
GROUP BY service_name
HAVING stddev_ms > 200
ORDER BY stddev_ms DESC;
```

## Using stddevPop() for Complete Populations

```sql
-- Population stddev for a fixed set of benchmark runs
SELECT
    benchmark_name,
    stddevPop(execution_time_ms)  AS pop_stddev,
    stddevSamp(execution_time_ms) AS samp_stddev,
    count()                       AS run_count
FROM benchmark_results
GROUP BY benchmark_name;
```

For large samples the two values converge. The difference is most noticeable when count() is small (under 30).

## Computing Confidence Intervals

Standard deviation enables approximate confidence intervals for mean estimates.

```sql
-- 95% confidence interval for mean latency (using 1.96 * stddev / sqrt(n))
SELECT
    endpoint,
    round(avg(response_time_ms), 2)                             AS mean_ms,
    round(stddevSamp(response_time_ms), 2)                      AS stddev_ms,
    round(avg(response_time_ms)
          - 1.96 * stddevSamp(response_time_ms) / sqrt(count()), 2) AS ci_lower,
    round(avg(response_time_ms)
          + 1.96 * stddevSamp(response_time_ms) / sqrt(count()), 2) AS ci_upper,
    count()                                                     AS n
FROM request_logs
WHERE log_date = today()
GROUP BY endpoint
ORDER BY mean_ms DESC
LIMIT 10;
```

## Window Function Usage

Use stddevSamp as a window function to compute rolling standard deviation per partition without collapsing rows.

```sql
-- Rolling stddev of latency over the last hour, per endpoint
SELECT
    timestamp,
    endpoint,
    response_time_ms,
    stddevSamp(response_time_ms) OVER (
        PARTITION BY endpoint
        ORDER BY timestamp
        RANGE BETWEEN 3600 PRECEDING AND CURRENT ROW
    ) AS rolling_stddev_1h
FROM request_logs
WHERE log_date = today()
ORDER BY endpoint, timestamp;
```

## Z-Score Anomaly Detection

Standard deviation is the natural unit for z-scores, which identify how many standard deviations a data point is from the mean.

```sql
-- Flag high z-score latency spikes per endpoint
SELECT
    request_id,
    endpoint,
    response_time_ms,
    round((response_time_ms - mean_ms) / stddev_ms, 2) AS z_score
FROM (
    SELECT
        request_id,
        endpoint,
        response_time_ms,
        avg(response_time_ms) OVER (PARTITION BY endpoint) AS mean_ms,
        stddevSamp(response_time_ms) OVER (PARTITION BY endpoint) AS stddev_ms
    FROM request_logs
    WHERE log_date = today()
)
WHERE abs(z_score) > 3
ORDER BY z_score DESC
LIMIT 100;
```

## Pre-Aggregating with AggregatingMergeTree

```sql
CREATE TABLE hourly_stddev
(
    stat_hour  DateTime,
    service    String,
    lat_stddev AggregateFunction(stddevSamp, Float64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (stat_hour, service);

CREATE MATERIALIZED VIEW mv_hourly_stddev
TO hourly_stddev
AS
SELECT
    toStartOfHour(timestamp)         AS stat_hour,
    service_name                     AS service,
    stddevSampState(response_time_ms) AS lat_stddev
FROM request_logs
GROUP BY stat_hour, service;

-- Query merged result
SELECT
    stat_hour,
    service,
    stddevSampMerge(lat_stddev) AS latency_stddev_ms
FROM hourly_stddev
GROUP BY stat_hour, service
ORDER BY stat_hour DESC;
```

## Summary

`stddevSamp()` and `stddevPop()` compute standard deviation in the same unit as the input data, making them more interpretable than raw variance for monitoring and alerting. Use `stddevSamp()` for sampled time windows and `stddevPop()` for complete populations. Combined with `avg()` and window functions, standard deviation enables confidence intervals, z-score anomaly detection, and SLA spread analysis directly in ClickHouse SQL.
