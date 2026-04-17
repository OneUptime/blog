# How to Use DateTime and DateTime64 Data Types in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, DateTime, DateTime64, Timezone

Description: Learn how to use DateTime and DateTime64 in ClickHouse, covering second vs sub-second precision, the precision parameter, timezone handling, and examples.

---

Most analytical workloads need more than a date - they need a timestamp. ClickHouse provides two timestamp types: `DateTime` for second-level precision and `DateTime64` for sub-second precision down to nanoseconds. Understanding the difference between them, how timezone handling works, and how to convert and compare timestamps is essential for building time-series schemas and writing correct time-range queries.

## DateTime vs DateTime64

| Type         | Underlying Storage | Precision     | Range                        | Storage |
|--------------|--------------------|---------------|------------------------------|---------|
| DateTime     | UInt32             | 1 second      | 1970-01-01 to 2106-02-07     | 4 bytes |
| DateTime64   | Int64              | Configurable  | 1900-01-01 to 2299-12-31     | 8 bytes |

`DateTime` stores Unix seconds as an unsigned 32-bit integer. `DateTime64(precision)` stores a scaled integer with a configurable sub-second precision from 0 (seconds) to 9 (nanoseconds). Both types support timezone specification.

## Creating Tables with DateTime Columns

```sql
CREATE TABLE http_access_log
(
    request_id   UInt64,
    method       String,
    path         String,
    status_code  UInt16,
    latency_ms   UInt32,
    logged_at    DateTime('UTC'),
    precise_at   DateTime64(3, 'UTC')   -- Millisecond precision
)
ENGINE = MergeTree()
ORDER BY logged_at;
```

## The Precision Parameter for DateTime64

The precision parameter defines the number of sub-second decimal places:

```sql
-- Common precision values
SELECT
    now64(0)  AS seconds,          -- 2026-03-31 10:00:00
    now64(3)  AS milliseconds,     -- 2026-03-31 10:00:00.123
    now64(6)  AS microseconds,     -- 2026-03-31 10:00:00.123456
    now64(9)  AS nanoseconds;      -- 2026-03-31 10:00:00.123456789
```

```sql
CREATE TABLE trace_spans
(
    span_id    UInt64,
    trace_id   UUID,
    service    LowCardinality(String),
    operation  String,
    start_time DateTime64(6, 'UTC'),   -- Microsecond precision
    end_time   DateTime64(6, 'UTC'),
    duration_us UInt64
)
ENGINE = MergeTree()
ORDER BY start_time;
```

## Inserting DateTime Values

```sql
INSERT INTO http_access_log
    (request_id, method, path, status_code, latency_ms, logged_at, precise_at) VALUES
(1, 'GET',  '/api/v1/users',  200, 45,  '2026-03-31 10:00:00',     '2026-03-31 10:00:00.123'),
(2, 'POST', '/api/v1/events', 201, 120, '2026-03-31 10:00:01',     '2026-03-31 10:00:01.456'),
(3, 'GET',  '/health',        200, 2,   '2026-03-31 10:00:02',     '2026-03-31 10:00:02.001');
```

## Timezone Handling

ClickHouse stores DateTime and DateTime64 values internally as UTC epoch seconds (or scaled integers). Timezones affect display and parsing but not the underlying value.

```sql
-- Converting between timezones for display
SELECT
    logged_at,
    toTimezone(logged_at, 'America/New_York')    AS eastern_time,
    toTimezone(logged_at, 'Asia/Tokyo')          AS japan_time,
    toTimezone(logged_at, 'Europe/London')       AS london_time
FROM http_access_log
LIMIT 3;
```

```sql
-- Storing with timezone context
CREATE TABLE scheduled_jobs
(
    job_id       UInt64,
    job_name     String,
    scheduled_at DateTime('America/New_York'),   -- Stored as UTC, displayed in NYC time
    completed_at Nullable(DateTime('America/New_York'))
)
ENGINE = MergeTree()
ORDER BY scheduled_at;
```

## Converting to DateTime

```sql
SELECT
    toDateTime('2026-03-31 10:00:00')          AS from_string,
    toDateTime(1774951200)                      AS from_unix,
    toDateTime64('2026-03-31 10:00:00.123', 3) AS datetime64_from_string,
    now()                                       AS current_datetime,
    now64(3)                                    AS current_datetime64;
```

## Extracting Time Components

```sql
SELECT
    logged_at,
    toYear(logged_at)       AS year,
    toMonth(logged_at)      AS month,
    toDayOfMonth(logged_at) AS day,
    toHour(logged_at)       AS hour,
    toMinute(logged_at)     AS minute,
    toSecond(logged_at)     AS second,
    toUnixTimestamp(logged_at) AS unix_ts
FROM http_access_log;
```

## DateTime Arithmetic

```sql
SELECT
    start_time,
    end_time,
    dateDiff('microsecond', start_time, end_time) AS duration_us,
    start_time + toIntervalMinute(30)             AS plus_30_min,
    start_time - toIntervalHour(1)                AS minus_1_hour
FROM trace_spans
LIMIT 5;
```

## Truncating Timestamps for Aggregation

```sql
SELECT
    toStartOfMinute(logged_at)  AS minute,
    count()                      AS request_count,
    avg(latency_ms)              AS avg_latency,
    countIf(status_code >= 500)  AS error_count
FROM http_access_log
GROUP BY minute
ORDER BY minute;
```

## Filtering by Time Range

```sql
-- Last hour of requests
SELECT
    request_id,
    path,
    status_code,
    latency_ms
FROM http_access_log
WHERE logged_at >= now() - toIntervalHour(1)
ORDER BY logged_at DESC;

-- DateTime64 range filter
SELECT *
FROM trace_spans
WHERE start_time >= toDateTime64('2026-03-31 00:00:00', 6)
  AND start_time <  toDateTime64('2026-04-01 00:00:00', 6);
```

## Summary

`DateTime` and `DateTime64` serve different precision needs in ClickHouse. Use `DateTime` for second-level timestamps where 4 bytes per value and the range up to 2106 are sufficient. Use `DateTime64(precision)` when sub-second resolution is required - milliseconds for application logs, microseconds for distributed tracing, nanoseconds for hardware instrumentation. Both types support timezone specification, rich extraction and truncation functions, and arithmetic with interval types. Storing timestamps in UTC and converting at query time is the recommended practice for systems that serve multiple timezones.
