# How to Use toUnixTimestamp() and fromUnixTimestamp() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Unix Timestamp, Type Conversion, Interoperability

Description: Learn how toUnixTimestamp() and fromUnixTimestamp() convert between DateTime and Unix epoch integers in ClickHouse for system interop and interval arithmetic.

---

Unix timestamps are the lingua franca of systems programming. Log shippers, Kafka messages, JavaScript clients, and monitoring agents all routinely represent time as the number of seconds (or milliseconds) since 1970-01-01 00:00:00 UTC. ClickHouse provides `toUnixTimestamp()` to convert a `DateTime` to an epoch integer, and `fromUnixTimestamp()` to convert back. Understanding both functions is essential when ingesting data from external systems, joining across tables with different temporal representations, and performing high-precision interval arithmetic.

## Function Signatures

```text
toUnixTimestamp(dt)
toUnixTimestamp(dt, timezone)
toUnixTimestamp(str, timezone)   -- parses string then converts

fromUnixTimestamp(n)
fromUnixTimestamp(n, timezone)   -- returns DateTime in that timezone

toUnixTimestamp64Milli(dt64)     -- milliseconds (requires DateTime64)
toUnixTimestamp64Micro(dt64)     -- microseconds
toUnixTimestamp64Nano(dt64)      -- nanoseconds

fromUnixTimestamp64Milli(n)
fromUnixTimestamp64Micro(n)
fromUnixTimestamp64Nano(n)
```

`toUnixTimestamp` returns a `UInt32`. `fromUnixTimestamp` returns a `DateTime`. The `64*` variants accept and return `Int64` and `DateTime64` respectively.

## Basic Conversion

Converting between DateTime and epoch is a one-function call in either direction.

```sql
SELECT
    now()                                    AS current_datetime,
    toUnixTimestamp(now())                   AS epoch_seconds,
    fromUnixTimestamp(toUnixTimestamp(now())) AS round_trip;
```

Starting from a known epoch value:

```sql
SELECT
    fromUnixTimestamp(1743430427)            AS human_readable,
    toUnixTimestamp(fromUnixTimestamp(1743430427)) AS back_to_epoch;
-- human_readable: 2025-03-31 14:13:47
```

## Ingesting Epoch Data from External Systems

When a Kafka topic or CSV file contains timestamps as integer seconds, cast the column directly with `fromUnixTimestamp` during ingestion.

```sql
INSERT INTO events (event_id, event_time, user_id, action)
SELECT
    event_id,
    fromUnixTimestamp(epoch_seconds)  AS event_time,
    user_id,
    action
FROM raw_kafka_events
WHERE epoch_seconds > 0;
```

For millisecond-precision sources (JavaScript `Date.now()`, many REST APIs):

```sql
INSERT INTO events (event_id, event_time)
SELECT
    event_id,
    fromUnixTimestamp64Milli(epoch_millis) AS event_time
FROM raw_events
WHERE epoch_millis > 0;
```

## Storing Timestamps as Integers

Some teams store timestamps as `UInt32` or `Int64` columns to avoid timezone confusion or to save storage. You can convert them on the fly in queries without schema changes.

```sql
SELECT
    request_id,
    fromUnixTimestamp(start_epoch)                         AS start_time,
    fromUnixTimestamp(end_epoch)                           AS end_time,
    end_epoch - start_epoch                                AS duration_seconds
FROM api_requests
WHERE start_epoch >= toUnixTimestamp(subtractDays(now(), 1))
ORDER BY start_epoch DESC
LIMIT 100;
```

## Computing Intervals in Seconds with Integer Arithmetic

Integer subtraction on epoch values is faster than `dateDiff` for second-granularity calculations on large datasets, because it avoids the overhead of converting to and from DateTime internals.

```sql
SELECT
    session_id,
    end_epoch - start_epoch                                AS session_duration_s,
    round((end_epoch - start_epoch) / 60.0, 2)            AS session_duration_m
FROM sessions
WHERE session_duration_s BETWEEN 1 AND 86400  -- filter bots and zombies
ORDER BY session_duration_s DESC
LIMIT 50;
```

## Timezone-Aware Conversion

`toUnixTimestamp` with a timezone interprets a naive DateTime string as local time in that zone before converting to UTC epoch. This is important when the source system writes local timestamps without an offset.

```sql
SELECT
    -- Treat this string as Tokyo local time
    toUnixTimestamp('2026-03-31 14:00:00', 'Asia/Tokyo')          AS jst_epoch,
    -- Same string treated as UTC
    toUnixTimestamp('2026-03-31 14:00:00', 'UTC')                 AS utc_epoch,
    -- Difference should be 9 hours = 32400 seconds
    toUnixTimestamp('2026-03-31 14:00:00', 'UTC') -
    toUnixTimestamp('2026-03-31 14:00:00', 'Asia/Tokyo')          AS offset_seconds;
```

`fromUnixTimestamp` with a timezone renders the stored UTC epoch as local time in the specified zone:

```sql
SELECT
    fromUnixTimestamp(1743430427, 'America/New_York') AS ny_time,
    fromUnixTimestamp(1743430427, 'Europe/Paris')     AS paris_time,
    fromUnixTimestamp(1743430427, 'Asia/Tokyo')       AS tokyo_time;
```

## Bucketing with Epoch Arithmetic

Integer arithmetic on epoch values can bucket timestamps into fixed-width intervals very efficiently, especially for power-of-two or round-number intervals.

```sql
SELECT
    intDiv(start_epoch, 300) * 300            AS five_min_bucket_epoch,
    fromUnixTimestamp(
        intDiv(start_epoch, 300) * 300
    )                                         AS five_min_bucket,
    count()                                   AS requests,
    avg(end_epoch - start_epoch)              AS avg_duration_s
FROM api_requests
WHERE start_epoch >= toUnixTimestamp(subtractHours(now(), 1))
GROUP BY five_min_bucket_epoch
ORDER BY five_min_bucket_epoch ASC;
```

This is equivalent to `toStartOfInterval(event_time, INTERVAL 5 MINUTE)` but operates entirely in integer space.

## Sub-Second Precision with toUnixTimestamp64

When your application instruments nanosecond or millisecond timestamps (OpenTelemetry spans, for example), use the 64-bit variants to avoid precision loss.

```sql
SELECT
    trace_id,
    toUnixTimestamp64Nano(start_time_dt64)        AS start_ns,
    toUnixTimestamp64Nano(end_time_dt64)          AS end_ns,
    end_ns - start_ns                             AS duration_ns,
    round((end_ns - start_ns) / 1e6, 3)           AS duration_ms
FROM trace_spans
WHERE start_time_dt64 >= subtractHours(now(), 1)
ORDER BY duration_ns DESC
LIMIT 20;
```

## Summary

`toUnixTimestamp()` and `fromUnixTimestamp()` are the bridge between ClickHouse's native DateTime types and the integer epoch representation used by most external systems. Use `toUnixTimestamp` to convert DateTime values for export, integer arithmetic, or comparison with epoch columns. Use `fromUnixTimestamp` to convert incoming integer timestamps to queryable DateTime values. For sub-second precision, use the `64Milli`, `64Micro`, and `64Nano` variants with `DateTime64`. When handling data from systems that write local timestamps without offsets, always pass the source timezone to avoid off-by-hours errors.
