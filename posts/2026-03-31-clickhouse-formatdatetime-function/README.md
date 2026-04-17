# How to Use formatDateTime() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, String Formatting, Timezone, Report

Description: Learn how to use formatDateTime() to convert DateTime values to strings using strftime-style format specifiers for reports, APIs, and ISO 8601 output.

---

`formatDateTime()` converts a `DateTime` or `DateTime64` value into a formatted string using strftime-style specifiers. It is the go-to function whenever you need to produce human-readable dates for reports, generate ISO 8601 strings for APIs, or create derived columns like `year_month` for partitioning keys in downstream systems.

## Function Signature

```text
formatDateTime(dt, format)
formatDateTime(dt, format, timezone)
```

The `format` string contains literal characters and percent-prefixed specifiers. The optional `timezone` argument controls which wall-clock time is rendered - the stored UTC value is unchanged.

## Supported Format Specifiers

The most commonly used specifiers are listed below.

```text
%Y  - four-digit year           (2026)
%y  - two-digit year            (26)
%m  - two-digit month           (03)
%d  - two-digit day             (31)
%H  - two-digit hour (24h)      (14)
%I  - two-digit hour (12h)      (02)
%i  - two-digit minute          (23)
%S  - two-digit second          (47)
%p  - AM or PM                  (PM)
%e  - day of month, space-padded ( 1..31)
%j  - day of year               (090)
%V  - ISO 8601 week number      (14)
%w  - weekday (0=Sunday)        (2)
%W  - full weekday name         (Tuesday)
%a  - abbreviated weekday       (Tue)
%M  - full month name           (March)
%b  - abbreviated month         (Mar)
%f  - fractional second         (123456)
%F  - shorthand for %Y-%m-%d
%T  - shorthand for %H:%i:%S
%R  - shorthand for %H:%i
%%  - literal percent sign
```

Note: ClickHouse's `formatDateTime` uses the MySQL dialect, so `%M` is the full month name (not minute) and `%W` is the full weekday name (not week number). Use `%i` for minute and `%V` for ISO 8601 week number.

## Basic String Formatting

The simplest use case is rendering a timestamp as a readable string for a report column.

```sql
SELECT
    formatDateTime(now(), '%Y-%m-%d %H:%i:%S') AS formatted,
    formatDateTime(now(), '%d/%m/%Y')           AS eu_format,
    formatDateTime(now(), '%M %e, %Y')          AS long_format;
-- Result: 2026-03-31 14:23:47 | 31/03/2026 | March 31, 2026
```

## Generating ISO 8601 Strings

ISO 8601 is the interchange format for APIs and data exports. Use `%F` and `%T` shorthands to produce compact output.

```sql
SELECT
    formatDateTime(now(), '%FT%T')             AS iso_basic,
    formatDateTime(now(), '%FT%TZ')            AS iso_utc,
    formatDateTime(now(), '%Y-%m-%dT%H:%i:%S') AS iso_explicit;
-- Result: 2026-03-31T14:23:47 | 2026-03-31T14:23:47Z
```

For `DateTime64` with millisecond precision, combine `%T` with `%f` and substring to trim to three digits:

```sql
SELECT
    formatDateTime(now64(3), '%FT%T') || '.' ||
    leftPad(toString(toUnixTimestamp64Milli(now64(3)) % 1000), 3, '0') || 'Z'
    AS iso8601_ms;
```

## Timezone-Aware Formatting

The stored DateTime is always UTC. The timezone argument in `formatDateTime` shifts the display without mutating the value.

```sql
SELECT
    formatDateTime(event_time, '%Y-%m-%d %H:%i', 'UTC')             AS utc_display,
    formatDateTime(event_time, '%Y-%m-%d %H:%i', 'America/Chicago') AS chicago_display,
    formatDateTime(event_time, '%Y-%m-%d %H:%i', 'Asia/Singapore')  AS sg_display
FROM events
LIMIT 5;
```

This is particularly useful in multi-tenant applications where each user record stores a preferred timezone.

```sql
SELECT
    u.name,
    formatDateTime(e.event_time, '%d %b %Y %H:%i', u.timezone) AS local_event_time
FROM events AS e
JOIN users AS u ON e.user_id = u.user_id
LIMIT 10;
```

## Generating Derived Columns for Grouping

`formatDateTime` produces strings that sort correctly when zero-padded, making them safe to GROUP BY without converting back to a date type.

```sql
SELECT
    formatDateTime(event_time, '%Y-%m')   AS year_month,
    formatDateTime(event_time, '%Y-W%V')  AS iso_week,
    count()                               AS events
FROM page_views
WHERE event_time >= today() - INTERVAL 90 DAY
GROUP BY year_month, iso_week
ORDER BY year_month ASC;
```

## Building Report Labels

Dashboard charts often need axis labels in a specific locale format. `formatDateTime` lets you create them directly in SQL rather than in application code.

```sql
SELECT
    formatDateTime(toStartOfDay(event_time), '%a %d %b') AS day_label,
    count()                                              AS visits
FROM sessions
WHERE event_time >= today() - INTERVAL 7 DAY
GROUP BY day_label, toStartOfDay(event_time)
ORDER BY toStartOfDay(event_time) ASC;
```

## Partitioning Key Strings

When exporting data to object storage or downstream tables that use string-based partitioning, `formatDateTime` produces consistent folder paths.

```sql
SELECT
    formatDateTime(event_time, '/year=%Y/month=%m/day=%d/') AS s3_prefix,
    count()                                                 AS row_count
FROM events
GROUP BY s3_prefix
ORDER BY s3_prefix ASC;
```

## Summary

`formatDateTime()` is the standard function for converting `DateTime` values to strings in ClickHouse. Its strftime-style specifiers cover all common date formatting needs: ISO 8601 for APIs, localised strings for reports, and derived keys for partitioning. The optional timezone argument lets you render UTC-stored values in any local time without touching the underlying data. Use it whenever you need a date as a string rather than as a sortable DateTime column.
