# How to Fix 'Cannot parse datetime' in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, DateTime, Data Type, Troubleshooting

Description: Fix 'Cannot parse datetime' errors in ClickHouse by understanding supported formats, timezone handling, and the right parsing functions.

---

## Understanding the Error

ClickHouse is strict about datetime string formats. When a string does not match the expected format for a `DateTime` or `DateTime64` column, you see:

```text
Code: 41. DB::Exception: Cannot parse datetime 'Mon, 01 Jan 2024 00:00:00 +0000' from String.
```

or:

```text
Code: 41. DB::Exception: Cannot parse date '2024/01/15' from String.
```

## Supported Default Formats

ClickHouse's `DateTime` type natively parses these formats:

- `YYYY-MM-DD HH:MM:SS` - the standard ISO format
- Unix timestamp (integer)

The Date type parses:
- `YYYY-MM-DD`

Anything else requires explicit parsing functions.

## Diagnosing the Problem

Check what format your data is in:

```sql
-- Look at a sample of the raw data
SELECT raw_timestamp
FROM staging_table
LIMIT 10;
```

Try parsing manually:

```sql
-- Test ISO format
SELECT toDateTime('2024-01-15 10:30:00');

-- Test Unix timestamp
SELECT toDateTime(1705312200);

-- Test DateTime64 with milliseconds
SELECT toDateTime64('2024-01-15 10:30:00.123', 3);
```

## Fix 1 - Use parseDateTimeBestEffort

For flexible parsing of many common formats:

```sql
SELECT parseDateTimeBestEffort('Mon, 01 Jan 2024 00:00:00 +0000') AS ts;
SELECT parseDateTimeBestEffort('2024/01/15 10:30:00') AS ts;
SELECT parseDateTimeBestEffort('January 15, 2024') AS ts;
```

For safe parsing that returns NULL instead of throwing:

```sql
SELECT parseDateTimeBestEffortOrNull('bad-date') AS ts;
-- Returns: NULL
```

## Fix 2 - Use parseDateTime with a Format String

When you know the exact format, use `parseDateTime`:

```sql
-- Custom format: DD/MM/YYYY HH:MM:SS
SELECT parseDateTime('15/01/2024 10:30:00', '%d/%m/%Y %H:%i:%s') AS ts;

-- US format: MM-DD-YYYY
SELECT parseDateTime('01-15-2024', '%m-%d-%Y') AS ts;

-- RFC 2822 email format
SELECT parseDateTime('01 Jan 2024 10:30:00', '%d %b %Y %H:%i:%s') AS ts;
```

## Fix 3 - Fix Timezone Issues

Datetime parsing can fail or produce wrong results when timezone information is unexpected:

```sql
-- Parse with explicit timezone
SELECT toDateTime('2024-01-15 10:30:00', 'UTC') AS ts;
SELECT toDateTime('2024-01-15 10:30:00', 'America/New_York') AS ts;

-- Convert timezone after parsing
SELECT toTimeZone(parseDateTimeBestEffort('2024-01-15T10:30:00+05:30'), 'UTC') AS ts;
```

## Fix 4 - Parse During INSERT

When loading data via INSERT, convert the format inline:

```sql
INSERT INTO events (timestamp, user_id, event_type)
SELECT
    parseDateTimeBestEffort(raw_timestamp) AS timestamp,
    user_id,
    event_type
FROM staging_table;
```

## Fix 5 - Handle Milliseconds and Microseconds

If your timestamps have sub-second precision:

```sql
-- DateTime64 with milliseconds (precision 3)
SELECT toDateTime64('2024-01-15 10:30:00.123', 3) AS ts;

-- DateTime64 with microseconds (precision 6)
SELECT toDateTime64('2024-01-15 10:30:00.123456', 6) AS ts;

-- Parse from epoch milliseconds
SELECT fromUnixTimestamp64Milli(1705312200123) AS ts;

-- Parse from epoch microseconds
SELECT fromUnixTimestamp64Micro(1705312200123456) AS ts;
```

## Fix 6 - Table Input Format Settings

When using file-based imports, configure the format:

```bash
# Import CSV with custom date format
clickhouse-client --query "INSERT INTO events FORMAT CSV" \
    --input_format_csv_delimiter=',' \
    < data.csv
```

Or in SQL:

```sql
INSERT INTO events
SELECT *
FROM file('/tmp/data.csv', CSV)
SETTINGS
    date_time_input_format = 'best_effort';
```

## Common Format Reference

```sql
-- Format specifiers for parseDateTime (MySQL syntax):
-- %Y - four-digit year
-- %m - month (01-12)
-- %d - day (01-31)
-- %H - hour 24h (00-23)
-- %i - minute (00-59)
-- %s - second (00-59)
-- %e - day without leading zero (1-31)
-- %b - abbreviated month name (Jan, Feb, ...)
-- %M - full month name (January, ...)

SELECT formatDateTime(now(), '%d %b %Y %H:%i:%s') AS formatted;
```

## Summary

"Cannot parse datetime" in ClickHouse means your input string does not match the expected `YYYY-MM-DD HH:MM:SS` format. Use `parseDateTimeBestEffort` for flexible parsing, `parseDateTime` with an explicit format string for known formats, and `toDateTime64` for sub-second precision. Always specify timezones explicitly to avoid silent conversion errors.
