# How to Use toDate() and toDateTime() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Type Conversion, DateTime, Timezone

Description: Learn how toDate() and toDateTime() convert strings, numbers, and timestamps in ClickHouse, including toDate32 for extended date ranges and timezone handling.

---

ClickHouse stores dates as `Date` (16-bit, days since 1970-01-01) and timestamps as `DateTime` (32-bit, seconds since Unix epoch) or `DateTime64` (sub-second precision). The functions `toDate()` and `toDateTime()` are the primary way to construct these types from raw strings, Unix timestamps, and other inputs. Understanding how they work - and where they differ - prevents silent data errors when ingesting data from external systems.

## Function Signatures

```text
toDate(expr)
toDate(expr, timezone)

toDateTime(expr)
toDateTime(expr, timezone)

toDate32(expr)           -- extended range: 1900-01-01 to 2299-12-31
toDateTime64(expr, scale)
toDateTime64(expr, scale, timezone)
```

`toDate` returns a `Date` value with day granularity. `toDateTime` returns a `DateTime` with second granularity. Both accept strings, integers (Unix epoch seconds), and other date/time types.

## Parsing Strings with toDate

The most common use case is converting an ISO 8601 date string from an external source. ClickHouse accepts `YYYY-MM-DD` format natively.

```sql
SELECT
    toDate('2026-03-31')          AS from_string,
    toTypeName(toDate('2026-03-31')) AS type_name;
-- Result: 2026-03-31 | Date
```

Strings in other formats require `toDateOrNull` with explicit parsing or `parseDateTimeBestEffort` to avoid silent zero-date substitution on bad input.

```sql
SELECT
    toDateOrNull('31/03/2026')    AS eu_format,   -- NULL (unsupported)
    toDateOrZero('not-a-date')    AS bad_input;    -- 1970-01-01
```

## Parsing Strings with toDateTime

`toDateTime` accepts `YYYY-MM-DD HH:MM:SS` strings and returns a `DateTime`.

```sql
SELECT
    toDateTime('2026-03-31 14:23:47')          AS from_string,
    toTypeName(toDateTime('2026-03-31 14:23:47')) AS type_name;
-- Result: 2026-03-31 14:23:47 | DateTime
```

## Converting Unix Timestamps

Many external systems - log aggregators, Kafka producers, JavaScript clients - send timestamps as Unix epoch integers. Pass the integer directly to `toDateTime`.

```sql
SELECT
    toDateTime(1774966427)         AS from_epoch,
    toDate(1774966427)             AS date_only;
-- Result: 2026-03-31 14:13:47 | 2026-03-31
```

For millisecond-precision timestamps, use `toDateTime64` with scale 3:

```sql
SELECT
    toDateTime64(1774966427000, 3) AS from_millis;
-- Result: 2026-03-31 14:13:47.000
```

## Timezone-Aware Conversion

When a Unix timestamp or string represents a time in a specific timezone, pass the timezone name so ClickHouse stores the correct UTC value internally while displaying in the target zone.

```sql
SELECT
    toDateTime('2026-03-31 09:00:00', 'America/New_York') AS ny_time,
    toDateTime('2026-03-31 09:00:00', 'UTC')              AS utc_time;
-- ny_time is stored as 2026-03-31 13:00:00 UTC internally
```

When reading back, always specify the same timezone to avoid off-by-hours in aggregations.

```sql
SELECT
    date_trunc('day', event_time, 'America/New_York') AS local_day,
    count()                                           AS events
FROM events
GROUP BY local_day
ORDER BY local_day;
```

## Converting DateTime to Date

Truncating a `DateTime` to a `Date` strips the time component. This is faster than `date_trunc('day', ...)` for simple date extraction.

```sql
SELECT
    now()            AS current_datetime,
    toDate(now())    AS current_date;
```

## Handling Extended Date Ranges with toDate32

The standard `Date` type only covers 1970-01-01 to 2149-06-06. For historical data such as birth dates or old financial records, use `toDate32`.

```sql
SELECT
    toDate32('1900-01-01') AS earliest_supported,
    toDate32('2299-12-31') AS latest_supported;
```

A practical example - storing user birth dates safely:

```sql
CREATE TABLE users (
    user_id   UInt64,
    name      String,
    birthdate Date32
) ENGINE = MergeTree()
ORDER BY user_id;

INSERT INTO users VALUES (1, 'Alice', toDate32('1945-07-04'));
```

## Type Coercion in Table Inserts

When inserting CSV data where dates arrive as strings, wrapping columns in `toDate` and `toDateTime` during an `INSERT INTO ... SELECT` avoids schema errors.

```sql
INSERT INTO events (event_id, event_time, event_date)
SELECT
    event_id,
    toDateTime(raw_timestamp),
    toDate(raw_timestamp)
FROM raw_events
WHERE isValidJSON(raw_timestamp) = 0;
```

## Summary

`toDate()` and `toDateTime()` are the workhorses of date type conversion in ClickHouse. Use `toDate` for day-granularity values, `toDateTime` for second-granularity timestamps, and `toDate32` or `toDateTime64` when you need extended ranges or sub-second precision. Always pass a timezone when the input string is local time, and prefer `toDateOrNull` or `toDateTimeOrNull` over the base functions when handling untrusted input to catch parse errors explicitly.
