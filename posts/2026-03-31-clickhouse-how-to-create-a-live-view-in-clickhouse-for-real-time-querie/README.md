# How to Create a Live View in ClickHouse for Real-Time Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Live View, Real-Time, Streaming, Analytics

Description: Learn how to create and use Live Views in ClickHouse for real-time query results that automatically refresh as new data arrives.

---

## What Is a Live View in ClickHouse

A Live View is a special view type in ClickHouse that caches the result of a query and automatically updates when the underlying tables change. Clients can WATCH a Live View and receive push notifications when new results are available.

Live Views are useful for:
- Real-time dashboards that need the latest aggregation without polling
- Monitoring queries that should reflect new inserts immediately
- Streaming applications that need continuous query results

```sql
-- Enable Live Views
SET allow_experimental_live_view = 1;
```

## Creating a Basic Live View

```sql
SET allow_experimental_live_view = 1;

-- Source table
CREATE TABLE sensor_readings (
    sensor_id UInt32,
    ts DateTime DEFAULT now(),
    temperature Float32,
    humidity Float32
) ENGINE = MergeTree()
ORDER BY (sensor_id, ts);

-- Create a live view on top of the table
CREATE LIVE VIEW sensor_summary AS
SELECT
    sensor_id,
    round(avg(temperature), 2) AS avg_temp,
    round(avg(humidity), 2) AS avg_humidity,
    max(ts) AS last_reading,
    count() AS reading_count
FROM sensor_readings
GROUP BY sensor_id;
```

## Querying a Live View

A regular SELECT on a Live View returns the current cached result:

```sql
-- Current snapshot
SELECT * FROM sensor_summary ORDER BY sensor_id;

-- Insert new data and the view auto-updates on next query
INSERT INTO sensor_readings VALUES (1, now(), 22.5, 55.0);
SELECT * FROM sensor_summary WHERE sensor_id = 1;
```

## Watching a Live View for Changes

The `WATCH` command blocks and streams new result sets as data changes:

```sql
-- Watch for any changes (runs until you stop it)
WATCH sensor_summary;

-- Watch with a limit on number of result sets
WATCH sensor_summary LIMIT 10;

-- Watch with events - shows row counts per change event
WATCH sensor_summary EVENTS;
```

Each time a new INSERT happens into the source table, a new result set is sent to the WATCH client. This enables reactive streaming from ClickHouse.

## Live View with Periodic Refresh

You can create a Live View with a fixed refresh interval using `WITH REFRESH`:

```sql
-- Refresh every 5 seconds
CREATE LIVE VIEW live_metrics
WITH REFRESH 5
AS SELECT
    toStartOfMinute(now()) AS current_minute,
    count() AS total_events,
    uniq(user_id) AS active_users
FROM events
WHERE ts >= now() - INTERVAL 5 MINUTE;
```

The `WITH REFRESH N` setting causes the view to re-execute its query every N seconds regardless of whether the source data changed. This is useful for time-window queries.

## Practical Example: Real-Time Error Rate Monitor

```sql
SET allow_experimental_live_view = 1;

CREATE TABLE http_requests (
    ts DateTime DEFAULT now(),
    method LowCardinality(String),
    status_code UInt16,
    path String,
    response_ms UInt32
) ENGINE = MergeTree()
ORDER BY ts;

-- Live view showing last 5 minutes error rate
CREATE LIVE VIEW error_rate_live
WITH REFRESH 10  -- refresh every 10 seconds
AS SELECT
    toStartOfMinute(ts) AS minute,
    count() AS total_requests,
    countIf(status_code >= 500) AS server_errors,
    countIf(status_code >= 400) AS client_errors,
    round(countIf(status_code >= 500) / count() * 100, 2) AS error_rate_pct,
    round(avg(response_ms), 0) AS avg_response_ms
FROM http_requests
WHERE ts >= now() - INTERVAL 5 MINUTE
GROUP BY minute
ORDER BY minute;

-- Watch the error rate in real time
WATCH error_rate_live;
```

## Differences Between Live View, Materialized View, and Regular View

| Feature | Regular View | Materialized View | Live View |
|---------|-------------|-------------------|-----------|
| Data stored | No | Yes | Cached |
| Auto-updates | No | On insert | On insert / timer |
| WATCH support | No | No | Yes |
| Push notifications | No | No | Yes |
| Use case | Query simplification | Pre-aggregation | Real-time monitoring |

## Live View Limitations

```sql
-- Live Views are experimental - check the documentation for your version
-- They are not supported on:
-- - Distributed tables in all configurations
-- - Complex subqueries in some cases

-- Monitor active live views
SELECT database, name, engine
FROM system.tables
WHERE engine = 'LiveView'
  AND database = currentDatabase();

-- Drop a live view
DROP VIEW IF EXISTS sensor_summary;
DROP VIEW IF EXISTS error_rate_live;
```

## Using Live Views with External Clients

Live Views can be consumed via the HTTP interface with `WATCH`:

```bash
# HTTP long-polling interface
curl "http://localhost:8123/?query=WATCH+sensor_summary&user=default"
```

```python
import clickhouse_connect

client = clickhouse_connect.get_client()
# Use query_rows_stream for WATCH behavior
with client.query_rows_stream("WATCH sensor_summary LIMIT 5") as stream:
    for row in stream:
        print(row)
```

## Summary

Live Views in ClickHouse provide real-time query capabilities by caching query results and notifying watching clients when source data changes. Use `CREATE LIVE VIEW` with an optional `WITH REFRESH N` for time-based polling, and use `WATCH` to receive streaming updates. They are ideal for monitoring dashboards and alerting systems that need push-based data delivery rather than periodic polling, though they remain an experimental feature with some limitations.
