# How to Handle Time Zones in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Time Zone, DateTime, UTC, Database Configuration

Description: Learn how to configure and work with time zones in MySQL, including setting session time zones, using CONVERT_TZ(), and storing timestamps correctly.

---

## Overview

Handling time zones correctly in MySQL is critical for applications that serve users across different regions. MySQL stores time zone information in the `mysql.time_zone*` system tables and provides functions to convert between time zones. Getting this right prevents subtle bugs in reports, scheduled jobs, and user-facing date displays.

## Understanding MySQL Time Zone Levels

MySQL time zone settings work at three levels:

- **Server time zone** - set at startup via `--default-time-zone` or in `my.cnf`
- **Global time zone** - can be changed at runtime by a user with `SYSTEM_VARIABLES_ADMIN`
- **Session time zone** - affects the current connection only

```sql
-- View current time zone settings
SELECT @@global.time_zone, @@session.time_zone, @@system_time_zone;
```

## Setting the Session Time Zone

```sql
-- Set time zone to UTC using offset syntax (no time zone tables needed)
SET time_zone = '+00:00';

-- Set to a named zone (requires populated time zone tables)
SET time_zone = 'UTC';
SET time_zone = 'America/New_York';
SET time_zone = 'Europe/London';
```

## Setting the Global Time Zone

```sql
-- Set globally (affects new connections, not current session)
SET GLOBAL time_zone = 'UTC';
```

To persist this across restarts, add to `my.cnf`:

```text
[mysqld]
default-time-zone = 'UTC'
```

## Populating the Time Zone Tables

Named time zones like `America/New_York` require the MySQL time zone tables to be populated. On Linux/macOS, use `mysql_tzinfo_to_sql`:

```bash
mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root -p mysql
```

On Windows, download the pre-built zip from the MySQL downloads page and import it.

After populating:

```sql
-- Verify named zones are available
SELECT * FROM mysql.time_zone_name LIMIT 10;
```

## TIMESTAMP vs DATETIME Behavior

This is the most important distinction in MySQL time zone handling:

- `TIMESTAMP` columns are stored internally as UTC and converted to the session time zone on retrieval
- `DATETIME` columns store the literal value you provide - no time zone conversion happens

```sql
CREATE TABLE tz_demo (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  ts_col     TIMESTAMP,
  dt_col     DATETIME
);

SET time_zone = 'America/New_York';
INSERT INTO tz_demo (ts_col, dt_col) VALUES (NOW(), NOW());

-- Query in New York time zone
SELECT ts_col, dt_col FROM tz_demo;
-- Both show the same value (Eastern time)

-- Switch to UTC
SET time_zone = 'UTC';
SELECT ts_col, dt_col FROM tz_demo;
-- ts_col shifts by +4 or +5 hours (UTC, depending on DST), dt_col stays the same
```

## Using CONVERT_TZ()

`CONVERT_TZ(dt, from_tz, to_tz)` converts a datetime value between two time zones:

```sql
-- Convert a stored UTC datetime to Eastern time for display
SELECT
  order_id,
  CONVERT_TZ(created_at, 'UTC', 'America/New_York') AS local_time
FROM orders;

-- Convert using offset syntax (no named zone tables needed)
SELECT CONVERT_TZ('2025-06-15 14:00:00', '+00:00', '-05:00');
-- Returns: 2025-06-15 09:00:00
```

## Best Practice: Store Everything in UTC

The most reliable strategy is to always store timestamps in UTC and convert to local time only in the application or at query time:

```sql
-- Ensure server uses UTC
SET GLOBAL time_zone = 'UTC';

-- Always insert in UTC
INSERT INTO events (title, event_time)
VALUES ('Launch', UTC_TIMESTAMP());

-- Convert to user's local time when querying
SELECT
  title,
  CONVERT_TZ(event_time, 'UTC', 'America/Los_Angeles') AS user_local_time
FROM events;
```

## Filtering Dates Across Time Zones

When filtering by date, be aware that the "same day" in UTC may span different calendar days in local time:

```sql
-- Get all orders placed on 2025-06-15 in Pacific time
SELECT *
FROM orders
WHERE created_at >= CONVERT_TZ('2025-06-15 00:00:00', 'America/Los_Angeles', 'UTC')
  AND created_at <  CONVERT_TZ('2025-06-16 00:00:00', 'America/Los_Angeles', 'UTC');
```

## Practical Example: Storing and Displaying User Events

```sql
-- Table with UTC storage
CREATE TABLE user_events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  event_type  VARCHAR(50),
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert (server is UTC)
INSERT INTO user_events (user_id, event_type) VALUES (42, 'login');

-- Query with user's time zone as a parameter
SET @user_tz = 'America/Chicago';

SELECT
  user_id,
  event_type,
  CONVERT_TZ(occurred_at, 'UTC', @user_tz) AS local_time
FROM user_events
WHERE user_id = 42;
```

## Checking for DST Issues

Daylight Saving Time transitions create ambiguous or non-existent local times. During a spring-forward gap, a local time like 2:30 AM simply does not exist. During a fall-back overlap, a local time like 1:30 AM occurs twice. CONVERT_TZ() handles these based on the loaded zone data:

```sql
-- 2:30 AM Eastern on March 9, 2025 falls in the spring-forward gap (2:00 AM jumps to 3:00 AM)
-- MySQL resolves this using the pre-transition (standard time) offset rather than returning NULL
SELECT CONVERT_TZ('2025-03-09 02:30:00', 'America/New_York', 'UTC');
-- Returns a result (the gap time is interpreted as EST, i.e. UTC-5)
```

CONVERT_TZ() returns NULL when arguments are NULL or when named time zones are not found in the time zone tables - not because of DST gaps. Always test edge cases around DST transition dates (March and November in North America).

## Summary

MySQL time zones operate at server, global, and session levels. The key rule is to prefer `TIMESTAMP` columns for event times because MySQL automatically converts them to UTC on write and back to the session time zone on read, while `DATETIME` columns store literal values with no conversion. The safest strategy is to configure MySQL to use UTC globally, insert all times as UTC, and use `CONVERT_TZ()` at query time to present dates in the user's local time zone.
