# How to Calculate Time to First Byte (TTFB) Percentiles in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TTFB, Percentile, Performance, Web Vitals

Description: Calculate TTFB percentiles (p50, p75, p95, p99) in ClickHouse to monitor web server response time distribution and identify slowdowns.

---

## Why Percentiles for TTFB

Average TTFB hides outliers. A p99 of 2,000 ms means 1% of users wait 2 seconds - a significant user experience issue that averages miss. Percentiles reveal the tail latency that matters most.

## Table Schema

```sql
CREATE TABLE request_logs (
    request_id  UUID,
    endpoint    String,
    ttfb_ms     UInt32,
    status_code UInt16,
    region      String,
    ts          DateTime
) ENGINE = MergeTree()
ORDER BY (ts, endpoint)
TTL ts + INTERVAL 90 DAY;
```

## Overall TTFB Percentiles

```sql
SELECT
    quantile(0.50)(ttfb_ms)  AS p50,
    quantile(0.75)(ttfb_ms)  AS p75,
    quantile(0.90)(ttfb_ms)  AS p90,
    quantile(0.95)(ttfb_ms)  AS p95,
    quantile(0.99)(ttfb_ms)  AS p99,
    avg(ttfb_ms)              AS avg_ms,
    count()                   AS requests
FROM request_logs
WHERE ts >= now() - INTERVAL 1 HOUR;
```

## TTFB Percentiles by Endpoint

```sql
SELECT
    endpoint,
    quantile(0.50)(ttfb_ms)  AS p50,
    quantile(0.95)(ttfb_ms)  AS p95,
    quantile(0.99)(ttfb_ms)  AS p99,
    count()                   AS requests
FROM request_logs
WHERE ts >= now() - INTERVAL 24 HOUR
GROUP BY endpoint
HAVING requests >= 100
ORDER BY p99 DESC
LIMIT 20;
```

## TTFB Trend Over Time

```sql
SELECT
    toStartOfMinute(ts)       AS minute,
    quantile(0.50)(ttfb_ms)   AS p50,
    quantile(0.95)(ttfb_ms)   AS p95,
    quantile(0.99)(ttfb_ms)   AS p99,
    count()                   AS requests
FROM request_logs
WHERE ts >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

## Using quantiles for Multiple Percentiles at Once

The `quantiles` function is more efficient than multiple `quantile` calls.

```sql
SELECT
    endpoint,
    quantiles(0.50, 0.75, 0.90, 0.95, 0.99)(ttfb_ms) AS pctiles
FROM request_logs
WHERE ts >= today()
GROUP BY endpoint
ORDER BY pctiles[5] DESC  -- sort by p99 (5th element)
LIMIT 10;
```

## Web Vitals Thresholds

Classify requests by Web Vitals TTFB thresholds (Google).

```sql
SELECT
    countIf(ttfb_ms <= 800)   AS good,          -- <= 800 ms
    countIf(ttfb_ms > 800 AND ttfb_ms <= 1800) AS needs_improvement,
    countIf(ttfb_ms > 1800)   AS poor,
    count()                   AS total
FROM request_logs
WHERE ts >= today() - 1
  AND status_code = 200;
```

## TTFB by Region

```sql
SELECT
    region,
    quantile(0.95)(ttfb_ms) AS p95,
    count()                 AS requests
FROM request_logs
WHERE ts >= today() - 7
GROUP BY region
ORDER BY p95 DESC;
```

## Summary

ClickHouse's `quantile` and `quantiles` aggregate functions calculate TTFB percentiles across millions of log rows in seconds. Use p95 and p99 to track tail latency by endpoint and region, and classify requests against Core Web Vitals thresholds to prioritize performance improvements.
