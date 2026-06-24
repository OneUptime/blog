# How to Use toTimezone() and toUTC() for Timezone Conversion in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Timezone, Date Function, SQL, Data Engineering

Description: Learn how to use toTimezone() and toUTC() in ClickHouse to convert DateTime values between timezones accurately and efficiently.

---

## Overview

Handling timezones correctly in analytical databases is critical for producing accurate reports. ClickHouse provides the `toTimezone()` function for timezone conversion, which allows you to shift DateTime values between any IANA timezone (including UTC) without data loss.

## Converting to UTC with toTimezone()

`toTimezone(dt, 'UTC')` displays a DateTime value in UTC. ClickHouse always stores DateTime as a Unix timestamp internally, so this function only changes the timezone metadata used for display; the underlying instant is unchanged. If the column already stores data in a timezone-aware type, the UTC wall-clock time is computed accordingly.

```sql
SELECT
    toDateTime('2024-06-15 10:00:00', 'America/New_York') AS local_time,
    toTimezone(toDateTime('2024-06-15 10:00:00', 'America/New_York'), 'UTC') AS utc_time
```

Output:

```text
local_time           | utc_time
2024-06-15 10:00:00  | 2024-06-15 14:00:00
```

New York is UTC-4 during daylight saving time, so the UTC equivalent is 14:00.

## toTimezone() - Converting to a Target Timezone

`toTimezone(dt, 'timezone')` shifts a DateTime value to the specified IANA timezone. The timezone string must be a valid IANA name like `'Europe/London'` or `'Asia/Tokyo'`.

```sql
SELECT
    now() AS server_time,
    toTimezone(now(), 'Asia/Tokyo') AS tokyo_time,
    toTimezone(now(), 'Europe/Berlin') AS berlin_time
```

This is useful when serving users across multiple regions.

## Working with DateTime Columns

When creating tables that store events from multiple timezones, best practice is to store timestamps in UTC and convert at query time.

```sql
CREATE TABLE user_events
(
    event_id   UInt64,
    user_id    UInt64,
    event_time DateTime,
    region     String
)
ENGINE = MergeTree()
ORDER BY (user_id, event_time);
```

Insert data as UTC:

```sql
INSERT INTO user_events VALUES
(1, 100, toDateTime('2024-06-15 14:00:00'), 'us-east'),
(2, 101, toDateTime('2024-06-15 06:00:00'), 'asia-pacific');
```

Query with user-local time:

```sql
SELECT
    user_id,
    region,
    event_time AS utc_time,
    CASE
        WHEN region = 'us-east'       THEN toTimezone(event_time, 'America/New_York')
        WHEN region = 'asia-pacific'  THEN toTimezone(event_time, 'Asia/Tokyo')
        ELSE event_time
    END AS local_time
FROM user_events
```

## Combining with Date Truncation

Timezone conversion is especially important when grouping by day or hour, because a UTC midnight boundary may not match a local midnight.

```sql
SELECT
    toDate(toTimezone(event_time, 'America/Los_Angeles')) AS local_date,
    count() AS events
FROM user_events
GROUP BY local_date
ORDER BY local_date
```

Without the timezone conversion, events near midnight UTC would be grouped into the wrong local day.

## Using DateTime with Timezone Type

ClickHouse supports storing timezone information inside the column type itself using `DateTime('timezone')`.

```sql
CREATE TABLE orders
(
    order_id    UInt64,
    created_at  DateTime('America/Chicago')
)
ENGINE = MergeTree()
ORDER BY order_id;
```

When inserting, ClickHouse stores the value in UTC internally but displays it in the specified timezone:

```sql
INSERT INTO orders VALUES (1, '2024-06-15 09:00:00');

SELECT created_at, toTimezone(created_at, 'UTC') AS utc_time FROM orders;
-- created_at: 2024-06-15 09:00:00 (Chicago)
-- utc_time:   2024-06-15 14:00:00
```

## Listing Available Timezones

ClickHouse exposes all supported IANA timezone names via a system function:

```sql
SELECT * FROM system.time_zones LIMIT 20;
```

You can also search for specific regions:

```sql
SELECT name FROM system.time_zones WHERE name LIKE 'America/%' LIMIT 10;
```

## Common Pitfalls

- Do not confuse timezone display with timezone storage. ClickHouse always stores DateTime in UTC internally.
- Avoid using numeric offsets like `+05:30` directly - use the IANA name `Asia/Kolkata` instead for DST-aware handling.
- `toTimezone()` on a plain `DateTime` (no embedded timezone) assumes the value is in the server's local timezone.

## Summary

`toTimezone()` is the primary tool in ClickHouse for shifting DateTime values between timezones, including UTC. Store all timestamps in UTC, and convert at query time using `toTimezone()` to produce accurate local-time reports. Use `DateTime('timezone')` column types when you need the column to carry timezone semantics automatically.
