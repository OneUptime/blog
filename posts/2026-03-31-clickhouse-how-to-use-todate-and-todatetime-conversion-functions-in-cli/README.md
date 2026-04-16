# How to Use toDate() and toDateTime() Conversion Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, toDate, toDateTime, Type Conversion

Description: Learn how to use toDate() and toDateTime() functions in ClickHouse to convert strings, timestamps, and other types to date and datetime values.

---

## Date/DateTime Conversion Functions Overview

ClickHouse provides a family of date conversion functions:

| Function | Converts From | Returns |
|----------|--------------|---------|
| `toDate(s)` | String, Unix timestamp, DateTime | `Date` |
| `toDateTime(s)` | String, Unix timestamp, Date | `DateTime` |
| `toDateTime64(s, precision)` | String, Unix timestamp | `DateTime64` |
| `toDateOrNull(s)` | String | `Nullable(Date)` |
| `toDateTimeOrNull(s)` | String | `Nullable(DateTime)` |
| `toDateOrZero(s)` | String | `Date` (epoch on failure) |
| `toDateTimeOrZero(s)` | String | `DateTime` (epoch on failure) |
| `parseDateTimeBestEffort(s)` | Various string formats | `DateTime` |

## toDate() Examples

```sql
-- From ISO date string
SELECT toDate('2024-03-15');               -- Date: 2024-03-15

-- From DateTime string (truncates to date)
SELECT toDate('2024-03-15 14:30:00');      -- Date: 2024-03-15

-- From Unix timestamp (seconds since epoch)
SELECT toDate(1710489600);                  -- Date corresponding to timestamp

-- From DateTime column
CREATE TABLE dt_examples (ts DateTime) ENGINE = Memory;
INSERT INTO dt_examples VALUES ('2024-03-15 14:30:00');
SELECT toDate(ts) FROM dt_examples;        -- 2024-03-15

-- Arithmetic with toDate
SELECT toDate('2024-01-01') + 30;           -- 2024-01-31 (add 30 days)
SELECT today() - toDate('2024-01-01');      -- days since Jan 1 2024
```

## toDateTime() Examples

```sql
-- From date string with time
SELECT toDateTime('2024-03-15 14:30:00');   -- DateTime: 2024-03-15 14:30:00

-- From date-only string (adds 00:00:00)
SELECT toDateTime('2024-03-15');            -- DateTime: 2024-03-15 00:00:00

-- From Unix timestamp
SELECT toDateTime(1710489600);              -- DateTime from epoch seconds

-- With timezone
SELECT toDateTime('2024-03-15 14:30:00', 'America/New_York');
SELECT toDateTime(1710489600, 'UTC');

-- From Date column
SELECT toDateTime(toDate('2024-03-15'));    -- 2024-03-15 00:00:00
```

## toDateTime64() for Sub-Second Precision

```sql
-- DateTime64 with millisecond precision
SELECT toDateTime64('2024-03-15 14:30:00.123', 3);    -- 3 decimal places

-- From Unix timestamp with fractional seconds
SELECT toDateTime64(1710489600.123, 3);

-- From Unix milliseconds
SELECT toDateTime64(1710489600123 / 1000.0, 3);

-- Or use fromUnixTimestamp64Milli for millisecond epoch
SELECT fromUnixTimestamp64Milli(1710489600123);  -- DateTime64(3) from millisecond epoch
```

## Safe Conversion Functions (OrNull, OrZero)

```sql
-- toDateOrNull: returns NULL on parse failure (safe for untrusted data)
SELECT
    raw_date,
    toDateOrNull(raw_date) AS safe_date
FROM (
    SELECT '2024-03-15' AS raw_date
    UNION ALL SELECT 'not-a-date'
    UNION ALL SELECT NULL
    UNION ALL SELECT '2024-13-01'  -- invalid month
);
-- Results: 2024-03-15, NULL, NULL, NULL

-- toDateTimeOrZero: returns 1970-01-01 00:00:00 on failure
SELECT
    raw_input,
    toDateTimeOrZero(raw_input) AS fallback_dt
FROM (
    SELECT '2024-03-15 12:00:00' AS raw_input
    UNION ALL SELECT 'invalid'
);
-- Results: 2024-03-15 12:00:00, 1970-01-01 00:00:00
```

## parseDateTimeBestEffort

For flexible string parsing that handles many formats:

```sql
-- Handles many common date formats automatically
SELECT parseDateTimeBestEffort('March 15, 2024');               -- 2024-03-15 00:00:00
SELECT parseDateTimeBestEffort('15/03/2024 14:30');             -- 2024-03-15 14:30:00
SELECT parseDateTimeBestEffort('2024-03-15T14:30:00Z');         -- ISO 8601
SELECT parseDateTimeBestEffort('Thu, 15 Mar 2024 14:30:00 GMT'); -- RFC 2822

-- Safe version
SELECT parseDateTimeBestEffortOrNull('invalid date');  -- returns NULL
```

## Data Type Conversion Patterns

```sql
-- Convert Unix millisecond timestamps (common in logs)
SELECT
    unix_ms,
    fromUnixTimestamp64Milli(unix_ms) AS ts,          -- DateTime64(3)
    toDateTime(intDiv(unix_ms, 1000)) AS ts_seconds    -- DateTime (truncated)
FROM raw_events;

-- Convert Unix nanosecond timestamps
SELECT fromUnixTimestamp64Nano(unix_ns) AS ts FROM events;

-- From a string with custom format
SELECT parseDateTime('15.03.2024 14:30:00', '%d.%m.%Y %H:%M:%S');

-- Safe version with custom format
SELECT parseDateTimeOrNull('invalid', '%d.%m.%Y %H:%M:%S');
```

## Practical Example: Normalizing Mixed Date Formats

```sql
CREATE TABLE imported_events (
    event_id UInt64,
    raw_timestamp String,
    event_type String
) ENGINE = MergeTree()
ORDER BY event_id;

INSERT INTO imported_events VALUES
(1, '2024-03-15 14:30:00', 'login'),
(2, '1710489600', 'purchase'),          -- Unix timestamp
(3, 'March 15, 2024', 'signup'),
(4, '2024-03-15T14:30:00Z', 'logout');

-- Normalize all formats to DateTime
SELECT
    event_id,
    raw_timestamp,
    coalesce(
        toDateTimeOrNull(raw_timestamp),
        if(match(raw_timestamp, '^[0-9]+$'),
           toDateTime(toUInt32(raw_timestamp)),
           NULL),
        parseDateTimeBestEffortOrNull(raw_timestamp)
    ) AS normalized_ts,
    event_type
FROM imported_events;
```

## Summary

ClickHouse's `toDate()` and `toDateTime()` functions convert strings, Unix timestamps, and other date types to proper Date/DateTime values. Use the `OrNull` variants for safe conversion of untrusted data, and `parseDateTimeBestEffort()` for flexible parsing of varied string formats. For sub-second precision, use `toDateTime64()` with a precision parameter. These functions are foundational for ETL pipelines, data normalization, and any query that needs to compare or group by time values from external sources.
