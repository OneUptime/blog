# How to Use -Resample Combinator in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Aggregate Function, Resample, Window, Time Series

Description: Learn how to use the -Resample combinator in ClickHouse to aggregate data over equal-width intervals of a key column in a single pass without GROUP BY.

---

## What Is the -Resample Combinator

The `-Resample` combinator applies an aggregate function over fixed-width intervals (buckets) of a numeric or date key column. It returns an array where each element corresponds to one interval.

Syntax:
```sql
aggFunctionResample(start, end, step)(value, key)
```

- `start`: lower bound of the range (inclusive)
- `end`: upper bound of the range (exclusive)
- `step`: interval width
- `value`: the column to aggregate
- `key`: the column defining intervals

## Basic Example

```sql
CREATE TABLE measurements (
    ts DateTime,
    user_id UInt64,
    response_ms UInt32,
    value Float64
) ENGINE = MergeTree()
ORDER BY ts;

-- Without -Resample: requires GROUP BY
SELECT
    intDiv(response_ms, 100) * 100 AS bucket,
    count() AS cnt
FROM measurements
GROUP BY bucket
ORDER BY bucket;

-- With -Resample: returns an array over fixed intervals
SELECT countResample(0, 1000, 100)(response_ms, response_ms) AS counts_per_100ms_bucket
FROM measurements;
-- Returns Array(UInt64): [count in 0-100, count in 100-200, ..., count in 900-1000]
```

## Multiple Aggregations with -Resample

```sql
-- Apply multiple aggregate functions over the same buckets
SELECT
    countResample(0, 2000, 200)(response_ms, response_ms) AS count_per_bucket,
    avgResample(0, 2000, 200)(response_ms, response_ms) AS avg_per_bucket,
    sumResample(0, 2000, 200)(value, response_ms) AS sum_per_bucket,
    maxResample(0, 2000, 200)(value, response_ms) AS max_per_bucket
FROM measurements;
```

## Time Series with -Resample

For time-based intervals, use timestamps in seconds:

```sql
-- Count events per hour for the last 24 hours
SELECT countResample(
    toUnixTimestamp(now() - INTERVAL 24 HOUR),  -- start
    toUnixTimestamp(now()),                       -- end
    3600                                          -- 1 hour intervals
)(ts, toUnixTimestamp(ts)) AS hourly_counts
FROM events;
```

## Using arrayMap with -Resample Output

Since `-Resample` returns an array, combine with `arrayMap` and `arrayEnumerate` to add bucket labels:

```sql
-- Label each bucket with its range
SELECT
    arrayMap(
        (bucket_idx) -> toString((bucket_idx - 1) * 100) || '-' || toString(bucket_idx * 100) || 'ms',
        arrayEnumerate(counts)
    ) AS bucket_labels,
    counts
FROM (
    SELECT countResample(0, 1000, 100)(response_ms, response_ms) AS counts
    FROM measurements
);
```

## Histogram with -Resample

```sql
-- Create a simple histogram of response times
SELECT
    arrayMap(
        (i, cnt) -> tuple(
            (i - 1) * 100 AS bucket_start,
            i * 100 AS bucket_end,
            cnt AS count
        ),
        arrayEnumerate(counts),
        counts
    ) AS histogram
FROM (
    SELECT countResample(0, 2000, 100)(response_ms, response_ms) AS counts
    FROM measurements
);
```

## Practical Example: Latency Distribution Analysis

```sql
CREATE TABLE api_requests (
    ts DateTime DEFAULT now(),
    endpoint LowCardinality(String),
    method LowCardinality(String),
    latency_ms UInt32,
    status_code UInt16
) ENGINE = MergeTree()
ORDER BY (ts, endpoint);

-- Latency distribution per endpoint
SELECT
    endpoint,
    countResample(0, 5000, 250)(latency_ms, latency_ms) AS latency_distribution,
    -- Bucket labels: 0-250ms, 250-500ms, etc.
    arrayMap(i -> concat(
        toString((i-1)*250), '-', toString(i*250), 'ms'
    ), arrayEnumerate(countResample(0, 5000, 250)(latency_ms, latency_ms))) AS bucket_labels
FROM api_requests
WHERE ts >= now() - INTERVAL 1 HOUR
GROUP BY endpoint;
```

## -Resample with Date Key

```sql
-- Daily active users (distinct users per day) over a month using date keys
SELECT
    uniqResample(
        toUInt32(toDate('2024-01-01')),  -- start date as UInt32
        toUInt32(toDate('2024-02-01')),  -- end date
        1                                 -- 1 day intervals
    )(user_id, toUInt32(toDate(ts))) AS daily_active_users
FROM user_events;
```

## Comparison: -Resample vs GROUP BY

| Feature | -Resample | GROUP BY |
|---------|-----------|---------|
| Returns | Array | Multiple rows |
| Empty buckets | Included (zero) | Excluded |
| Single query pass | Yes | Yes |
| Flexible labels | Needs arrayMap | Direct in SELECT |
| Use case | Histograms, fixed bins | General grouping |

The key advantage of `-Resample` over `GROUP BY` is that empty buckets are represented as zero values in the output array, making it ideal for histograms and time series with gaps.

## Summary

The `-Resample` combinator applies aggregate functions over fixed-width numeric intervals in a single query pass, returning an array of results per bucket. It is particularly useful for generating histograms, latency distributions, and time series counts where you want consistent bucket sizes including empty ones. Combine the array output with `arrayMap` and `arrayEnumerate` to add bucket labels or create richer result structures.
