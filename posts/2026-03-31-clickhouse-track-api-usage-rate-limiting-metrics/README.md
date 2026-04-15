# How to Track API Usage and Rate Limiting Metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, API Analytics, Rate Limiting, Quota, Throttle

Description: Learn how to store API request logs in ClickHouse and query usage patterns, rate limit violations, and quota consumption by account and endpoint.

---

API platforms need visibility into how their APIs are consumed - which endpoints are called most, which accounts are hitting rate limits, and how quota burns over a billing period. ClickHouse's fast aggregation over log-scale datasets makes it the right tool for these analyses.

## Schema

```sql
CREATE TABLE api_requests
(
    ts            DateTime64(3),
    account_id    UInt64,
    api_key_id    UInt64,
    endpoint      LowCardinality(String),
    method        LowCardinality(FixedString(7)),
    status_code   UInt16,
    duration_ms   UInt32,
    rate_limited  UInt8,  -- 1 if 429 was returned
    tokens_used   UInt32  -- for quota tracking
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (account_id, ts);
```

## Total API Calls and Rate Limit Violations

```sql
SELECT
    account_id,
    count()                        AS total_requests,
    countIf(rate_limited = 1)      AS rate_limit_hits,
    rate_limit_hits * 100.0 / total_requests AS rl_rate_pct
FROM api_requests
WHERE ts >= now() - INTERVAL 24 HOUR
GROUP BY account_id
ORDER BY rate_limit_hits DESC
LIMIT 20;
```

## Top Endpoints by Request Volume

```sql
SELECT
    endpoint,
    count()           AS requests,
    countIf(status_code >= 400) AS errors,
    avg(duration_ms)  AS avg_latency_ms,
    quantile(0.99)(duration_ms) AS p99_latency_ms
FROM api_requests
WHERE ts >= now() - INTERVAL 1 HOUR
GROUP BY endpoint
ORDER BY requests DESC
LIMIT 20;
```

## Quota Consumption per Account (Monthly)

```sql
SELECT
    account_id,
    sum(tokens_used) AS tokens_consumed_mtd
FROM api_requests
WHERE toStartOfMonth(ts) = toStartOfMonth(now())
GROUP BY account_id
ORDER BY tokens_consumed_mtd DESC
LIMIT 50;
```

## Rate Limit Violations Over Time

Detect spikes in throttling:

```sql
SELECT
    toStartOfMinute(ts) AS minute,
    countIf(rate_limited = 1) AS rl_hits
FROM api_requests
WHERE ts >= now() - INTERVAL 6 HOUR
GROUP BY minute
ORDER BY minute;
```

## Per-Endpoint Latency Trend

```sql
SELECT
    toStartOfHour(ts) AS hour,
    endpoint,
    quantile(0.95)(duration_ms) AS p95_ms
FROM api_requests
WHERE ts >= now() - INTERVAL 7 DAY
GROUP BY hour, endpoint
ORDER BY hour, endpoint;
```

## Error Rate by Endpoint

```sql
SELECT
    endpoint,
    countIf(status_code >= 500) AS server_errors,
    countIf(status_code = 429)  AS rate_limited,
    countIf(status_code = 400)  AS bad_requests,
    count()                      AS total
FROM api_requests
WHERE ts >= toStartOfDay(now())
GROUP BY endpoint
ORDER BY server_errors DESC;
```

## Summary

ClickHouse is a natural fit for API analytics and rate limit monitoring. Store every API request as an event, then query account-level quota consumption, endpoint-level latency percentiles, and rate limit violation patterns. Pre-aggregate per-minute summaries with materialized views to power real-time API health dashboards without scanning the full request log on every refresh.
