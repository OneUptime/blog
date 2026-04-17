# How to Create a Window View in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, Window View, Streaming

Description: Learn how to create Window Views in ClickHouse for tumbling, hopping, and sliding window aggregations over streaming data with WATERMARK support.

---

Window Views extend ClickHouse's streaming capabilities by adding time-window semantics directly into the SQL DDL layer. Where materialized views trigger on every insert block, window views aggregate data into fixed or sliding time windows and emit results only when a window closes - making them a natural fit for stream processing use cases like per-minute metrics, session analysis, and windowed anomaly detection. Window views are experimental and require an explicit feature flag.

## Enabling Window Views

```sql
SET allow_experimental_window_view = 1;
```

For permanent enablement, add to `users.xml` under the relevant profile:

```xml
<allow_experimental_window_view>1</allow_experimental_window_view>
```

## Basic CREATE WINDOW VIEW Syntax

```sql
CREATE WINDOW VIEW [IF NOT EXISTS] [db.]view_name
[TO [db.]dest_table]
[WATERMARK = STRICTLY_ASCENDING | ASCENDING | INTERVAL max_delay]
[ALLOWED_LATENESS = INTERVAL value_unit]
AS SELECT ...
GROUP BY tumble(time_col, INTERVAL size) | hop(time_col, hop_interval, window_interval);
```

## Tumbling Windows

A tumbling window partitions time into non-overlapping fixed-size intervals. Each event belongs to exactly one window.

```sql
SET allow_experimental_window_view = 1;

-- Destination table
CREATE TABLE per_minute_counts
(
    window_start DateTime,
    window_end   DateTime,
    event_type   LowCardinality(String),
    cnt          UInt64
)
ENGINE = MergeTree()
ORDER BY (window_start, event_type);

-- Tumbling window view: 1-minute non-overlapping windows
CREATE WINDOW VIEW per_minute_counts_wv
TO per_minute_counts
WATERMARK = ASCENDING
AS
SELECT
    tumbleStart(wid)    AS window_start,
    tumbleEnd(wid)      AS window_end,
    event_type,
    count()             AS cnt
FROM raw_events
GROUP BY tumble(event_time, INTERVAL '1' MINUTE) AS wid, event_type;
```

Results are emitted into `per_minute_counts` when each 1-minute window closes.

## Hopping Windows

A hopping (sliding) window produces overlapping windows. Each window has a fixed size, and a new window starts every `slide` interval.

```sql
-- Destination table for 5-minute windows sliding every 1 minute
CREATE TABLE rolling_5min_counts
(
    window_start DateTime,
    window_end   DateTime,
    service      LowCardinality(String),
    error_count  UInt64
)
ENGINE = MergeTree()
ORDER BY (window_start, service);

-- Hopping window: 5-minute window, 1-minute slide
CREATE WINDOW VIEW rolling_5min_wv
TO rolling_5min_counts
WATERMARK = ASCENDING
AS
SELECT
    hopStart(wid)    AS window_start,
    hopEnd(wid)      AS window_end,
    service,
    countIf(level = 'ERROR') AS error_count
FROM app_logs
GROUP BY hop(event_time, INTERVAL '1' MINUTE, INTERVAL '5' MINUTE) AS wid,
         service;
```

With a 1-minute slide, a new window opens every minute and covers the previous 5 minutes, producing overlapping result rows.

## Watermarks - Handling Late Data

A watermark tells ClickHouse how much out-of-order lateness to tolerate before closing a window.

### ASCENDING Watermark

The simplest watermark assumes events arrive in order. The watermark advances with the maximum event timestamp seen so far.

```sql
CREATE WINDOW VIEW ordered_wv
TO ordered_counts
WATERMARK = ASCENDING
AS
SELECT
    tumbleStart(wid) AS window_start,
    count()          AS cnt
FROM events
GROUP BY tumble(event_time, INTERVAL '1' MINUTE) AS wid;
```

### BOUNDED Watermark

Tolerates late arrivals up to a specified delay before closing windows. The BOUNDED strategy is expressed by assigning an INTERVAL directly to `WATERMARK`:

```sql
CREATE WINDOW VIEW late_tolerant_wv
TO late_counts
WATERMARK = INTERVAL '30' SECOND
AS
SELECT
    tumbleStart(wid) AS window_start,
    count()          AS cnt
FROM events
GROUP BY tumble(event_time, INTERVAL '1' MINUTE) AS wid;
```

ClickHouse will wait up to 30 seconds beyond the window boundary for late events before emitting the final result.

## ALLOWED_LATENESS

`ALLOWED_LATENESS` specifies how long after a window closes ClickHouse will still accept and re-emit corrected results for late-arriving events:

```sql
CREATE WINDOW VIEW tolerant_wv
TO tolerant_counts
WATERMARK = INTERVAL '10' SECOND
ALLOWED_LATENESS = INTERVAL '60' SECOND
AS
SELECT
    tumbleStart(wid) AS window_start,
    event_type,
    count()          AS cnt
FROM raw_events
GROUP BY tumble(event_time, INTERVAL '1' MINUTE) AS wid, event_type;
```

Within the `ALLOWED_LATENESS` period, corrected window results are emitted as additional rows in the destination table.

## Watching a Window View

Like live views, window views support `WATCH` for streaming results to a client:

```sql
WATCH per_minute_counts_wv;
```

Each time a window closes, the client receives the completed window result.

## Inspecting Window Views

```sql
-- List window views
SELECT name, engine
FROM system.tables
WHERE engine = 'WindowView';

-- Show definition
SHOW CREATE TABLE per_minute_counts_wv;
```

## Dropping a Window View

```sql
DROP TABLE IF EXISTS per_minute_counts_wv;
```

## Limitations

- Window views are experimental and the API may change.
- Only tumbling and hopping window types are supported - session windows are not.
- Requires careful watermark tuning to balance latency and correctness for out-of-order data.
- Not supported in distributed (cluster) setups in all versions.

## Summary

Window views bring first-class time-window semantics to ClickHouse's streaming pipeline. Tumbling windows produce non-overlapping fixed-interval aggregations ideal for per-minute or per-hour metrics. Hopping windows produce overlapping aggregations for rolling calculations. Watermarks control how late-arriving data is handled before a window is finalized. While still experimental, window views can replace complex application-side windowing logic for many stream processing workloads.
