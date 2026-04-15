# How to Create Temporary Tables in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, Temporary Table, Session

Description: Learn how to create session-scoped temporary tables in ClickHouse using the Memory engine for intermediate query results and short-lived data.

---

Temporary tables in ClickHouse exist only for the duration of the session that created them. They are automatically dropped when the session ends, making them ideal for storing intermediate results, staging data during a multi-step pipeline, or caching small lookup sets within a single connection.

## CREATE TEMPORARY TABLE Syntax

```sql
CREATE TEMPORARY TABLE name
(
    column_name data_type [DEFAULT expression],
    ...
)
[ENGINE = engine]
```

The default engine for temporary tables is `Memory`. If no engine is specified, ClickHouse uses the Memory engine. Temporary tables support any table engine except Replicated and KeeperMap engines.

## Basic Example

```sql
-- Create a temporary table
CREATE TEMPORARY TABLE temp_active_users
(
    user_id    UInt64,
    last_seen  DateTime
);

-- Insert data into it
INSERT INTO temp_active_users
SELECT user_id, max(created_at)
FROM events
WHERE created_at >= now() - INTERVAL 7 DAY
GROUP BY user_id;

-- Use it in subsequent queries within the same session
SELECT u.user_id, u.email, t.last_seen
FROM users AS u
INNER JOIN temp_active_users AS t ON u.user_id = t.user_id
ORDER BY t.last_seen DESC;
```

## Explicitly Specifying the Memory Engine

```sql
CREATE TEMPORARY TABLE staging_data
ENGINE = Memory
AS
SELECT *
FROM raw_events
WHERE status = 'pending';
```

## Session-Scoped Lifecycle

Temporary tables are invisible to other sessions and connections:

```sql
-- Session A creates a temporary table
CREATE TEMPORARY TABLE session_cache (id UInt64, value String);
INSERT INTO session_cache VALUES (1, 'hello'), (2, 'world');

-- Session B cannot see it:
-- SELECT * FROM session_cache;
-- DB::Exception: Table default.session_cache doesn't exist.

-- When Session A closes, session_cache is automatically dropped
```

## Shadowing Permanent Tables

If a temporary table has the same name as a permanent table, the temporary table takes precedence in the current session:

```sql
-- Permanent table already exists: default.events
-- Temporary table shadows it for this session
CREATE TEMPORARY TABLE events
(
    event_id UInt64,
    name     String
);

-- This query reads from the TEMPORARY table, not the permanent one
SELECT * FROM events;
```

Use distinct names to avoid confusion in production scripts.

## Multi-Step ETL with Temporary Tables

```sql
-- Step 1: filter and stage raw input
CREATE TEMPORARY TABLE raw_stage AS
SELECT *
FROM raw_log_import
WHERE level IN ('ERROR', 'WARN')
  AND timestamp >= today();

-- Step 2: enrich with a lookup
CREATE TEMPORARY TABLE enriched_stage AS
SELECT
    r.timestamp,
    r.service,
    r.level,
    r.message,
    s.team_name
FROM raw_stage AS r
LEFT JOIN service_owners AS s ON r.service = s.service_name;

-- Step 3: write enriched data to the permanent table
INSERT INTO alert_log
SELECT * FROM enriched_stage;
```

## Viewing Temporary Tables in the Current Session

```sql
-- List temporary tables for the current session
SELECT name, engine, total_rows, total_bytes
FROM system.tables
WHERE is_temporary = 1;
```

## Limitations

Temporary tables in ClickHouse have several important constraints:

- The default engine is `Memory`, which stores data only in RAM. Other engines (except Replicated and KeeperMap) are also supported.
- They are not replicated and do not persist across restarts.
- They cannot be shared between sessions.
- When using the default Memory engine, `PARTITION BY`, `TTL`, and secondary indexes are not supported.
- `SHOW TABLES` in another session will not list them.

For datasets larger than available RAM, use a regular MergeTree table with a short TTL or a dedicated staging database instead.

## Dropping a Temporary Table Manually

```sql
-- Drop before the session ends if no longer needed
DROP TEMPORARY TABLE IF EXISTS temp_active_users;

-- Or use the standard DROP TABLE (works for temporary tables too)
DROP TABLE IF EXISTS temp_active_users;
```

## Summary

Temporary tables in ClickHouse are session-scoped Memory-engine tables that are created and destroyed within a single connection. They are useful for intermediate query results, multi-step ETL staging, and small lookup caches. Because they live only in RAM and disappear when the session closes, they require no cleanup and never affect other sessions or persistent storage.
