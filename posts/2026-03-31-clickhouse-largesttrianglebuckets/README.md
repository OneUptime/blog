# How to Use largestTriangleThreeBuckets() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Downsampling, Visualization

Description: Downsample time-series data for charting using largestTriangleThreeBuckets() in ClickHouse, which preserves visual shape by applying the LTTB algorithm.

---

Rendering a line chart from millions of data points is slow and provides no visual benefit beyond rendering a few thousand. Naive downsampling (take every N-th point) can miss sharp spikes and troughs, distorting the perceived shape of the data. ClickHouse's `largestTriangleThreeBuckets(N)(x, y)` implements the Largest-Triangle-Three-Buckets (LTTB) algorithm, which selects N representative points that preserve the visual appearance of the original series.

## Syntax

```sql
largestTriangleThreeBuckets(N)(x, y)
```

- `N` - target number of output points.
- `x` - the x-axis column (typically a timestamp or sequential integer).
- `y` - the y-axis column (the metric value).

Returns `Array(Tuple(Float64, Float64))` - an array of N (x, y) pairs selected to best preserve the visual shape of the series.

## How LTTB Works

LTTB divides the data into N-2 equal-width buckets (keeping the first and last points fixed). For each middle bucket it selects the point that forms the largest triangle with the effective point from the preceding bucket and the average of the next bucket. This greedy selection preserves local extrema - peaks and troughs - better than uniform subsampling.

## Basic Example

```sql
SELECT largestTriangleThreeBuckets(5)(number, sin(number / 10.0)) AS downsampled
FROM numbers(100);
```

```text
downsampled
[(0,0),(24,0.6755),(49,-0.9825),(74,0.8987),(99,-0.4575)]
```

Five representative points from 100, chosen to maintain the sine wave shape.

## Time-Series Setup

```sql
CREATE TABLE metrics
(
    metric_name String,
    ts          DateTime,
    value       Float64
)
ENGINE = MergeTree()
ORDER BY (metric_name, ts);

INSERT INTO metrics
SELECT
    'cpu_pct'                                             AS metric_name,
    toDateTime('2024-01-01 00:00:00') + (number * 60)    AS ts,
    20 + 30 * sin(number / 60.0) + (rand() % 10)         AS value
FROM numbers(1440);  -- 24 hours of per-minute data
```

## Downsample to 200 Points for Charting

```sql
SELECT
    metric_name,
    largestTriangleThreeBuckets(200)(toUnixTimestamp(ts), value) AS chart_data
FROM metrics
WHERE metric_name = 'cpu_pct'
GROUP BY metric_name;
```

The result is a single array of 200 `(unix_timestamp, value)` tuples ready for a charting library.

## Flatten to Rows for JSON Output

```sql
SELECT
    metric_name,
    pt.1                                    AS ts_unix,
    toDateTime(toInt64(pt.1))               AS ts,
    pt.2                                    AS value
FROM (
    SELECT
        metric_name,
        largestTriangleThreeBuckets(200)(toUnixTimestamp(ts), value) AS pts
    FROM metrics
    GROUP BY metric_name
)
ARRAY JOIN pts AS pt
ORDER BY metric_name, ts_unix;
```

This produces one row per selected point, which maps naturally to a JSON array for REST APIs.

## Multi-Series Downsampling

```sql
INSERT INTO metrics
SELECT
    'mem_pct'                                             AS metric_name,
    toDateTime('2024-01-01 00:00:00') + (number * 60)    AS ts,
    50 + 20 * cos(number / 80.0) + (rand() % 5)          AS value
FROM numbers(1440);
```

```sql
SELECT
    metric_name,
    largestTriangleThreeBuckets(100)(toUnixTimestamp(ts), value) AS chart_pts
FROM metrics
GROUP BY metric_name
ORDER BY metric_name;
```

One downsampled series per row.

## Comparing LTTB vs Uniform Subsampling

```sql
-- Uniform subsampling: every 7th point from 1440 -> ~206 points
SELECT
    ts,
    value
FROM metrics
WHERE metric_name = 'cpu_pct'
  AND (toUnixTimestamp(ts) % 420) = 0
ORDER BY ts;

-- LTTB: 200 visually representative points
SELECT
    pt.1 AS ts_unix,
    pt.2 AS value
FROM (
    SELECT largestTriangleThreeBuckets(200)(toUnixTimestamp(ts), value) AS pts
    FROM metrics
    WHERE metric_name = 'cpu_pct'
)
ARRAY JOIN pts AS pt
ORDER BY ts_unix;
```

LTTB is much more likely to include the actual peak and trough of the series because it maximizes triangle area in each bucket; uniform subsampling may skip them entirely if they fall between sampled intervals.

## Choosing N

- For interactive dashboards: 200-500 points gives good resolution on most screen widths.
- For sparklines: 50-100 points is sufficient.
- N should not exceed the number of input rows; if it does, all points are returned unchanged.

## Summary

`largestTriangleThreeBuckets(N)(x, y)` applies the LTTB algorithm to select N visually representative points from a time series, preserving peaks and troughs that naive uniform subsampling would discard. It returns an array of `(x, y)` tuples that you can flatten with `ARRAY JOIN` for row-based output or pass directly to a front-end charting library. Use it whenever you need to render large time series datasets without sacrificing visual fidelity.
