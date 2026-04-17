# How to Detect Missing Data in ClickHouse Time-Series Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Time-Series, Missing Data, Gap Detection, Data Quality, Query

Description: Detect gaps and missing data in ClickHouse time-series tables using time spine generation, window functions, and threshold-based gap detection queries.

---

## Why Missing Data Is Hard to Detect

ClickHouse stores only the rows you insert. If a data source stops sending data, ClickHouse doesn't insert a row with zero counts - it just has no rows for that time window. Detecting absence requires generating expected time buckets and comparing against actual data.

## Method 1 - Generate a Time Spine and LEFT JOIN

Create a reference time series using `numbers()` and compare:

```sql
WITH time_spine AS (
    SELECT
        toStartOfMinute(now() - toIntervalMinute(number)) AS minute
    FROM numbers(120)  -- last 120 minutes
)
SELECT
    ts.minute,
    count(e.minute) AS event_count,
    IF(count(e.minute) = 0, 'MISSING', 'OK') AS status
FROM time_spine ts
LEFT JOIN (
    SELECT toStartOfMinute(event_time) AS minute
    FROM events
    WHERE event_time >= now() - INTERVAL 2 HOUR
) e ON ts.minute = e.minute
GROUP BY ts.minute
ORDER BY ts.minute DESC;
```

## Method 2 - Threshold-Based Gap Detection

If you expect at least N events per minute, find underperforming buckets:

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count()                     AS events
FROM events
WHERE event_time >= now() - INTERVAL 2 HOUR
GROUP BY minute
HAVING events < 10  -- flag buckets with fewer than 10 events
ORDER BY minute DESC;
```

## Method 3 - Lead/Lag Gap Detection

Find time gaps between consecutive events using the `lagInFrame` window function:

```sql
SELECT event_time, prev_time, gap_seconds
FROM (
    SELECT
        event_time,
        lagInFrame(event_time) OVER (
            ORDER BY event_time
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS prev_time,
        dateDiff('second', prev_time, event_time) AS gap_seconds
    FROM events
    WHERE event_time >= now() - INTERVAL 1 HOUR
)
WHERE prev_time IS NOT NULL AND gap_seconds > 300  -- gaps larger than 5 minutes
ORDER BY event_time;
```

## Method 4 - Expected vs Actual by Source

For multi-source pipelines, check each source:

```sql
SELECT
    source_id,
    toStartOfHour(event_time) AS hour,
    count()                   AS events
FROM events
WHERE event_time >= today()
GROUP BY source_id, hour
HAVING events < 100  -- each source should send at least 100 events/hour
ORDER BY hour DESC, source_id;
```

## Building a Gap Alert Table

Schedule gap detection and store results:

```sql
INSERT INTO data_gaps
WITH time_spine AS (
    SELECT toStartOfMinute(now() - toIntervalMinute(number)) AS minute
    FROM numbers(30)
)
SELECT
    now()           AS check_time,
    ts.minute       AS minute,
    count(e.minute) AS events
FROM time_spine ts
LEFT JOIN (
    SELECT toStartOfMinute(event_time) AS minute
    FROM events
    WHERE event_time >= now() - INTERVAL 30 MINUTE
) e ON ts.minute = e.minute
GROUP BY ts.minute
HAVING events = 0;
```

Alert when `data_gaps` has rows with `check_time >= now() - INTERVAL 5 MINUTE`.

## Summary

Detect missing data in ClickHouse time-series tables by generating expected time buckets with `numbers()` and LEFT JOIN against actual data, using HAVING clauses to surface underperforming windows, and comparing consecutive event timestamps with the `lagInFrame` window function to find gaps. Store gap detection results in a monitoring table and alert on persistent gaps.
