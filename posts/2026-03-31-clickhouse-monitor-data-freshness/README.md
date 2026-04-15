# How to Monitor Data Freshness in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Freshness, Monitoring, SLA, Latency, Data Quality

Description: Monitor data freshness in ClickHouse by tracking the lag between event time and ingestion time, alerting on stale data and SLA breaches.

---

## What Is Data Freshness?

Data freshness measures how current your data is - the gap between when an event happened and when it's queryable in ClickHouse. For real-time dashboards and alerting, stale data means misleading metrics or missed incidents.

## Tracking Ingestion Timestamps

Add an ingestion timestamp column to your tables:

```sql
CREATE TABLE events (
    event_id   UUID,
    event_time DateTime,         -- when the event occurred
    ingested_at DateTime DEFAULT now(),  -- when it arrived in ClickHouse
    event_type LowCardinality(String),
    user_id    UInt64
) ENGINE = MergeTree()
ORDER BY (event_type, event_time);
```

The `DEFAULT now()` fills the ingestion time automatically at insert.

## Measuring Current Data Lag

```sql
SELECT
    now() - max(event_time) AS lag_seconds,
    max(event_time)         AS latest_event,
    now()                   AS current_time
FROM events;
```

If `lag_seconds` is above your SLA threshold, data is stale.

## Lag by Event Type

Different event types may have different freshness expectations:

```sql
SELECT
    event_type,
    now() - max(event_time) AS lag_seconds,
    max(ingested_at)        AS last_ingested
FROM events
GROUP BY event_type
ORDER BY lag_seconds DESC;
```

## Freshness by Partition

Check freshness per day partition:

```sql
SELECT
    toDate(event_time) AS day,
    count()            AS row_count,
    max(ingested_at)   AS last_ingested,
    now() - max(ingested_at) AS since_last_insert_seconds
FROM events
WHERE event_time >= today() - 2
GROUP BY day
ORDER BY day DESC;
```

## Prometheus/Grafana Alerting

Export freshness metrics to Prometheus using ClickHouse's built-in Prometheus endpoint or a custom exporter:

```sql
-- Query for Prometheus scrape
SELECT
    'clickhouse_data_lag_seconds' AS metric_name,
    now() - max(event_time)       AS value
FROM events;
```

Create a Grafana alert: trigger when `clickhouse_data_lag_seconds > 300` (5 minutes).

## Detecting Pipeline Gaps

Spot gaps in time-series data using `WITH FILL` to surface minutes with no events:

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count()                     AS events
FROM events
WHERE event_time >= now() - INTERVAL 2 HOUR
GROUP BY minute
ORDER BY minute WITH FILL
    FROM toStartOfMinute(now() - INTERVAL 2 HOUR)
    TO toStartOfMinute(now())
    STEP INTERVAL 1 MINUTE;
```

Rows where `events` is 0 indicate minutes with no data, which may signal a pipeline failure.

## Automated Freshness Check

Schedule a query that writes freshness results to a monitoring table:

```sql
INSERT INTO freshness_log
SELECT
    now()                          AS check_time,
    'events'                       AS table_name,
    now() - max(event_time)        AS lag_seconds
FROM events;
```

Alert when `lag_seconds` exceeds your SLA from the monitoring table.

## Summary

Monitor ClickHouse data freshness by adding ingestion timestamps, querying the gap between `now()` and `max(event_time)`, tracking freshness per event type and partition, and integrating lag metrics with Prometheus or a monitoring table. Set alerts on lag thresholds matching your data SLA requirements.
