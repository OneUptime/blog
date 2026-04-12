# How to Choose Between DATETIME and TIMESTAMP in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Type, DateTime, Timestamp, Timezone

Description: Understand the key differences between MySQL DATETIME and TIMESTAMP, including timezone handling, range, storage size, and when to use each type.

---

MySQL provides two types for storing date-and-time values: `DATETIME` and `TIMESTAMP`. They look similar but behave differently in important ways. Choosing the wrong type can lead to silent data corruption when servers change timezones or when dates extend beyond the year 2038.

## Core Differences at a Glance

```text
Feature          DATETIME                    TIMESTAMP
Storage          5 bytes (8 before 5.6.4)    4 bytes
Range            1000-01-01 to 9999-12-31    1970-01-01 to 2038-01-19
Timezone         No conversion               Stored as UTC, displayed in session tz
NULL default     NULL (no auto-update)       Can auto-update on INSERT/UPDATE
Index range      Full range                  Limited to UNIX epoch range
```

## TIMESTAMP: Timezone-Aware, Smaller Range

`TIMESTAMP` converts the value to UTC on insert and back to the session timezone on retrieval. This is useful for logging events that need to be consistent across multiple timezones.

```sql
CREATE TABLE user_sessions (
    session_id  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- The displayed value shifts when the session timezone changes
SET time_zone = 'America/New_York';
INSERT INTO user_sessions (user_id) VALUES (1);

SET time_zone = 'Asia/Tokyo';
SELECT created_at FROM user_sessions WHERE session_id = 1;
-- Returns the same moment in time, displayed as Tokyo time
```

The hard upper limit of `2038-01-19 03:14:07 UTC` is the UNIX 32-bit overflow. Any application that must store dates beyond 2038 cannot use `TIMESTAMP`.

## DATETIME: Timezone-Agnostic, Wider Range

`DATETIME` stores the literal value you provide with no timezone conversion. It is better for birthdays, scheduled events, or any value where the local wall-clock time is what matters regardless of server timezone.

```sql
CREATE TABLE appointments (
    appointment_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    patient_id     INT UNSIGNED NOT NULL,
    scheduled_at   DATETIME NOT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO appointments (patient_id, scheduled_at)
VALUES (42, '2035-06-15 09:30:00');

-- Value is returned exactly as stored, no TZ conversion
SELECT scheduled_at FROM appointments WHERE appointment_id = 1;
```

## Fractional Seconds

Both types support fractional seconds up to microsecond precision using `(fsp)` notation.

```sql
CREATE TABLE api_requests (
    request_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    received_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    processed_at DATETIME(3)
);
```

## Automatic Initialization and Update

Only `TIMESTAMP` columns (and `DATETIME` in MySQL 5.6.5+) support `DEFAULT CURRENT_TIMESTAMP` and `ON UPDATE CURRENT_TIMESTAMP`.

```sql
CREATE TABLE audit_log (
    log_id     INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(64) NOT NULL,
    action     ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Decision Guide

```text
Use TIMESTAMP when:
- You need automatic UTC storage and timezone-aware retrieval
- The date range is within 1970-2038
- You want smaller storage (4 bytes vs 5 bytes)
- You are recording when something happened (audit, logging)

Use DATETIME when:
- Dates extend beyond 2038-01-19
- Timezone conversion would be incorrect (calendar events, birthdays)
- You are scheduling future events far in advance
- You need consistent values regardless of server timezone changes
```

## Common Pitfalls

```sql
-- Pitfall 1: Out-of-range TIMESTAMP values cause an error in strict mode (default in MySQL 5.7+)
-- Pitfall 2: Changing server timezone changes all TIMESTAMP display values
-- Pitfall 3: Comparing TIMESTAMP across timezone changes can cause off-by-hour bugs

-- Safe: explicit timezone handling with CONVERT_TZ for cross-zone comparisons
SELECT CONVERT_TZ(created_at, 'UTC', 'America/Chicago') AS local_time
FROM user_sessions;
```

## Summary

Use `TIMESTAMP` for lightweight audit fields and event logging where UTC storage and automatic updates are valuable, and dates stay within the 2038 boundary. Use `DATETIME` for application-level date values like scheduled events or birthdays where you want the literal value preserved with no timezone conversion and need dates beyond 2038.
