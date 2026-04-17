# How to Create a Live View in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, Live View, Real-Time

Description: Learn how to create Live Views in ClickHouse, use the WATCH statement to stream query result changes, and understand their use cases and limitations.

---

Live Views are a ClickHouse-specific feature that re-executes a query whenever the underlying tables change and pushes the updated result to connected clients. Unlike regular views that pull data on demand, a live view acts as a push channel - clients subscribe with `WATCH` and receive new result sets automatically. This makes live views useful for building real-time dashboards, alerting pipelines, and monitoring UIs without polling. Note that live views are an experimental feature that has since been deprecated in ClickHouse and must be explicitly enabled.

## Enabling Live Views

Live views require the `allow_experimental_live_view` setting to be enabled. Set it for the session or add it to `users.xml`:

```sql
SET allow_experimental_live_view = 1;
```

For a permanent configuration in `users.xml`:

```xml
<profiles>
  <default>
    <allow_experimental_live_view>1</allow_experimental_live_view>
  </default>
</profiles>
```

## Basic CREATE LIVE VIEW Syntax

```sql
CREATE LIVE VIEW [IF NOT EXISTS] [db.]view_name
[WITH [TIMEOUT [value_in_sec]] [AND] [REFRESH [period_in_sec]]]
AS SELECT ...;
```

A simple live view over a metrics table:

```sql
CREATE LIVE VIEW live_error_rate AS
SELECT
    toStartOfMinute(event_time) AS minute,
    countIf(status = 'error')   AS errors,
    count()                     AS total,
    errors / total              AS error_rate
FROM app_events
WHERE event_time > now() - INTERVAL 10 MINUTE
GROUP BY minute
ORDER BY minute;
```

## Watching a Live View

The `WATCH` statement subscribes to updates. Each time the source data changes, ClickHouse re-executes the SELECT and sends the new result set to the client:

```sql
WATCH live_error_rate;
```

With a limit on the number of updates to receive:

```sql
WATCH live_error_rate LIMIT 100;
```

With events mode - returns only the version counter (no result rows) on each change:

```sql
WATCH live_error_rate EVENTS;
```

The `WATCH` command is a long-running, streaming command. In the ClickHouse CLI it will continue printing updated result sets until you interrupt it.

## Setting a Timeout

A live view can be configured to automatically expire after a period of inactivity:

```sql
CREATE LIVE VIEW IF NOT EXISTS live_active_users
WITH TIMEOUT 300   -- expire after 5 minutes of no WATCH connections
AS
SELECT
    count(DISTINCT user_id) AS active_users
FROM sessions
WHERE last_seen > now() - INTERVAL 5 MINUTE;
```

Once the timeout expires and there are no active watchers, the live view is dropped.

## Periodic Refresh

By default, a live view only updates when the source table receives new data. You can also force periodic re-evaluation with `REFRESH`:

```sql
CREATE LIVE VIEW live_system_stats
WITH REFRESH 5   -- re-execute every 5 seconds regardless of inserts
AS
SELECT
    metric,
    value
FROM system.metrics
WHERE metric IN ('Query', 'Merge', 'PartMutation');
```

Periodic refresh is useful when the source is a system table or external source that does not trigger insert-based change notifications.

## Practical Example - Real-Time Dashboard Feed

Here is a complete pattern for a live view powering a real-time error dashboard:

```sql
-- Source table
CREATE TABLE app_events
(
    event_time  DateTime DEFAULT now(),
    service     LowCardinality(String),
    level       LowCardinality(String),
    message     String
)
ENGINE = MergeTree()
ORDER BY (service, level, event_time);

-- Live view for error counts per service in the last minute
SET allow_experimental_live_view = 1;

CREATE LIVE VIEW live_error_summary
WITH REFRESH 10
AS
SELECT
    service,
    countIf(level = 'ERROR')   AS error_count,
    countIf(level = 'WARN')    AS warn_count,
    count()                    AS total_count,
    now()                      AS as_of
FROM app_events
WHERE event_time > now() - INTERVAL 60 SECOND
GROUP BY service
ORDER BY error_count DESC;

-- Subscribe from a monitoring client
WATCH live_error_summary;
```

Every 10 seconds, connected `WATCH` clients receive a fresh summary without any polling logic on their end.

## Inspecting Live Views

```sql
-- List live views
SELECT name, engine
FROM system.tables
WHERE engine = 'LiveView';

-- Show definition
SHOW CREATE TABLE live_error_rate;
```

## Dropping a Live View

```sql
DROP TABLE IF EXISTS live_error_rate;
```

## Limitations

- Live views are experimental and have been marked as deprecated in recent ClickHouse versions; they may be removed in the future.
- `WATCH` is a ClickHouse-specific streaming protocol - not all client libraries support it.
- Live views only fire updates on INSERT into source tables. DDL changes or updates via mutations do not trigger notifications unless `REFRESH` is also set.
- Live views cannot be created over distributed tables in all configurations.
- For production streaming pipelines, materialized views with `AggregatingMergeTree` are generally more robust and widely supported.

## Summary

Live views enable push-based result streaming in ClickHouse by re-executing a SELECT every time source data changes and delivering updated results to `WATCH` subscribers. They are well-suited for real-time dashboards and alerting with low implementation overhead. Enable `allow_experimental_live_view`, optionally combine `TIMEOUT` and `REFRESH` parameters for expiry and polling behavior, and be aware of their experimental status before using them in critical production systems.
