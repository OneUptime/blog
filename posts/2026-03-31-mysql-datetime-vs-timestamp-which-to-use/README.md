# MySQL DATETIME vs TIMESTAMP: Which to Use

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DateTime, Timestamp

Description: Understand the key differences between MySQL DATETIME and TIMESTAMP data types including storage, timezone handling, range limits, and when to use each.

---

MySQL provides two similar date-time types: `DATETIME` and `TIMESTAMP`. They look similar but behave very differently in important ways. Choosing the wrong one leads to timezone bugs or range overflow issues in production.

## Storage Size

`DATETIME` and `TIMESTAMP` differ in base storage size, with additional bytes for fractional seconds precision.

- `TIMESTAMP`: 4 bytes, stores UTC epoch seconds
- `DATETIME`: 5-8 bytes, stores the literal date and time values

```sql
-- Both store the same visible value
CREATE TABLE events (
  ts_col TIMESTAMP,
  dt_col DATETIME
);

INSERT INTO events VALUES (NOW(), NOW());
SELECT * FROM events;
-- ts_col: 2026-03-31 10:00:00
-- dt_col: 2026-03-31 10:00:00
```

## Timezone Handling

This is the most important difference. `TIMESTAMP` stores values in UTC and converts them to the session's timezone on retrieval. `DATETIME` stores the literal value with no timezone conversion.

```sql
-- Demonstrate timezone difference
SET time_zone = 'America/New_York';
INSERT INTO events VALUES ('2026-03-31 10:00:00', '2026-03-31 10:00:00');

SET time_zone = 'UTC';
SELECT * FROM events;
-- ts_col: 2026-03-31 14:00:00  (converted from EDT to UTC)
-- dt_col: 2026-03-31 10:00:00  (unchanged - literal value)
```

This means `TIMESTAMP` correctly represents the same moment in time regardless of what timezone the session uses. `DATETIME` represents a wall-clock reading that is timezone-naive.

## Value Range

`TIMESTAMP` has a narrower range than `DATETIME`:

- `TIMESTAMP`: `1970-01-01 00:00:01` UTC to `2038-01-19 03:14:07` UTC (the year 2038 problem)
- `DATETIME`: `1000-01-01 00:00:00` to `9999-12-31 23:59:59`

```sql
-- TIMESTAMP cannot store dates before 1970 or after 2038
INSERT INTO historical_events (ts_col) VALUES ('1965-07-04 00:00:00');
-- ERROR: Out of range value for column 'ts_col'

-- DATETIME handles any date in that range
INSERT INTO historical_events (dt_col) VALUES ('1965-07-04 00:00:00');
-- OK
```

## Automatic Initialization and Update

`TIMESTAMP` columns can automatically set to the current time on insert or update:

```sql
CREATE TABLE records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  data TEXT
);
-- MySQL 5.6.5+ also supports DEFAULT CURRENT_TIMESTAMP for DATETIME
```

## Fractional Seconds

Both types support up to 6 digits of fractional seconds:

```sql
CREATE TABLE precise_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  occurred_at DATETIME(6),
  recorded_at TIMESTAMP(6)
);
INSERT INTO precise_events (occurred_at, recorded_at)
VALUES (NOW(6), NOW(6));
```

## When to Use Each

| Use Case | Recommended Type |
|---|---|
| Storing timestamps for events, logs, auditing | TIMESTAMP |
| Application needs timezone-aware storage | TIMESTAMP |
| Dates before 1970 or after 2038 | DATETIME |
| Calendar events tied to a wall-clock time | DATETIME |
| User-facing local date/time without timezone | DATETIME |

## Summary

Use `TIMESTAMP` for most event and audit timestamps where UTC correctness across timezones matters. Use `DATETIME` when you need dates outside the TIMESTAMP range (before 1970, after 2038) or when you want to store timezone-naive wall-clock values. For new applications, `TIMESTAMP` is the safer default for `created_at` and `updated_at` columns.
