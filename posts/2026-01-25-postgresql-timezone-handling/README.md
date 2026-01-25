# How to Work with Timezones in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Timezones, TIMESTAMP, Date Time, UTC, Database Design

Description: Learn how to properly handle timezones in PostgreSQL. This guide covers timestamp types, timezone conversions, session settings, and best practices for global applications.

---

Timezone handling is one of the most error-prone areas in database development. PostgreSQL provides robust timezone support, but misunderstanding its behavior leads to subtle bugs that only surface when users span multiple time zones. This guide explains how PostgreSQL handles time and how to design your schema for correct timezone behavior.

## Understanding PostgreSQL Timestamp Types

PostgreSQL offers two timestamp types with fundamentally different behaviors.

```sql
-- TIMESTAMP WITHOUT TIME ZONE (alias: TIMESTAMP)
-- Stores the literal date and time with no timezone information
CREATE TABLE events_naive (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(100),
    event_time TIMESTAMP  -- No timezone awareness
);

-- TIMESTAMP WITH TIME ZONE (alias: TIMESTAMPTZ)
-- Stores time internally as UTC, displays in session timezone
CREATE TABLE events_aware (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(100),
    event_time TIMESTAMPTZ  -- Timezone aware
);
```

The key difference: `TIMESTAMPTZ` converts input to UTC for storage and converts back to the session timezone for display. `TIMESTAMP` stores the literal value without any conversion.

## How TIMESTAMPTZ Storage Works

When you insert a value into a `TIMESTAMPTZ` column, PostgreSQL converts it to UTC.

```sql
-- Set session timezone to New York
SET timezone = 'America/New_York';

-- Insert a time with explicit timezone
INSERT INTO events_aware (event_name, event_time)
VALUES ('Meeting', '2026-01-25 14:00:00-05');

-- The value is stored as UTC internally (19:00:00 UTC)
-- When retrieved, it displays in the session timezone

-- Change session to Los Angeles
SET timezone = 'America/Los_Angeles';

-- Same row now displays as 11:00:00 (Pacific time)
SELECT event_name, event_time FROM events_aware;
-- Result: Meeting | 2026-01-25 11:00:00-08
```

## TIMESTAMP WITHOUT TIME ZONE Behavior

The `TIMESTAMP` type stores exactly what you give it, ignoring any timezone information.

```sql
SET timezone = 'America/New_York';

-- Insert with explicit timezone (timezone is stripped and ignored)
INSERT INTO events_naive (event_name, event_time)
VALUES ('Meeting', '2026-01-25 14:00:00-05');

-- The value 14:00:00 is stored as-is

SET timezone = 'America/Los_Angeles';

-- Still shows 14:00:00 regardless of session timezone
SELECT event_name, event_time FROM events_naive;
-- Result: Meeting | 2026-01-25 14:00:00
```

## Best Practice: Always Use TIMESTAMPTZ

For most applications, `TIMESTAMPTZ` is the correct choice. It ensures consistent behavior across different client timezones.

```sql
-- Recommended schema for time tracking
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    performed_by VARCHAR(50),
    performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- CURRENT_TIMESTAMP returns TIMESTAMPTZ in UTC
    details JSONB
);

-- All clients see the correct local time regardless of their timezone
INSERT INTO audit_log (action, performed_by)
VALUES ('user_login', 'jsmith');
```

## Converting Between Timezones

PostgreSQL provides the `AT TIME ZONE` operator for timezone conversions.

```sql
-- Convert TIMESTAMPTZ to a specific timezone (returns TIMESTAMP)
SELECT
    event_time,
    event_time AT TIME ZONE 'America/New_York' AS ny_time,
    event_time AT TIME ZONE 'Europe/London' AS london_time,
    event_time AT TIME ZONE 'Asia/Tokyo' AS tokyo_time
FROM events_aware;

-- Convert TIMESTAMP to TIMESTAMPTZ by specifying its source timezone
SELECT
    event_time,
    event_time AT TIME ZONE 'America/New_York' AS interpreted_as_ny
FROM events_naive;
```

The behavior of `AT TIME ZONE` differs based on the input type:

```sql
-- TIMESTAMPTZ AT TIME ZONE 'X' -> returns TIMESTAMP in timezone X
-- TIMESTAMP AT TIME ZONE 'X' -> returns TIMESTAMPTZ treating input as timezone X
```

## Working with UTC

Storing and retrieving times in UTC provides the most predictable behavior.

```sql
-- Set session to UTC for consistent handling
SET timezone = 'UTC';

-- Insert times explicitly in UTC
INSERT INTO events_aware (event_name, event_time)
VALUES ('Deployment', '2026-01-25 18:00:00+00');

-- Or use the UTC timezone specifier
INSERT INTO events_aware (event_name, event_time)
VALUES ('Backup', TIMESTAMP '2026-01-25 18:00:00' AT TIME ZONE 'UTC');

-- Retrieve times in UTC regardless of user timezone
SELECT
    event_name,
    event_time AT TIME ZONE 'UTC' AS utc_time
FROM events_aware;
```

## Server and Session Timezone Settings

PostgreSQL has multiple timezone settings that affect behavior.

```sql
-- View the server's default timezone
SHOW timezone;

-- View available timezones
SELECT name FROM pg_timezone_names ORDER BY name LIMIT 20;

-- Set session timezone (affects current connection only)
SET timezone = 'Europe/Paris';

-- Set timezone for a single transaction
BEGIN;
SET LOCAL timezone = 'Asia/Singapore';
SELECT CURRENT_TIMESTAMP;
COMMIT;
-- Timezone reverts after transaction

-- Set default timezone in postgresql.conf
-- timezone = 'UTC'
```

## Timezone-Aware Queries

When filtering by time, be explicit about timezones to avoid confusion.

```sql
-- Create an index for efficient time range queries
CREATE INDEX idx_events_time ON events_aware (event_time);

-- Query events in a specific timezone's business hours
SELECT * FROM events_aware
WHERE event_time AT TIME ZONE 'America/New_York'
    BETWEEN '2026-01-25 09:00:00' AND '2026-01-25 17:00:00';

-- Query events from the last 24 hours (timezone independent)
SELECT * FROM events_aware
WHERE event_time > CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- Query events on a specific calendar date in a specific timezone
SELECT * FROM events_aware
WHERE (event_time AT TIME ZONE 'America/New_York')::DATE = '2026-01-25';
```

## Handling Daylight Saving Time

PostgreSQL automatically handles DST transitions for named timezones.

```sql
-- Times around DST transition are handled correctly
SELECT
    ts,
    ts AT TIME ZONE 'America/New_York' AS ny_time
FROM generate_series(
    '2026-03-08 06:00:00+00'::timestamptz,
    '2026-03-08 10:00:00+00'::timestamptz,
    '1 hour'
) AS ts;

-- Result shows the spring-forward gap
-- 2026-03-08 01:00:00
-- 2026-03-08 03:00:00  -- 2:00 AM doesn't exist (clocks jump forward)
-- 2026-03-08 04:00:00
```

## Application-Level Best Practices

Design your application to work correctly with timezones.

```sql
-- Store user timezone preference
CREATE TABLE user_profiles (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    CONSTRAINT valid_timezone CHECK (
        timezone IN (SELECT name FROM pg_timezone_names)
    )
);

-- Function to get events in user's local timezone
CREATE OR REPLACE FUNCTION get_user_events(
    p_user_id INTEGER,
    p_date DATE
) RETURNS TABLE (
    event_name VARCHAR,
    local_time TIMESTAMP
) AS $$
DECLARE
    user_tz VARCHAR;
BEGIN
    SELECT timezone INTO user_tz
    FROM user_profiles WHERE user_id = p_user_id;

    RETURN QUERY
    SELECT
        e.event_name,
        (e.event_time AT TIME ZONE user_tz)::TIMESTAMP
    FROM events_aware e
    WHERE (e.event_time AT TIME ZONE user_tz)::DATE = p_date;
END;
$$ LANGUAGE plpgsql;
```

## Common Timezone Pitfalls

Avoid these frequent mistakes when working with PostgreSQL timezones.

```sql
-- WRONG: Comparing TIMESTAMPTZ with date string (implicit conversion issues)
SELECT * FROM events_aware WHERE event_time = '2026-01-25';

-- CORRECT: Be explicit about what you mean
SELECT * FROM events_aware
WHERE event_time >= '2026-01-25 00:00:00+00'
    AND event_time < '2026-01-26 00:00:00+00';

-- WRONG: Using TIMESTAMP when you need timezone awareness
CREATE TABLE scheduled_tasks (
    task_time TIMESTAMP  -- Which timezone is this?
);

-- CORRECT: Use TIMESTAMPTZ and store in UTC
CREATE TABLE scheduled_tasks (
    task_time TIMESTAMPTZ  -- Unambiguous UTC storage
);

-- WRONG: Mixing timezone-aware and naive timestamps
SELECT t1.event_time - t2.event_time  -- Undefined if types differ
FROM events_aware t1, events_naive t2;
```

## Generating Time Series Across Timezones

When generating reports, be mindful of timezone boundaries.

```sql
-- Generate hourly buckets in a specific timezone
SELECT
    date_trunc('hour', event_time AT TIME ZONE 'America/New_York') AS hour_bucket,
    COUNT(*) AS event_count
FROM events_aware
WHERE event_time >= '2026-01-25 00:00:00 America/New_York'
    AND event_time < '2026-01-26 00:00:00 America/New_York'
GROUP BY hour_bucket
ORDER BY hour_bucket;
```

Getting timezone handling right from the beginning saves countless hours of debugging. Use `TIMESTAMPTZ` by default, store in UTC, and convert to local time only at the presentation layer. This approach scales correctly as your application grows to serve users worldwide.
