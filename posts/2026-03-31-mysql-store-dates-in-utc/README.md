# How to Store Dates in UTC in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Time Zone, Database, Best Practice

Description: Learn best practices for storing all dates and timestamps in UTC in MySQL, including column choice, server configuration, and application-level patterns.

---

## Why Store Dates in UTC

Storing timestamps in UTC is the standard practice for multi-region applications. UTC never observes daylight saving time, so arithmetic over stored values is always unambiguous. When you need to display a time in a user's local zone, convert at read time in the application layer or at the database query level. Never store local times - they create ambiguity during DST transitions.

## Configuring the Server to Use UTC

Set the MySQL server time zone to UTC so that `NOW()`, `CURRENT_TIMESTAMP`, and automatic column defaults always produce UTC values:

```text
[mysqld]
default-time-zone = '+00:00'
```

Restart MySQL after the change:

```bash
sudo systemctl restart mysql
```

Verify:

```sql
SELECT @@global.time_zone, NOW(), UTC_TIMESTAMP();
-- UTC  |  same value  |  same value
```

## Choosing the Right Column Type

`TIMESTAMP` columns store values as UTC internally and convert them to the session time zone on retrieval. `DATETIME` columns store the literal value with no conversion.

For maximum portability, use `DATETIME` with explicit UTC values rather than relying on `TIMESTAMP` conversion:

```sql
CREATE TABLE events (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  updated_at DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP())
                      ON UPDATE CURRENT_TIMESTAMP
);
```

Using `DATETIME` means the value is always what you stored - no silent conversion when the session time zone changes.

## Inserting UTC Values

Always insert UTC values, even when the application server is in a local time zone:

```sql
-- Explicit UTC insert
INSERT INTO events (name, created_at, updated_at)
VALUES ('Launch', UTC_TIMESTAMP(), UTC_TIMESTAMP());

-- Or use NOW() if the server is already set to UTC
INSERT INTO events (name, created_at, updated_at)
VALUES ('Deploy', NOW(), NOW());
```

From application code, convert to UTC before executing the query. For example in Python:

```python
import datetime

utc_now = datetime.datetime.now(datetime.timezone.utc)
cursor.execute(
    "INSERT INTO events (name, created_at, updated_at) VALUES (%s, %s, %s)",
    ("Signup", utc_now, utc_now)
)
```

## Reading and Converting to Local Time

Convert UTC values to a local time zone at query time using `CONVERT_TZ()`:

```sql
-- Display created_at in Eastern Time
SELECT
  name,
  CONVERT_TZ(created_at, 'UTC', 'America/New_York') AS created_eastern
FROM events;
```

This keeps the stored value in UTC while giving users times in their own zone.

## Verifying UTC Storage

After inserting, confirm the stored value is UTC by comparing it with `UTC_TIMESTAMP()`:

```sql
SELECT
  id,
  created_at,
  UTC_TIMESTAMP() AS now_utc,
  TIMEDIFF(UTC_TIMESTAMP(), created_at) AS offset
FROM events
ORDER BY created_at DESC
LIMIT 5;
```

An offset of `00:00:00` confirms the stored value matches UTC.

## Avoiding TIMESTAMP Pitfalls

`TIMESTAMP` columns silently convert on read based on the session time zone. If a client connects with a different `time_zone` session variable, it reads a different value from the same row:

```sql
SET time_zone = 'America/New_York';
SELECT created_at FROM events LIMIT 1;  -- shows Eastern time

SET time_zone = 'UTC';
SELECT created_at FROM events LIMIT 1;  -- shows UTC
```

To avoid this unpredictability in heterogeneous environments, prefer `DATETIME` with the UTC value stored explicitly.

## Summary

Store all timestamps as UTC by setting `default-time-zone = '+00:00'` in `my.cnf`, using `DATETIME` columns with `UTC_TIMESTAMP()` defaults, and inserting UTC values from application code. Convert to local time zones at read time using `CONVERT_TZ()`. Avoid relying on `TIMESTAMP` auto-conversion when multiple clients may connect with different session time zones.
