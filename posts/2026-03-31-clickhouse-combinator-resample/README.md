# How to Use the -Resample Aggregate Combinator in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Aggregate Function, Combinator, Time Series, Performance, Array

Description: Learn how the -Resample combinator divides data into fixed-width buckets by a key column and applies aggregation per bucket, returning an array of per-bucket results.

---

The `-Resample` combinator is a compact way to perform fixed-interval bucketed aggregation without writing a `GROUP BY` with a time-rounding function. You specify a start value, an end value, and a step size. ClickHouse divides the range `[start, end)` into `(end - start) / step` buckets and applies the aggregate function to each bucket independently, returning an array of results. This is especially useful for time-series dashboards where you want a fixed number of data points per query, and you want to express the entire operation as a single aggregate function call rather than a subquery or a join with a numbers table.

## Syntax

```text
aggFuncResample(start, end, step)(value_column, key_column)
```

- `start` - inclusive lower bound of the range (same type as `key_column`)
- `end` - exclusive upper bound of the range
- `step` - bucket width
- `value_column` - the column to aggregate
- `key_column` - the column used to assign rows to buckets

The output is an `Array` with `(end - start) / step` elements. Rows where `key_column < start` or `key_column >= end` are excluded. Buckets with no rows get the default value for the aggregate (0 for `sum`, 0 for `count`, etc.).

## Basic Example: countResample on Integer Keys

The simplest illustration uses a numeric key to partition rows into buckets.

```sql
CREATE TABLE scores
(
    student_id  UInt32,
    score       UInt8   -- 0..100
)
ENGINE = MergeTree()
ORDER BY student_id;

INSERT INTO scores VALUES
    (1, 45), (2, 62), (3, 78), (4, 55),
    (5, 90), (6, 33), (7, 71), (8, 88),
    (9, 47), (10, 66), (11, 95), (12, 82);
```

Count how many students fall into each 10-point score bucket from 30 to 100:

```sql
SELECT countResample(30, 100, 10)(score, score) AS count_per_bucket;
```

```text
count_per_bucket
[1, 2, 1, 2, 2, 2, 2]
```

The 7 buckets are: [30,40), [40,50), [50,60), [60,70), [70,80), [80,90), [90,100).

## Using Epoch Seconds for Time-Series Bucketing

`-Resample` works naturally with Unix timestamps. Convert `DateTime` to a `UInt32` epoch, then resample over the numeric range.

```sql
CREATE TABLE http_requests
(
    request_id  UInt64,
    ts          DateTime,
    status_code UInt16,
    duration_ms UInt32
)
ENGINE = MergeTree()
ORDER BY ts;

INSERT INTO http_requests VALUES
    (1,  '2026-03-31 10:00:10', 200, 45),
    (2,  '2026-03-31 10:00:25', 200, 62),
    (3,  '2026-03-31 10:00:50', 500, 1200),
    (4,  '2026-03-31 10:01:05', 200, 38),
    (5,  '2026-03-31 10:01:30', 200, 55),
    (6,  '2026-03-31 10:01:45', 404, 20),
    (7,  '2026-03-31 10:02:10', 200, 41),
    (8,  '2026-03-31 10:02:40', 200, 90),
    (9,  '2026-03-31 10:03:05', 500, 980),
    (10, '2026-03-31 10:03:50', 200, 33);
```

Count requests per 60-second bucket over a 4-minute window starting at 10:00:00:

```sql
SELECT
    countResample(
        toUnixTimestamp('2026-03-31 10:00:00'),
        toUnixTimestamp('2026-03-31 10:04:00'),
        60
    )(toUnixTimestamp(ts), toUnixTimestamp(ts)) AS requests_per_minute
FROM http_requests;
```

```text
requests_per_minute
[3, 3, 2, 2]
```

Minute 0 (10:00-10:01): 3 requests. Minute 1 (10:01-10:02): 3 requests. Minute 2 (10:02-10:03): 2 requests. Minute 3 (10:03-10:04): 2 requests.

## sumResample() for Aggregated Metrics

Sum the total request duration per minute to see which minutes had the heaviest load:

```sql
SELECT
    sumResample(
        toUnixTimestamp('2026-03-31 10:00:00'),
        toUnixTimestamp('2026-03-31 10:04:00'),
        60
    )(duration_ms, toUnixTimestamp(ts)) AS total_duration_per_minute
FROM http_requests;
```

```text
total_duration_per_minute
[1307, 113, 131, 1013]
```

Minutes 0 and 3 had high total duration due to the 500-status requests with long durations.

## avgResample() for Per-Bucket Averages

Average request duration per minute:

```sql
SELECT
    avgResample(
        toUnixTimestamp('2026-03-31 10:00:00'),
        toUnixTimestamp('2026-03-31 10:04:00'),
        60
    )(duration_ms, toUnixTimestamp(ts)) AS avg_duration_per_minute
FROM http_requests;
```

```text
avg_duration_per_minute
[435.666, 37.666, 65.5, 506.5]
```

## Grouping -Resample with GROUP BY

You can combine `-Resample` with `GROUP BY` to produce per-group time series arrays in one query.

```sql
SELECT
    status_code,
    countResample(
        toUnixTimestamp('2026-03-31 10:00:00'),
        toUnixTimestamp('2026-03-31 10:04:00'),
        60
    )(toUnixTimestamp(ts), toUnixTimestamp(ts)) AS requests_per_minute
FROM http_requests
GROUP BY status_code
ORDER BY status_code;
```

```text
status_code  requests_per_minute
200          [2, 2, 2, 1]
404          [0, 1, 0, 0]
500          [1, 0, 0, 1]
```

Each status code gets its own array of per-minute request counts.

## Post-Processing the Result Array

Because the result is a regular `Array`, you can apply array functions for further analysis:

```sql
SELECT
    -- Find the minute index with the most requests
    indexOf(
        countResample(
            toUnixTimestamp('2026-03-31 10:00:00'),
            toUnixTimestamp('2026-03-31 10:04:00'),
            60
        )(toUnixTimestamp(ts), toUnixTimestamp(ts)),
        -- The max value in the bucket array
        arrayMax(
            countResample(
                toUnixTimestamp('2026-03-31 10:00:00'),
                toUnixTimestamp('2026-03-31 10:04:00'),
                60
            )(toUnixTimestamp(ts), toUnixTimestamp(ts))
        )
    ) AS peak_minute_index
FROM http_requests;
```

## Generating Bucket Labels with arrayMap

To pair each bucket value with its start timestamp, generate the bucket boundaries using `range()` and `arrayMap()`:

```sql
SELECT
    arrayMap(
        i -> toDateTime(toUnixTimestamp('2026-03-31 10:00:00') + (i - 1) * 60),
        range(1, 5)
    ) AS bucket_starts,
    countResample(
        toUnixTimestamp('2026-03-31 10:00:00'),
        toUnixTimestamp('2026-03-31 10:04:00'),
        60
    )(toUnixTimestamp(ts), toUnixTimestamp(ts)) AS counts
FROM http_requests;
```

```text
bucket_starts                                                                                    counts
['2026-03-31 10:00:00','2026-03-31 10:01:00','2026-03-31 10:02:00','2026-03-31 10:03:00']  [3, 3, 2, 2]
```

## Summary

The `-Resample` combinator provides fixed-interval bucketed aggregation in a single function call. Specify the range with `(start, end, step)` and the function returns an array with one element per bucket. Empty buckets receive the aggregate function's default value (0 for count and sum). Use epoch seconds for time-based bucketing, combine with `GROUP BY` to get per-group time series, and process the resulting arrays with ClickHouse array functions for peak detection, labeling, or further computation. It is a concise alternative to `GROUP BY toStartOfInterval(...)` when you want the result as an array rather than multiple rows.
