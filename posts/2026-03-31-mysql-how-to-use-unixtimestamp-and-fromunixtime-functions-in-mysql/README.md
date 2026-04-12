# How to Use UNIX_TIMESTAMP() and FROM_UNIXTIME() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Unix Timestamp, From Unixtime, Epoch Time, Date Function

Description: Learn how to convert between MySQL datetime values and Unix epoch timestamps using UNIX_TIMESTAMP() and FROM_UNIXTIME() with practical examples.

---

## Overview

Unix timestamps represent dates and times as the number of seconds elapsed since January 1, 1970 UTC. MySQL provides `UNIX_TIMESTAMP()` to convert a datetime to a Unix timestamp and `FROM_UNIXTIME()` to convert in the opposite direction. These functions are essential for working with APIs, logs, and any system that stores time as an integer epoch.

## UNIX_TIMESTAMP() Syntax

```sql
UNIX_TIMESTAMP()             -- current time as Unix timestamp
UNIX_TIMESTAMP(datetime)     -- convert a datetime to Unix timestamp
```

## FROM_UNIXTIME() Syntax

```sql
FROM_UNIXTIME(unix_ts)             -- convert epoch to DATETIME
FROM_UNIXTIME(unix_ts, format)     -- convert epoch to formatted string
```

## Basic Examples

```sql
-- Current Unix timestamp
SELECT UNIX_TIMESTAMP();             -- e.g., 1718438400

-- Convert a datetime to Unix timestamp
SELECT UNIX_TIMESTAMP('2024-06-15 00:00:00');  -- 1718409600

-- Convert a Unix timestamp to DATETIME
SELECT FROM_UNIXTIME(1718409600);    -- 2024-06-15 00:00:00

-- Convert with custom format
SELECT FROM_UNIXTIME(1718409600, '%Y-%m-%d');  -- 2024-06-15
SELECT FROM_UNIXTIME(1718409600, '%d %M %Y');  -- 15 June 2024
```

## Storing Timestamps as Integers

```sql
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  epoch_time BIGINT UNSIGNED  -- Unix timestamp in seconds
);

INSERT INTO events (name, epoch_time)
VALUES ('Launch', UNIX_TIMESTAMP());

-- Query and display as human-readable datetime
SELECT name, FROM_UNIXTIME(epoch_time) AS event_datetime
FROM events;
```

## Filtering by Unix Timestamp Range

```sql
-- Events in the last 24 hours
SELECT * FROM events
WHERE epoch_time >= UNIX_TIMESTAMP() - 86400;

-- Events in a specific date range
SELECT * FROM events
WHERE epoch_time BETWEEN
  UNIX_TIMESTAMP('2024-06-01 00:00:00') AND
  UNIX_TIMESTAMP('2024-06-30 23:59:59');
```

## Millisecond and Microsecond Precision

```sql
-- MySQL 5.6+ supports fractional seconds
SELECT UNIX_TIMESTAMP(NOW(6));   -- e.g., 1718438400.123456 (microseconds)

-- Convert millisecond epoch (divide by 1000)
SELECT FROM_UNIXTIME(1718438400000 / 1000) AS from_ms;

-- Convert microsecond epoch (divide by 1000000)
SELECT FROM_UNIXTIME(1718438400123456 / 1000000) AS from_us;
```

## Converting Between Timezones

```sql
-- UNIX_TIMESTAMP() uses the server's time zone
-- Use CONVERT_TZ() before UNIX_TIMESTAMP() for explicit control
SELECT UNIX_TIMESTAMP(CONVERT_TZ('2024-06-15 00:00:00', 'America/New_York', 'UTC'));

-- FROM_UNIXTIME() always interprets in the server's local time zone
SELECT FROM_UNIXTIME(1718409600);  -- result depends on server TZ setting
```

## Practical Example: Log Processing

```sql
CREATE TABLE application_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  log_level VARCHAR(10),
  message TEXT,
  ts BIGINT UNSIGNED
);

-- Insert a log entry
INSERT INTO application_logs (log_level, message, ts)
VALUES ('ERROR', 'Disk full on /var', UNIX_TIMESTAMP());

-- Query logs from the last 1 hour with readable timestamps
SELECT
  id,
  log_level,
  message,
  FROM_UNIXTIME(ts) AS logged_at
FROM application_logs
WHERE ts >= UNIX_TIMESTAMP() - 3600
ORDER BY ts DESC;
```

## UNIX_TIMESTAMP() Range

```sql
-- UNIX_TIMESTAMP() supports dates from 1970-01-01 to 2038-01-19 03:14:07 UTC
-- This limit applies to all current MySQL versions (including 8.0+ on 64-bit systems)
SELECT UNIX_TIMESTAMP('2038-01-19 03:14:07');  -- 2147483647 (max 32-bit)
SELECT FROM_UNIXTIME(2147483647);              -- 2038-01-19 03:14:07
```

## Summary

`UNIX_TIMESTAMP()` converts MySQL datetime values to integer epoch seconds (and `FROM_UNIXTIME()` reverses the conversion). They are essential when integrating MySQL with systems that use epoch time, such as application logs, REST APIs, and analytics pipelines. For sub-second precision, use MySQL's fractional seconds support and divide or multiply by the appropriate power of 10.
