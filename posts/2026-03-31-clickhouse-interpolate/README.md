# How to Use INTERPOLATE in ClickHouse for Missing Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, INTERPOLATE, Time Series, Missing Data

Description: Fill gaps in ordered ClickHouse result sets using ORDER BY WITH FILL ... INTERPOLATE to carry forward or compute intermediate values for missing rows.

---

Time-series queries frequently return sparse results - rows exist only where events occurred, leaving gaps for minutes, hours, or days with no data. ClickHouse's `ORDER BY ... WITH FILL` generates missing rows automatically, and the `INTERPOLATE` clause attached to it lets you control what value is placed in non-key columns for those generated rows: carry the last value forward, compute a linear interpolation, or apply any scalar expression.

## Prerequisites - ORDER BY WITH FILL

`INTERPOLATE` is always used together with `WITH FILL`. `WITH FILL` defines the range and step for synthetic row generation:

```sql
ORDER BY timestamp WITH FILL
    FROM toDateTime('2025-01-01 00:00:00')
    TO   toDateTime('2025-01-01 06:00:00')
    STEP INTERVAL 1 HOUR
INTERPOLATE (col1, col2, ...)
```

- `FROM` / `TO` - the inclusive start and exclusive end of the filled range.
- `STEP` - the increment between generated rows (numeric or `INTERVAL`).
- `INTERPOLATE (...)` - the columns (and optional expressions) to fill in.

## Basic Carry-Forward Interpolation

Without an expression, `INTERPOLATE` simply carries the last observed value forward into generated rows:

```sql
CREATE TABLE hourly_metrics
(
    ts      DateTime,
    host    String,
    cpu_pct Float64
)
ENGINE = MergeTree()
ORDER BY (host, ts);

INSERT INTO hourly_metrics VALUES
    ('2025-01-01 00:00:00', 'web-1', 12.5),
    ('2025-01-01 02:00:00', 'web-1', 18.0),
    ('2025-01-01 05:00:00', 'web-1', 9.3);

SELECT
    ts,
    host,
    cpu_pct
FROM hourly_metrics
WHERE host = 'web-1'
ORDER BY ts WITH FILL
    FROM toDateTime('2025-01-01 00:00:00')
    TO   toDateTime('2025-01-01 06:00:00')
    STEP INTERVAL 1 HOUR
INTERPOLATE (host, cpu_pct);
```

```text
ts                  | host  | cpu_pct
--------------------|-------|--------
2025-01-01 00:00:00 | web-1 | 12.5
2025-01-01 01:00:00 | web-1 | 12.5   <- generated, carried forward
2025-01-01 02:00:00 | web-1 | 18.0
2025-01-01 03:00:00 | web-1 | 18.0   <- generated, carried forward
2025-01-01 04:00:00 | web-1 | 18.0   <- generated, carried forward
2025-01-01 05:00:00 | web-1 | 9.3
```

## Expression-Based Interpolation

Provide an expression after the column name to compute a custom value for each generated row. The expression can reference the column itself (its value from the previous real row) and other columns:

```sql
-- Linear interpolation between two known data points
SELECT
    ts,
    bytes_sent
FROM network_stats
ORDER BY ts WITH FILL
    FROM toDateTime('2025-06-01 00:00:00')
    TO   toDateTime('2025-06-01 12:00:00')
    STEP INTERVAL 1 HOUR
INTERPOLATE (bytes_sent AS bytes_sent + 1000);
-- Each gap row adds 1000 to the previous value (simple linear ramp)
```

A more realistic linear interpolation uses a pre-computed rate stored alongside the data:

```sql
SELECT
    ts,
    value,
    rate
FROM sensor_readings
ORDER BY ts WITH FILL
    FROM toDateTime('2025-01-01 00:00:00')
    TO   toDateTime('2025-01-02 00:00:00')
    STEP INTERVAL 1 HOUR
INTERPOLATE (
    value AS value + rate,
    rate  AS rate
);
```

## Filling Gaps in a Time-Series Dashboard Query

A typical use case is building a chart from aggregated data that may have empty buckets:

```sql
SELECT
    toStartOfHour(ts)  AS hour,
    avg(response_ms)   AS avg_response
FROM http_logs
WHERE ts >= '2025-01-01' AND ts < '2025-01-02'
GROUP BY hour
ORDER BY hour WITH FILL
    FROM toDateTime('2025-01-01 00:00:00')
    TO   toDateTime('2025-01-02 00:00:00')
    STEP INTERVAL 1 HOUR
INTERPOLATE (avg_response);
```

Hours with no requests will appear with the `avg_response` value carried forward from the last non-empty hour.

## Filling Numeric Sequences

`WITH FILL` is not limited to dates. Any numeric column works too:

```sql
SELECT
    rank,
    score
FROM leaderboard
ORDER BY rank WITH FILL FROM 1 TO 11 STEP 1
INTERPOLATE (score);
```

This ensures ranks 1 through 10 all appear, filling any missing ranks with the previous score.

## Resetting Carry-Forward Between Groups

When your query groups by multiple columns (e.g. one time series per host), list the partition key in a separate `ORDER BY` position so fill resets between groups:

```sql
SELECT
    host,
    toStartOfHour(ts) AS hour,
    avg(cpu_pct)      AS avg_cpu
FROM metrics
GROUP BY host, hour
ORDER BY
    host,
    hour WITH FILL
        FROM toDateTime('2025-01-01 00:00:00')
        TO   toDateTime('2025-01-01 12:00:00')
        STEP INTERVAL 1 HOUR
INTERPOLATE (avg_cpu);
```

## Summary

`INTERPOLATE` pairs with `ORDER BY ... WITH FILL` to fill the non-key columns of synthetic gap-rows. Without an expression it carries the last real value forward; with an expression you can compute incremental or blended values. This is the idiomatic ClickHouse approach to producing continuous time-series outputs from sparse event tables without needing joins to a calendar dimension table.
