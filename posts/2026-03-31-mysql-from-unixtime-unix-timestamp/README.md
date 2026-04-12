# How to Use FROM_UNIXTIME() and UNIX_TIMESTAMP() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Date Function, Unix Timestamp, Database

Description: Learn how to use MySQL FROM_UNIXTIME() and UNIX_TIMESTAMP() to convert between Unix epoch timestamps and MySQL datetime values.

---

## Overview

Unix timestamps represent a point in time as the number of seconds (or fractional seconds) elapsed since January 1, 1970 00:00:00 UTC. MySQL provides two complementary functions for working with them:

- `UNIX_TIMESTAMP()` - converts a MySQL datetime to a Unix timestamp integer.
- `FROM_UNIXTIME()` - converts a Unix timestamp integer back to a MySQL datetime.

---

## UNIX_TIMESTAMP() Function

**Syntax:**

```sql
UNIX_TIMESTAMP()
UNIX_TIMESTAMP(date)
```

- Called with no arguments: returns the current Unix timestamp.
- Called with a `DATE`, `DATETIME`, or `TIMESTAMP` value: converts it to a Unix timestamp.
- Interprets the date argument in the current session time zone.
- Returns `0` or `NULL` for invalid dates.

### Basic Examples

```sql
SELECT UNIX_TIMESTAMP();
-- Returns: current epoch (e.g., 1774915200)

SELECT UNIX_TIMESTAMP('2026-03-31 00:00:00');
-- Returns: epoch integer for that datetime

SELECT UNIX_TIMESTAMP('1970-01-01 00:00:00');
-- Returns: 0  (epoch origin)

SELECT UNIX_TIMESTAMP('2038-01-19 03:14:07');
-- Returns: 2147483647 (Unix 32-bit max)

SELECT UNIX_TIMESTAMP(NULL);
-- Returns: NULL
```

---

## FROM_UNIXTIME() Function

**Syntax:**

```sql
FROM_UNIXTIME(unix_timestamp)
FROM_UNIXTIME(unix_timestamp, format)
```

- Converts a Unix timestamp to a `DATETIME` value.
- Accepts an optional `format` string (same format as `DATE_FORMAT()`).
- Returns `NULL` if the timestamp is `NULL` or out of range.

### Basic Examples

```sql
SELECT FROM_UNIXTIME(0);
-- Returns: '1970-01-01 00:00:00'  (in local time)

SELECT FROM_UNIXTIME(1774915200);
-- Returns: corresponding DATETIME

SELECT FROM_UNIXTIME(1774915200, '%Y-%m-%d');
-- Returns: date portion formatted as a string

SELECT FROM_UNIXTIME(1774915200, '%W, %M %d, %Y %H:%i');
-- Returns: 'Tuesday, March 31, 2026 00:00'

SELECT FROM_UNIXTIME(NULL);
-- Returns: NULL
```

---

## How They Relate

```mermaid
flowchart LR
    A["MySQL DATETIME\n'2026-03-31 14:30:00'"] -->|UNIX_TIMESTAMP()| B["Unix epoch integer\n1774967400"]
    B -->|FROM_UNIXTIME()| C["MySQL DATETIME\n'2026-03-31 14:30:00'"]
```

---

## Fractional Seconds (Sub-second Precision)

```sql
-- Current timestamp with microseconds
SELECT UNIX_TIMESTAMP(NOW(6));
-- Returns: float with 6 decimal places, e.g., 1774915200.123456

SELECT FROM_UNIXTIME(1774915200.500);
-- Returns: '2026-03-31 00:00:00.500000'
```

---

## Time Zone Behavior

`UNIX_TIMESTAMP()` and `FROM_UNIXTIME()` are sensitive to the session time zone:

```sql
SET time_zone = 'UTC';
SELECT FROM_UNIXTIME(0);
-- Returns: '1970-01-01 00:00:00'

SET time_zone = 'America/New_York';
SELECT FROM_UNIXTIME(0);
-- Returns: '1969-12-31 19:00:00'  (UTC-5 offset)

-- Always use UTC to avoid ambiguity
SET time_zone = '+00:00';
SELECT UNIX_TIMESTAMP('2026-03-31 00:00:00');
```

---

## Storing and Querying by Unix Timestamp

```sql
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(100),
    event_epoch BIGINT UNSIGNED
);

INSERT INTO events (event_name, event_epoch) VALUES
('Launch', UNIX_TIMESTAMP('2026-03-31 09:00:00')),
('Webinar', UNIX_TIMESTAMP('2026-04-05 14:00:00'));

-- Query events in the next 7 days
SELECT
    event_name,
    FROM_UNIXTIME(event_epoch)                              AS event_datetime,
    FROM_UNIXTIME(event_epoch, '%b %d, %Y %H:%i')          AS formatted
FROM events
WHERE event_epoch BETWEEN UNIX_TIMESTAMP() AND UNIX_TIMESTAMP() + 7 * 86400;
```

---

## Calculating Elapsed Time

```sql
-- Seconds elapsed since a given event
SELECT
    event_name,
    UNIX_TIMESTAMP() - event_epoch AS seconds_elapsed,
    (UNIX_TIMESTAMP() - event_epoch) / 3600 AS hours_elapsed
FROM events;
```

---

## Converting Log File Timestamps

Applications often log events as Unix timestamps. Use `FROM_UNIXTIME()` to make them readable:

```sql
CREATE TABLE app_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level VARCHAR(10),
    message TEXT,
    created_epoch INT UNSIGNED
);

SELECT
    level,
    message,
    FROM_UNIXTIME(created_epoch) AS log_time
FROM app_logs
WHERE created_epoch >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 1 HOUR))
ORDER BY created_epoch DESC;
```

---

## Unix Timestamp Range

```sql
-- Minimum: Jan 1, 1970
SELECT FROM_UNIXTIME(0);

-- 32-bit max (year 2038 problem)
SELECT FROM_UNIXTIME(2147483647);
-- Returns: '2038-01-19 03:14:07'

-- MySQL supports larger values as BIGINT
SELECT FROM_UNIXTIME(32503680000);
-- Returns: '3000-01-01 00:00:00' (if within MySQL DATETIME range)
```

---

## UNIX_TIMESTAMP() vs CONVERT_TZ()

```sql
-- Convert a UTC datetime to Unix timestamp, then to local time
SELECT
    FROM_UNIXTIME(UNIX_TIMESTAMP('2026-03-31 14:00:00')) AS local_time,
    CONVERT_TZ('2026-03-31 14:00:00', 'UTC', 'US/Eastern') AS east_coast_time;
```

---

## Summary

`UNIX_TIMESTAMP()` and `FROM_UNIXTIME()` bridge the gap between Unix epoch integers and MySQL datetime values. `UNIX_TIMESTAMP()` converts a MySQL datetime to an epoch integer, while `FROM_UNIXTIME()` converts back, optionally formatting the result with a date format string. Both functions are time-zone aware, so always ensure the session time zone is consistent when storing or comparing Unix timestamps. For high-precision timing, use the fractional seconds form with `NOW(6)` and `UNIX_TIMESTAMP(NOW(6))`.
