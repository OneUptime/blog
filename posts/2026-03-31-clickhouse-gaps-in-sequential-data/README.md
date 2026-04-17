# How to Find Gaps in Sequential Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Gap Detection, Window Function, Sequence Analysis, Analytics

Description: Learn how to detect gaps in sequential IDs or time series data in ClickHouse using window functions and neighbor functions.

---

Gaps in sequential data - missing IDs, skipped timestamps, or interrupted sequences - indicate data loss, failed inserts, or processing errors. ClickHouse provides efficient tools to detect them.

## Finding Gaps in Sequential IDs

Use `neighbor` to compare each row with the next:

```sql
SELECT
    id,
    neighbor(id, 1) AS next_id,
    next_id - id - 1 AS gap_size
FROM events
HAVING gap_size > 0
ORDER BY id;
```

`neighbor(id, 1)` looks ahead one row. If `next_id - id > 1`, there are missing IDs in between.

## Using Window Functions for Gap Detection

```sql
SELECT
    id AS gap_start,
    next_id - 1 AS gap_end,
    next_id - id - 1 AS missing_count
FROM (
    SELECT
        id,
        leadInFrame(id) OVER (ORDER BY id ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_id
    FROM events
)
WHERE next_id - id > 1
ORDER BY gap_start;
```

## Finding Time Gaps in a Series

For time-series data, check for intervals larger than expected:

```sql
SELECT
    ts,
    next_ts,
    dateDiff('minute', ts, next_ts) AS gap_minutes
FROM (
    SELECT
        ts,
        leadInFrame(ts) OVER (ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_ts
    FROM metrics
    WHERE sensor_id = 'sensor_42'
)
WHERE gap_minutes > 5
ORDER BY ts;
```

## Detecting Gaps per Group

Partition by device or user to find per-entity gaps:

```sql
SELECT
    device_id,
    ts AS gap_start,
    next_ts AS gap_end,
    dateDiff('second', ts, next_ts) AS gap_seconds
FROM (
    SELECT
        device_id,
        ts,
        leadInFrame(ts) OVER (PARTITION BY device_id ORDER BY ts ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_ts
    FROM heartbeats
)
WHERE gap_seconds > 60
ORDER BY device_id, gap_start;
```

## Counting Total Missing IDs

```sql
SELECT sum(next_id - id - 1) AS total_missing
FROM (
    SELECT id, leadInFrame(id) OVER (ORDER BY id ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS next_id
    FROM events
)
WHERE next_id - id > 1;
```

## Summary

ClickHouse detects sequential gaps using `neighbor` for simple cases or `leadInFrame` window functions for richer analysis. Partition by entity columns to find per-device or per-user gaps, and use `dateDiff` to measure time gaps in series data.
