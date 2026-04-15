# How to Use sparkBar() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, SparkBar, Visualization

Description: Render inline ASCII bar charts inside ClickHouse query results using the sparkBar() aggregate function with configurable width and value range.

---

ClickHouse's `sparkBar()` function lets you produce a compact, ASCII-style bar chart directly inside a result set - no external tool required. Each character in the returned string represents a relative magnitude, making it possible to eyeball trends and distributions without leaving your SQL client.

## Syntax

```sql
sparkBar(buckets[, min_x, max_x])(x, y)
```

- `buckets` - number of segments (characters) in the output string. Must be between 2 and 1024.
- `min_x` / `max_x` (optional) - the expected range for x-axis values; values outside this range are ignored. If omitted, the function uses the observed minimum and maximum of `x`.
- `x` - the position along the horizontal axis (often a timestamp or sequential integer).
- `y` - the magnitude to visualize.

The function is an aggregate: it groups incoming `(x, y)` pairs into `buckets` segments and fills each segment with a Unicode block character proportional to the maximum `y` seen in that bucket.

## Basic Example

```sql
SELECT sparkBar(10, 1, 10)(number + 1, number + 1) AS bar
FROM numbers(10);
```

```text
bar
----------
▁▂▃▃▄▅▅▆▇█
```

## Visualizing Time-Series Data

Create a table of hourly request counts and render a 24-character sparkline per day:

```sql
CREATE TABLE requests
(
    ts        DateTime,
    status    UInt16,
    duration  UInt32
)
ENGINE = MergeTree()
ORDER BY ts;

INSERT INTO requests
SELECT
    toDateTime('2024-01-15 00:00:00') + (number * 3600) AS ts,
    200                                                  AS status,
    50 + (rand() % 200)                                  AS duration
FROM numbers(24);
```

```sql
SELECT
    toDate(ts)                                    AS day,
    sparkBar(24, 0, 23)(toHour(ts), duration)      AS latency_sparkline
FROM requests
GROUP BY day
ORDER BY day;
```

```text
day        | latency_sparkline
-----------|-------------------------
2024-01-15 | ▃▅▇▂▆▁▄▆█▃▅▂▇▄▁▆▃▅▂▄▇▁▅▃
```

Each character position corresponds to one hour of the day, and taller bars represent higher latency.

## Controlling Width and Range

The `min_x`/`max_x` parameters set the x-axis window. Values outside this range are ignored, which lets you zoom in on a subset of the data. Adjusting `buckets` controls the resolution:

```sql
-- Zoom into business hours (8-20), one bucket per hour
SELECT sparkBar(12, 8, 20)(toHour(ts), duration) AS bar
FROM requests
GROUP BY toDate(ts);

-- Full day condensed into 5 buckets for a quick overview
SELECT sparkBar(5, 0, 23)(toHour(ts), duration) AS bar
FROM requests
GROUP BY toDate(ts);
```

## Comparing Multiple Metrics Side-by-Side

```sql
SELECT
    toDate(ts)                                        AS day,
    sparkBar(12, 0, 23)(toHour(ts), duration)           AS latency,
    sparkBar(12, 0, 23)(toHour(ts), status = 200)     AS success_rate
FROM requests
GROUP BY day
ORDER BY day;
```

This places a latency sparkline and a success-rate sparkline in adjacent columns, enabling a quick visual correlation check.

## Combining sparkBar() with Other Aggregates

```sql
SELECT
    toDate(ts)                                      AS day,
    count()                                         AS total_requests,
    round(avg(duration), 1)                         AS avg_ms,
    sparkBar(24, 0, 23)(toHour(ts), duration)        AS hourly_latency
FROM requests
GROUP BY day
ORDER BY day;
```

## Summary

`sparkBar(buckets[, min_x, max_x])(x, y)` renders an inline ASCII bar chart directly in query output, making time-series and distribution data immediately readable in any SQL terminal. Choose `buckets` to match the number of x-axis segments you need and set `min_x`/`max_x` to the expected x-axis range (or omit them to auto-detect). Pair it with standard aggregates like `avg()` or `count()` in the same `SELECT` for quick at-a-glance dashboards.
