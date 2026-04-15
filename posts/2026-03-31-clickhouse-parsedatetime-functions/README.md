# How to Use parseDateTime() and parseDateTimeBestEffort() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, String Parsing, Data Ingestion, ETL

Description: Learn how parseDateTime() and parseDateTimeBestEffort() handle diverse date string formats during data ingestion, and when to use each for safe ETL pipelines.

---

Real-world data arrives in dozens of date formats: ISO 8601, Unix timestamps, US-style `MM/DD/YYYY`, European `DD.MM.YYYY`, HTTP log dates, and more. ClickHouse provides two complementary functions for parsing these strings into `DateTime` values. `parseDateTime()` gives you full control by accepting an explicit MySQL-style format pattern. `parseDateTimeBestEffort()` auto-detects the format, trading precision for convenience when ingesting data from heterogeneous sources.

## Function Signatures

```text
parseDateTime(str, format)
parseDateTime(str, format, timezone)

parseDateTimeOrNull(str, format)
parseDateTimeOrNull(str, format, timezone)

parseDateTimeOrZero(str, format)
parseDateTimeOrZero(str, format, timezone)

parseDateTimeBestEffort(str)
parseDateTimeBestEffort(str, timezone)

parseDateTimeBestEffortOrNull(str)
parseDateTimeBestEffortOrNull(str, timezone)
parseDateTimeBestEffortOrZero(str)
parseDateTimeBestEffortOrZero(str, timezone)
```

The `OrNull` variants return `NULL` on parse failure instead of throwing an exception. The `OrZero` variants return `1970-01-01 00:00:00`. Always prefer `OrNull` for untrusted input so bad rows can be filtered rather than causing query failures.

## parseDateTime with Explicit Format

Use `parseDateTime` when you know the exact format of the incoming strings. The format uses MySQL-style specifiers, the same ones accepted by `formatDateTime`. Note that `%i` represents minutes and `%M` represents the full month name, which differs from the C/strftime convention.

```sql
SELECT
    parseDateTime('2026-03-31 14:23:47', '%Y-%m-%d %H:%i:%S') AS iso_datetime,
    parseDateTime('31/03/2026 14:23',    '%d/%m/%Y %H:%i')    AS eu_datetime,
    parseDateTime('03-31-2026',          '%m-%d-%Y')           AS us_date;
```

Providing the wrong format string for a given input will throw an exception in the default variant and return NULL in the `OrNull` variant:

```sql
SELECT
    parseDateTimeOrNull('not-a-date', '%Y-%m-%d') AS bad_input;
-- Result: NULL
```

## Parsing Common Log Formats

Web server and application logs use a variety of timestamp formats. The Apache Combined Log Format uses `DD/Mon/YYYY:HH:MM:SS +ZZZZ`. Parse it with a matching format string.

```sql
SELECT
    parseDateTime(
        '31/Mar/2026:14:23:47 +0000',
        '%d/%b/%Y:%H:%i:%S %z'
    ) AS apache_log_time;
```

For Nginx logs that omit the timezone offset, use the `timezone` argument instead:

```sql
SELECT
    parseDateTime(
        '2026/03/31 14:23:47',
        '%Y/%m/%d %H:%i:%S',
        'UTC'
    ) AS nginx_log_time;
```

## parseDateTimeBestEffort for Mixed-Format Sources

When data comes from multiple upstream systems with inconsistent formats, `parseDateTimeBestEffort` tries a battery of known patterns before giving up.

```sql
SELECT
    parseDateTimeBestEffort('2026-03-31T14:23:47Z')    AS iso8601_utc,
    parseDateTimeBestEffort('March 31, 2026 2:23 PM')  AS natural_language,
    parseDateTimeBestEffort('2026.03.31 14:23:47')      AS dot_separated,
    parseDateTimeBestEffort('1743430427')               AS unix_epoch_string;
```

All four return equivalent `DateTime` values. The function recognises Unix epoch strings as well as human-readable formats, which makes it useful when a single column contains both numeric and string timestamps.

## Safe Ingestion with OrNull and Filtering

In a production ETL pipeline you should never let a bad timestamp silently become `1970-01-01`. Use `parseDateTimeBestEffortOrNull` to surface the problem rows explicitly.

```sql
SELECT
    raw_timestamp,
    parseDateTimeBestEffortOrNull(raw_timestamp) AS parsed_time,
    CASE
        WHEN parseDateTimeBestEffortOrNull(raw_timestamp) IS NULL THEN 'FAILED'
        ELSE 'OK'
    END AS parse_status
FROM staging_events
LIMIT 100;
```

Then filter out the bad rows before inserting into your production table:

```sql
INSERT INTO events (event_id, event_time)
SELECT
    event_id,
    parseDateTimeBestEffortOrNull(raw_timestamp) AS event_time
FROM staging_events
WHERE parseDateTimeBestEffortOrNull(raw_timestamp) IS NOT NULL;
```

## Timezone Handling During Parse

If the incoming strings represent local time in a known timezone, specify it as the second argument so ClickHouse stores the correct UTC value.

```sql
SELECT
    parseDateTime('2026-03-31 09:00:00', '%Y-%m-%d %H:%i:%S', 'America/New_York') AS ny_local,
    parseDateTime('2026-03-31 09:00:00', '%Y-%m-%d %H:%i:%S', 'Europe/Berlin')    AS de_local;
-- ny_local stores 2026-03-31 13:00:00 UTC (EDT, UTC-4)
-- de_local stores 2026-03-31 07:00:00 UTC (CEST, UTC+2 — DST began March 29)
```

## Choosing Between the Two Functions

```text
Scenario                                          Recommended function
-----------------------------------------------------------------------
Known format, single source, performance matters  parseDateTime
Mixed formats from multiple systems               parseDateTimeBestEffort
Untrusted input, must not throw                   parseDateTimeBestEffortOrNull
Strict validation with known format               parseDateTimeOrNull
Unix epoch integers stored as strings             parseDateTimeBestEffort
```

## Summary

`parseDateTime()` and `parseDateTimeBestEffort()` cover the full spectrum of date string ingestion in ClickHouse. Use `parseDateTime` for controlled, high-volume pipelines where the format is known and performance matters. Use `parseDateTimeBestEffort` when integrating heterogeneous data sources where normalising formats upstream is impractical. In either case, prefer the `OrNull` variant in production pipelines to handle bad data gracefully without crashing queries.
