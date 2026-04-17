# How to Build a Data Quality Monitoring System with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Quality, Monitoring, Observability, Analytics

Description: Learn how to build a data quality monitoring system in ClickHouse that tracks null rates, row counts, value distributions, and freshness over time.

---

## Why Data Quality Monitoring

Analytics built on bad data are worse than no analytics. Null values, schema drift, outlier distributions, and stale tables silently corrupt dashboards. A data quality monitoring system detects these issues automatically and alerts before they affect users.

## Quality Metrics Store

Create a table to store quality check results over time:

```sql
CREATE TABLE data_quality_results
(
    check_time      DateTime DEFAULT now(),
    table_name      LowCardinality(String),
    check_name      LowCardinality(String),
    metric_value    Float64,
    threshold       Float64,
    passed          UInt8,
    details         String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(check_time)
ORDER BY (table_name, check_name, check_time);
```

## Null Rate Check

Measure the fraction of null or empty values in critical columns:

```sql
INSERT INTO data_quality_results
SELECT
    now(),
    'events',
    'null_rate_user_id',
    countIf(user_id = 0) / count() AS null_rate,
    0.01,
    null_rate < 0.01,
    concat('null_rate=', toString(null_rate))
FROM events
WHERE event_time >= today();
```

## Freshness Check

Detect stale tables by checking the maximum event time:

```sql
INSERT INTO data_quality_results
SELECT
    now(),
    'events',
    'freshness_minutes',
    dateDiff('minute', max(event_time), now()) AS lag_minutes,
    60,
    lag_minutes < 60,
    concat('lag=', toString(lag_minutes), 'min')
FROM events;
```

## Volume Check

Compare today's row count to the 7-day average:

```sql
INSERT INTO data_quality_results
WITH
    today_count AS (
        SELECT count() AS cnt FROM events WHERE toDate(event_time) = today()
    ),
    avg_count AS (
        SELECT avg(cnt) AS avg_cnt FROM (
            SELECT toDate(event_time) AS d, count() AS cnt
            FROM events
            WHERE event_time >= today() - 7 AND event_time < today()
            GROUP BY d
        )
    )
SELECT
    now(), 'events', 'volume_ratio',
    today_count.cnt / avg_count.avg_cnt,
    0.8,
    today_count.cnt / avg_count.avg_cnt >= 0.8,
    ''
FROM today_count, avg_count;
```

## Dashboard Query

View recent check results:

```sql
SELECT
    table_name,
    check_name,
    metric_value,
    threshold,
    passed,
    check_time
FROM data_quality_results
WHERE check_time >= now() - INTERVAL 24 HOUR
ORDER BY passed ASC, check_time DESC;
```

## Alerting Integration

Schedule the checks hourly and route failures to an alerting webhook:

```bash
#!/bin/bash
FAILURES=$(clickhouse-client --query \
  "SELECT count() FROM data_quality_results WHERE NOT passed AND check_time >= now() - INTERVAL 1 HOUR")

if [ "$FAILURES" -gt 0 ]; then
  curl -X POST "$ALERT_WEBHOOK" -d "{\"failures\": $FAILURES}"
fi
```

## Summary

A ClickHouse data quality monitoring system stores metric results in a dedicated table, running checks for null rates, freshness, and volume on a schedule. Historical results enable trend analysis, and a simple script or cron job routes failures to alerting systems. This makes data quality a first-class operational concern.
