# How to Use toTimezone() and toUTC() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Date Function, Timezone, Analytics, DateTime

Description: Learn how toTimezone() converts DateTime values to any IANA timezone and toUTC() normalizes them back to UTC for consistent storage and display.

---

ClickHouse stores `DateTime` columns internally as Unix timestamps (seconds since the UTC epoch). The timezone label attached to a column or literal is a display hint: it controls how the timestamp is formatted when rendered as a string, but not the underlying integer. `toTimezone(dt, 'Timezone/Name')` reinterprets the display of a DateTime in a different timezone, producing the wall-clock time a user in that timezone would see. To normalize back to UTC, use `toTimezone(dt, 'UTC')`. This function is essential for applications that store data in UTC and display it in users' local timezones.

## Basic Conversion With toTimezone

```sql
-- Convert a UTC DateTime to several other timezones
SELECT
    toDateTime('2024-06-15 12:00:00', 'UTC') AS utc_time,
    toTimezone(utc_time, 'America/New_York')   AS new_york,
    toTimezone(utc_time, 'Europe/London')      AS london,
    toTimezone(utc_time, 'Asia/Tokyo')         AS tokyo;
```

```text
utc_time                new_york                london                  tokyo
2024-06-15 12:00:00     2024-06-15 08:00:00     2024-06-15 13:00:00     2024-06-15 21:00:00
```

The underlying Unix timestamp is identical in all four columns. Only the human-readable representation differs.

## Normalizing to UTC

If you receive DateTime values that were inserted with a timezone label and want to normalize them to UTC, use `toTimezone` with `'UTC'` as the target.

```sql
-- Normalize a timezone-labeled DateTime to UTC
SELECT
    toDateTime('2024-06-15 08:00:00', 'America/New_York') AS local_time,
    toTimezone(local_time, 'UTC') AS utc_time;
```

```text
local_time              utc_time
2024-06-15 08:00:00     2024-06-15 12:00:00
```

## Storing in UTC, Displaying in Local Time

A common pattern is to store all timestamps in UTC and apply `toTimezone` at query time based on the user's preferred timezone, which can be passed as a query parameter.

```sql
-- Display order times in the user's local timezone
SELECT
    order_id,
    customer_id,
    toTimezone(created_at, {user_timezone: String}) AS local_created_at,
    total_amount
FROM orders
WHERE customer_id = 12345
ORDER BY created_at DESC
LIMIT 20;
```

For ad-hoc queries, substitute the timezone string directly:

```sql
SELECT
    order_id,
    toTimezone(created_at, 'America/Los_Angeles') AS pacific_time,
    total_amount
FROM orders
WHERE customer_id = 12345
ORDER BY created_at DESC
LIMIT 20;
```

## Grouping by Local Day

A classic pitfall is grouping by `toDate(event_time)` when the server is in UTC and users are in a different timezone. The date boundary falls at midnight UTC, not midnight local time. Fix this with `toTimezone` before applying `toDate`.

```sql
-- Group events by local calendar day (US Pacific)
SELECT
    toDate(toTimezone(event_time, 'America/Los_Angeles')) AS local_day,
    count() AS events
FROM user_events
WHERE event_time >= now() - INTERVAL 30 DAY
GROUP BY local_day
ORDER BY local_day;
```

## Filtering by Local Time Range

Similarly, filtering by a local time range requires converting the boundary to UTC before comparing, or converting the stored value to local time.

```sql
-- Find events that occurred during business hours (9am-5pm) in London
SELECT
    event_id,
    toTimezone(event_time, 'Europe/London') AS london_time,
    event_type
FROM events
WHERE
    toHour(toTimezone(event_time, 'Europe/London')) BETWEEN 9 AND 16
    AND toDate(event_time) = today()
ORDER BY london_time;
```

## Using formatDateTime With a Timezone

`formatDateTime` accepts an optional timezone argument, which combines conversion and formatting in one step.

```sql
-- Format timestamps directly in the target timezone
SELECT
    event_id,
    formatDateTime(event_time, '%Y-%m-%d %H:%M:%S', 'America/Chicago') AS chicago_time
FROM events
WHERE event_date = today()
LIMIT 10;
```

## Verifying the Stored Timezone of a Column

To check what timezone a DateTime column was declared with, query `system.columns`.

```sql
-- Inspect timezone metadata for DateTime columns in a table
SELECT
    name,
    type
FROM system.columns
WHERE
    database = currentDatabase()
    AND table = 'events'
    AND type LIKE 'DateTime%';
```

## Summary

`toTimezone(dt, 'Zone')` adjusts the display representation of a DateTime without changing the underlying Unix timestamp. Use `toTimezone(dt, 'UTC')` to normalize back to UTC. The recommended pattern is to store all timestamps in UTC and apply `toTimezone` at query time for display, grouping, and filtering. Pay particular attention to `GROUP BY toDate(...)` queries: always pass through `toTimezone` first if the logical day boundary should reflect a specific timezone rather than UTC midnight.
