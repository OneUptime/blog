# How to Use toStartOfTenMinutes() and toStartOfFifteenMinutes() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Time Series, Analytics, Dashboard

Description: Learn how to use toStartOfTenMinutes() and toStartOfFifteenMinutes() in ClickHouse to bucket timestamps for monitoring dashboards and network traffic analysis.

---

Not every monitoring use case needs per-minute granularity. When you want to reduce noise, lower query cardinality, or align with standard reporting intervals, ClickHouse provides `toStartOfTenMinutes()` and `toStartOfFifteenMinutes()` to snap timestamps into 10-minute and 15-minute buckets respectively.

This post covers how both functions work, when to prefer them over finer granularities, and demonstrates practical SQL patterns for infrastructure monitoring, network traffic analysis, and multi-granularity dashboards.

## toStartOfTenMinutes() - 10-Minute Buckets

`toStartOfTenMinutes(dt)` returns a `DateTime` snapped to the start of the nearest 10-minute boundary. Boundaries occur at :00, :10, :20, :30, :40, and :50 of each hour.

```sql
SELECT
    toDateTime('2026-03-31 14:22:47')                          AS input,
    toStartOfTenMinutes(toDateTime('2026-03-31 14:22:47'))     AS ten_min_start;
```

```text
input                ten_min_start
-------------------- --------------------
2026-03-31 14:22:47  2026-03-31 14:20:00
```

A timestamp at 14:22:47 falls in the 14:20 bucket (the most recent boundary at a multiple of 10 minutes past the hour).

## Server Metric Aggregation at 10-Minute Intervals

10-minute buckets are a good fit for server metrics where per-minute data would be too granular to read on a multi-hour dashboard:

```sql
SELECT
    toStartOfTenMinutes(collected_at)   AS bucket,
    host,
    avg(cpu_usage_pct)                  AS avg_cpu,
    max(cpu_usage_pct)                  AS peak_cpu,
    avg(memory_used_gb)                 AS avg_memory_gb,
    avg(network_in_mbps)                AS avg_net_in,
    avg(network_out_mbps)               AS avg_net_out
FROM server_metrics
WHERE collected_at >= now() - INTERVAL 6 HOUR
GROUP BY bucket, host
ORDER BY bucket, host;
```

## Gap-Free 10-Minute Time Series

Use `WITH FILL` to ensure every 10-minute slot appears in the result even when no data was collected:

```sql
SELECT
    toStartOfTenMinutes(collected_at)  AS bucket,
    avg(cpu_usage_pct)                 AS avg_cpu
FROM server_metrics
WHERE collected_at >= now() - INTERVAL 6 HOUR
GROUP BY bucket
ORDER BY bucket ASC WITH FILL
    FROM toStartOfTenMinutes(now() - INTERVAL 6 HOUR)
    TO   toStartOfTenMinutes(now())
    STEP INTERVAL 10 MINUTE;
```

## toStartOfFifteenMinutes() - 15-Minute Buckets

`toStartOfFifteenMinutes(dt)` snaps timestamps to :00, :15, :30, or :45 of each hour.

```sql
SELECT
    toDateTime('2026-03-31 14:22:47')                              AS input,
    toStartOfFifteenMinutes(toDateTime('2026-03-31 14:22:47'))     AS fifteen_min_start;
```

```text
input                fifteen_min_start
-------------------- --------------------
2026-03-31 14:22:47  2026-03-31 14:15:00
```

14:22:47 lands in the 14:15 bucket because that is the most recent :XX where XX is 0, 15, 30, or 45.

## Network Traffic Analysis at 15-Minute Intervals

15-minute intervals are a traditional network monitoring standard (originally driven by SNMP polling intervals). ClickHouse makes it easy to reproduce this granularity:

```sql
SELECT
    toStartOfFifteenMinutes(captured_at)  AS bucket,
    interface,
    sum(bytes_in)                         AS total_bytes_in,
    sum(bytes_out)                        AS total_bytes_out,
    max(bytes_in)                         AS peak_bytes_in,
    max(bytes_out)                        AS peak_bytes_out,
    round(sum(bytes_in) / 1048576, 2)     AS mb_in,
    round(sum(bytes_out) / 1048576, 2)    AS mb_out
FROM network_flow
WHERE captured_at >= now() - INTERVAL 24 HOUR
GROUP BY bucket, interface
ORDER BY bucket, interface;
```

## Gap-Free 15-Minute Time Series

```sql
SELECT
    toStartOfFifteenMinutes(captured_at)  AS bucket,
    sum(bytes_in)                         AS bytes_in
FROM network_flow
WHERE captured_at >= now() - INTERVAL 12 HOUR
GROUP BY bucket
ORDER BY bucket ASC WITH FILL
    FROM toStartOfFifteenMinutes(now() - INTERVAL 12 HOUR)
    TO   toStartOfFifteenMinutes(now())
    STEP INTERVAL 15 MINUTE;
```

## Multi-Granularity Dashboard Query

A dashboard that lets users zoom from 1-minute to 15-minute resolution can use a single parameterized approach. The following example unions all four granularities for comparison:

```sql
SELECT '1min'  AS granularity, toStartOfMinute(created_at)          AS bucket, count() AS requests
FROM http_logs WHERE created_at >= now() - INTERVAL 1 HOUR GROUP BY bucket

UNION ALL

SELECT '5min'  AS granularity, toStartOfFiveMinutes(created_at)     AS bucket, count() AS requests
FROM http_logs WHERE created_at >= now() - INTERVAL 3 HOUR GROUP BY bucket

UNION ALL

SELECT '10min' AS granularity, toStartOfTenMinutes(created_at)      AS bucket, count() AS requests
FROM http_logs WHERE created_at >= now() - INTERVAL 6 HOUR GROUP BY bucket

UNION ALL

SELECT '15min' AS granularity, toStartOfFifteenMinutes(created_at)  AS bucket, count() AS requests
FROM http_logs WHERE created_at >= now() - INTERVAL 12 HOUR GROUP BY bucket

ORDER BY granularity, bucket;
```

## Detecting Sustained Load at 10-Minute Resolution

A short spike at the per-minute level may not be actionable. Aggregating at 10-minute resolution helps identify sustained elevated load:

```sql
SELECT
    toStartOfTenMinutes(created_at)                               AS bucket,
    count()                                                        AS requests,
    countIf(status_code >= 500)                                    AS errors,
    round(countIf(status_code >= 500) / count() * 100, 3)         AS error_rate_pct,
    avg(response_ms)                                               AS avg_response_ms,
    quantile(0.99)(response_ms)                                    AS p99_response_ms
FROM http_logs
WHERE created_at >= now() - INTERVAL 24 HOUR
GROUP BY bucket
ORDER BY bucket;
```

## Comparing 10-Minute Buckets Across Days

Identify whether certain 10-minute windows are consistently problematic across multiple days:

```sql
SELECT
    formatDateTime(bucket, '%H:%i')   AS time_of_day,
    count()                           AS occurrences,
    avg(error_rate_pct)               AS avg_error_rate
FROM (
    SELECT
        toStartOfTenMinutes(created_at)                         AS bucket,
        round(countIf(status_code >= 500) / count() * 100, 3)  AS error_rate_pct
    FROM http_logs
    WHERE created_at >= now() - INTERVAL 30 DAY
    GROUP BY bucket
)
GROUP BY time_of_day
ORDER BY avg_error_rate DESC
LIMIT 20;
```

## Summary

`toStartOfTenMinutes()` and `toStartOfFifteenMinutes()` are the right bucketing functions when 5-minute granularity introduces too much noise or too many data points for a given time range. Use 10-minute buckets for multi-hour server metric views and sustained-load detection. Use 15-minute buckets for network traffic analysis and reports that align with traditional SNMP polling intervals. Both functions integrate naturally with `WITH FILL` for gap-free time series and work well alongside finer-grained functions in multi-resolution dashboards.
