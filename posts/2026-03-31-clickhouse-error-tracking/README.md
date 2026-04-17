# How to Build Error Tracking with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Error Tracking, Observability, Exception, Monitoring

Description: Build a scalable error tracking system with ClickHouse to capture, group, and alert on application exceptions in real time.

---

Error tracking requires high write throughput for exception ingestion and fast aggregation for grouping and trend analysis. ClickHouse handles both well, making it a strong backend for a self-hosted error tracking system.

## Error Events Table

```sql
CREATE TABLE error_events
(
    error_id UUID DEFAULT generateUUIDv4(),
    service_name LowCardinality(String),
    environment LowCardinality(String),
    error_type LowCardinality(String),
    error_message String,
    stack_trace String,
    fingerprint UInt64,
    user_id UInt64 DEFAULT 0,
    release_version LowCardinality(String),
    occurred_at DateTime64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(occurred_at)
ORDER BY (service_name, fingerprint, occurred_at);
```

## Top Errors by Frequency

```sql
SELECT
    service_name,
    error_type,
    any(error_message) AS sample_message,
    count() AS occurrences,
    countDistinct(user_id) AS affected_users,
    min(occurred_at) AS first_seen,
    max(occurred_at) AS last_seen
FROM error_events
WHERE occurred_at >= now() - INTERVAL 24 HOUR
GROUP BY service_name, error_type, fingerprint
ORDER BY occurrences DESC
LIMIT 20;
```

## New Errors in the Last Hour (First Seen)

```sql
SELECT
    service_name,
    error_type,
    any(error_message) AS sample_message,
    count() AS occurrences
FROM error_events
WHERE occurred_at >= now() - INTERVAL 1 HOUR
  AND fingerprint NOT IN (
      SELECT DISTINCT fingerprint
      FROM error_events
      WHERE occurred_at < now() - INTERVAL 1 HOUR
        AND occurred_at >= now() - INTERVAL 7 DAY
  )
GROUP BY service_name, error_type, fingerprint
ORDER BY occurrences DESC;
```

## Error Rate per Release Version

```sql
SELECT
    release_version,
    service_name,
    count() AS errors,
    countDistinct(user_id) AS affected_users,
    min(occurred_at) AS first_error,
    max(occurred_at) AS latest_error
FROM error_events
WHERE occurred_at >= now() - INTERVAL 30 DAY
GROUP BY release_version, service_name
ORDER BY errors DESC;
```

## Error Spike Detection - 5-Minute Buckets

```sql
SELECT
    toStartOfFiveMinutes(occurred_at) AS bucket,
    service_name,
    error_type,
    count() AS error_count
FROM error_events
WHERE occurred_at >= now() - INTERVAL 2 HOUR
GROUP BY bucket, service_name, error_type
ORDER BY bucket DESC, error_count DESC;
```

## Most Impacted Users

```sql
SELECT
    user_id,
    count() AS total_errors,
    countDistinct(error_type) AS distinct_error_types,
    groupArray(3)(error_type) AS error_sample
FROM error_events
WHERE occurred_at >= now() - INTERVAL 24 HOUR
  AND user_id > 0
GROUP BY user_id
ORDER BY total_errors DESC
LIMIT 20;
```

## Materialized View for Error Counts by Fingerprint

```sql
CREATE MATERIALIZED VIEW error_hourly_counts
ENGINE = AggregatingMergeTree()
ORDER BY (service_name, fingerprint, hour)
AS
SELECT
    service_name,
    fingerprint,
    any(error_type) AS error_type,
    toStartOfHour(occurred_at) AS hour,
    countState() AS occurrences,
    uniqState(user_id) AS affected_users
FROM error_events
GROUP BY service_name, fingerprint, hour;
```

## Summary

ClickHouse stores error events with fingerprint-based grouping, enabling fast queries for top errors, new regressions, and release-level impact. Using `AggregatingMergeTree` materialized views keeps error dashboards responsive while raw event tables retain full detail for drill-down investigations. This pattern supports millions of errors per day without performance degradation.
