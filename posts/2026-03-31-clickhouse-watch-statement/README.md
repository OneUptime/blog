# How to Use WATCH Statement in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Watch, Live View, Real-Time

Description: Learn how to stream live query results in ClickHouse using the WATCH statement with Live Views, including LIMIT, cancellation, and real-time monitoring use cases.

---

ClickHouse Live Views combined with the WATCH statement enable real-time streaming of query results. When the underlying data changes, ClickHouse re-executes the Live View query and pushes the updated results to connected WATCH clients. This makes WATCH a lightweight alternative to polling for dashboards, alerting pipelines, and operational monitoring. This post covers the full WATCH syntax, LIMIT behavior, cancellation, and practical use cases.

## Creating a Live View

WATCH requires a Live View to exist. A Live View is a named query that ClickHouse tracks for changes.

```sql
CREATE LIVE VIEW analytics.events_live AS
SELECT
    event_type,
    count()  AS event_count,
    max(created_at) AS last_seen
FROM analytics.events
GROUP BY event_type;
```

Live Views require the `allow_experimental_live_view = 1` setting (available as an experimental feature since ClickHouse 19.14):

```sql
SET allow_experimental_live_view = 1;

CREATE LIVE VIEW analytics.events_live AS
SELECT count() AS total_events FROM analytics.events;
```

## WATCH Syntax

```sql
WATCH live_view_name;
```

Example:

```sql
WATCH analytics.events_live;
```

ClickHouse sends the current query result immediately, then sends an updated result every time new data is inserted into the source table. Each result row is accompanied by a `_version` column indicating the refresh cycle.

## WATCH with LIMIT

To stop after receiving a fixed number of result updates, use LIMIT:

```sql
WATCH analytics.events_live LIMIT 10;
```

The connection closes automatically after 10 updates have been delivered. Without LIMIT, WATCH runs indefinitely until cancelled.

## WATCH EVENTS

To receive only notification events - without the full result payload - use WATCH EVENTS. This is useful when you want to trigger client-side logic on any change but do not need to transfer large result sets:

```sql
WATCH analytics.events_live EVENTS;
```

Each notification contains the `_version` number. The client can then issue a regular SELECT when it needs the full data.

## Streaming Results from the CLI

```bash
clickhouse-client \
  --query "WATCH analytics.events_live" \
  --allow_experimental_live_view=1
```

Each time new data arrives in `analytics.events`, the Live View re-evaluates and the CLI prints the updated rows. Press Ctrl+C to cancel.

```bash
# Limit to 5 updates and exit
clickhouse-client \
  --query "WATCH analytics.events_live LIMIT 5" \
  --allow_experimental_live_view=1
```

## Cancelling a WATCH

From a client perspective, cancel by closing the connection (Ctrl+C in the CLI) or by calling `KILL QUERY`:

```sql
-- Find the running WATCH query
SELECT query_id, query, elapsed
FROM system.processes
WHERE query LIKE '%WATCH%';

-- Cancel it
KILL QUERY WHERE query_id = 'abc123';
```

## Real-Time Monitoring Use Case

```sql
SET allow_experimental_live_view = 1;

-- Live error rate view
CREATE LIVE VIEW analytics.error_rate_live AS
SELECT
    toStartOfMinute(created_at) AS minute,
    countIf(event_type = 'error') AS error_count,
    count()                       AS total_count,
    round(100.0 * countIf(event_type = 'error') / count(), 2) AS error_pct
FROM analytics.events
WHERE created_at >= now() - INTERVAL 5 MINUTE
GROUP BY minute
ORDER BY minute DESC;

-- Watch for changes, auto-stop after 60 updates
WATCH analytics.error_rate_live LIMIT 60;
```

## Practical Example - Live Event Counter

```sql
SET allow_experimental_live_view = 1;

-- Create a simple counter Live View
CREATE LIVE VIEW analytics.live_event_count AS
SELECT count() AS total
FROM analytics.events
WHERE created_at >= today();

-- Open a terminal and start watching
WATCH analytics.live_event_count;
```

In a separate session, insert new data:

```sql
INSERT INTO analytics.events (event_id, event_type, user_id, created_at)
VALUES (generateUUIDv4(), 'click', 12345, now());
```

The WATCH client immediately receives an updated row showing the new count.

## Dropping a Live View

```sql
DROP VIEW IF EXISTS analytics.events_live;
DROP VIEW IF EXISTS analytics.error_rate_live;
DROP VIEW IF EXISTS analytics.live_event_count;
```

## Summary

The WATCH statement in ClickHouse streams live query results from a Live View, pushing updates to connected clients whenever the underlying data changes. Use LIMIT to bound the number of updates received, WATCH EVENTS for lightweight change notifications, and KILL QUERY to terminate a running watch from another session. WATCH is well suited for real-time dashboards and alerting pipelines where polling would add unnecessary latency and load.
