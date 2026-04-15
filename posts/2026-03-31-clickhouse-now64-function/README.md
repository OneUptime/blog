# How to Use now64() for Sub-Second Precision in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, DateTime64, High Precision, Performance

Description: Learn how now64() returns the current time as DateTime64 with configurable sub-second precision up to nanoseconds, enabling accurate latency and event timestamping.

---

`now()` in ClickHouse returns a `DateTime` with second-level precision - sufficient for many use cases, but not for high-frequency event streams, latency measurements, or applications that need to distinguish events separated by less than a second. `now64(precision)` addresses this by returning a `DateTime64` value with up to 9 digits of sub-second precision (nanoseconds). The default precision when called without arguments is 3 (milliseconds). Sub-second timestamps are essential for request tracing, performance benchmarking, and any workload where thousands of events can occur within the same second.

## Understanding DateTime64 Precision

The precision argument to `now64` controls how many decimal places appear after the seconds component.

```sql
-- Compare precision levels side by side
SELECT
    now()          AS second_precision,     -- DateTime
    now64()        AS millisecond_default,  -- DateTime64(3) - milliseconds
    now64(3)       AS milliseconds,         -- DateTime64(3)
    now64(6)       AS microseconds,         -- DateTime64(6)
    now64(9)       AS nanoseconds;          -- DateTime64(9)
```

```text
second_precision        millisecond_default             milliseconds                    microseconds                        nanoseconds
2024-06-15 14:32:07     2024-06-15 14:32:07.412         2024-06-15 14:32:07.412         2024-06-15 14:32:07.412831          2024-06-15 14:32:07.412831000
```

Note that actual nanosecond precision depends on the OS clock source. Most modern Linux distributions with high-resolution timer support provide nanosecond-level clock resolution.

## Storing Sub-Second Timestamps

To store sub-second timestamps, declare the column as `DateTime64` with the desired precision.

```sql
CREATE TABLE api_requests
(
    request_id    UUID,
    endpoint      String,
    method        LowCardinality(String),
    response_code UInt16,
    -- Store millisecond-precision timestamps
    received_at   DateTime64(3, 'UTC'),
    responded_at  DateTime64(3, 'UTC')
)
ENGINE = MergeTree()
ORDER BY received_at;
```

```sql
-- Insert with now64() for both timestamps
INSERT INTO api_requests (request_id, endpoint, method, response_code, received_at, responded_at)
VALUES (
    generateUUIDv4(),
    '/api/v1/users',
    'GET',
    200,
    now64(3),
    now64(3)
);
```

## Computing Sub-Second Latency

With millisecond-precision timestamps, you can compute response latencies accurately.

```sql
-- Compute response latency in milliseconds for each request
SELECT
    request_id,
    endpoint,
    response_code,
    -- dateDiff works on DateTime64 with 'millisecond' unit
    dateDiff('millisecond', received_at, responded_at) AS latency_ms
FROM api_requests
WHERE toDate(received_at) = today()
ORDER BY latency_ms DESC
LIMIT 20;
```

## Percentile Latency Distribution

Millisecond-precision timestamps enable accurate P50, P95, and P99 latency percentile calculations.

```sql
-- Latency percentiles by endpoint for the last hour
SELECT
    endpoint,
    count() AS request_count,
    quantile(0.50)(dateDiff('millisecond', received_at, responded_at)) AS p50_ms,
    quantile(0.95)(dateDiff('millisecond', received_at, responded_at)) AS p95_ms,
    quantile(0.99)(dateDiff('millisecond', received_at, responded_at)) AS p99_ms,
    max(dateDiff('millisecond', received_at, responded_at))             AS max_ms
FROM api_requests
WHERE received_at >= now64() - INTERVAL 1 HOUR
GROUP BY endpoint
ORDER BY p95_ms DESC;
```

## now64 in INSERT Statements for Event Streams

For high-throughput event ingestion, `now64()` captures arrival time with sub-second resolution that `now()` would collapse to the same second for all events in a batch.

```sql
-- Timestamp each event row with millisecond precision during batch INSERT
INSERT INTO events (event_id, user_id, event_type, occurred_at)
SELECT
    event_id,
    user_id,
    event_type,
    now64(3) AS occurred_at  -- all rows in this batch get the same ms-precision timestamp
FROM incoming_events_buffer;
```

## Converting now64 to now

If you need to truncate to second precision for a comparison with a `DateTime` column, use `toDateTime`.

```sql
-- Compare now64 with a second-precision column
SELECT
    request_id,
    received_at,
    toDateTime(received_at) AS received_at_seconds,
    toDateTime(now64())     AS now_seconds
FROM api_requests
WHERE toDateTime(received_at) = toDateTime(now64())
LIMIT 10;
```

## Generating Sub-Second Event Sequences for Testing

`now64` combined with `numbers()` and interval arithmetic can generate test data with sub-second spacing.

```sql
-- Generate 10 synthetic events spaced 100 milliseconds apart
SELECT
    number AS event_seq,
    now64(3) + toIntervalMillisecond(number * 100) AS event_time,
    'synthetic' AS event_type
FROM numbers(10);
```

## toUnixTimestamp64 for Numeric Timestamp Arithmetic

For arithmetic on sub-second timestamps, convert to an integer with `toUnixTimestamp64`.

```sql
-- Compute latency using integer arithmetic on millisecond timestamps
SELECT
    request_id,
    toUnixTimestamp64Milli(responded_at) - toUnixTimestamp64Milli(received_at) AS latency_ms
FROM api_requests
WHERE toDate(received_at) = today()
ORDER BY latency_ms DESC
LIMIT 10;
```

## Summary

`now64(precision)` returns the current `DateTime64` with up to nanosecond precision. The default precision of 3 gives millisecond resolution, which is suitable for most latency and event timestamping workloads. Store sub-second timestamps in `DateTime64(3, 'UTC')` or `DateTime64(6, 'UTC')` columns. Use `dateDiff('millisecond', ...)` or `toUnixTimestamp64Milli` for latency arithmetic. Use `now64()` over `now()` whenever events can arrive faster than once per second, as second-level precision collapses all same-second arrivals into a single indistinguishable timestamp.
