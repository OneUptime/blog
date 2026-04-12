# How to Use CONVERT_TZ() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Convert Tz, Timezone, Date Function, SQL

Description: Learn how to use MySQL's CONVERT_TZ() function to convert datetime values between time zones, with setup instructions and practical examples.

---

## Overview

`CONVERT_TZ()` converts a `DATETIME` value from one time zone to another. It is essential for applications that store UTC in the database but need to display local times, or for multi-region systems where users are spread across multiple time zones.

## Basic Syntax

```sql
CONVERT_TZ(dt, from_tz, to_tz)
```

- `dt` - a `DATETIME` value
- `from_tz` - the time zone of the input value (name or offset string like `'+05:30'`)
- `to_tz` - the target time zone

Returns `NULL` if any argument is `NULL` or if the time zone is unknown.

## Using Offset Strings

Offset strings work without any additional setup:

```sql
-- UTC to UTC+5:30 (India)
SELECT CONVERT_TZ('2024-06-15 12:00:00', '+00:00', '+05:30');  -- 2024-06-15 17:30:00

-- UTC to UTC-5 (US Eastern Standard Time)
SELECT CONVERT_TZ('2024-06-15 12:00:00', '+00:00', '-05:00');  -- 2024-06-15 07:00:00

-- New York to London (both as offsets)
SELECT CONVERT_TZ('2024-06-15 08:00:00', '-04:00', '+01:00');  -- 2024-06-15 13:00:00
```

## Using Named Time Zones

Named time zones require the MySQL time zone tables to be populated. Load them with:

```bash
mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root -p mysql
```

Then use named zones:

```sql
-- UTC to US/Eastern
SELECT CONVERT_TZ('2024-06-15 12:00:00', 'UTC', 'America/New_York');  -- 2024-06-15 08:00:00

-- UTC to Tokyo
SELECT CONVERT_TZ('2024-06-15 12:00:00', 'UTC', 'Asia/Tokyo');        -- 2024-06-15 21:00:00

-- Sydney to UTC
SELECT CONVERT_TZ('2024-06-15 22:00:00', 'Australia/Sydney', 'UTC');  -- 2024-06-15 12:00:00
```

## Converting Stored UTC to User Local Time

```sql
-- Store all datetimes in UTC and convert on SELECT
SELECT
  order_id,
  CONVERT_TZ(created_at, 'UTC', user_timezone) AS local_time
FROM orders
JOIN users USING (user_id);

-- Example with a hardcoded timezone
SELECT
  id,
  CONVERT_TZ(created_at, '+00:00', '+08:00') AS singapore_time
FROM events;
```

## Bulk Update: Correcting Stored Timestamps

```sql
-- If timestamps were accidentally stored in local time and should be UTC
UPDATE orders
SET created_at = CONVERT_TZ(created_at, 'America/New_York', 'UTC')
WHERE created_at >= '2024-01-01';
```

## Handling Daylight Saving Time

Named time zones handle DST automatically; offsets do not:

```sql
-- New York is UTC-5 in winter and UTC-4 in summer
-- Using named zone handles the transition automatically
SELECT CONVERT_TZ('2024-03-09 07:00:00', 'UTC', 'America/New_York'); -- 2024-03-09 02:00:00 (EST, UTC-5)
SELECT CONVERT_TZ('2024-03-10 07:00:00', 'UTC', 'America/New_York'); -- 2024-03-10 03:00:00 (EDT, UTC-4)

-- Using a fixed offset would be wrong for summer dates
SELECT CONVERT_TZ('2024-07-15 12:00:00', '+00:00', '-05:00');  -- incorrect for EDT
```

## Filtering by Local Time

```sql
-- Find orders placed between 9am and 5pm New York time
SELECT * FROM orders
WHERE CONVERT_TZ(created_at, 'UTC', 'America/New_York')
  BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-%d 09:00:00')
      AND DATE_FORMAT(CURDATE(), '%Y-%m-%d 17:00:00');
```

## Verifying Time Zone Table Setup

```sql
-- Check if time zone tables are populated
SELECT COUNT(*) FROM mysql.time_zone_name;

-- List available named time zones
SELECT Name FROM mysql.time_zone_name LIMIT 20;
```

## Summary

`CONVERT_TZ()` converts datetime values between time zones using either named zones (which handle DST automatically) or fixed UTC offset strings (which do not). Named zones require loading MySQL's time zone tables via `mysql_tzinfo_to_sql`. The best practice is to store all datetimes as UTC and use `CONVERT_TZ()` at query time to display local times for each user.
