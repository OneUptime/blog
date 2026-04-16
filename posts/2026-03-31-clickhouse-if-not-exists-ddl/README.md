# How to Use IF NOT EXISTS in ClickHouse DDL Statements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, IF NOT EXISTS

Description: Learn how to use IF NOT EXISTS in ClickHouse DDL to write idempotent scripts for tables, databases, views, and users without errors on re-runs.

---

Idempotent DDL is a best practice for deployment scripts, migrations, and CI pipelines. ClickHouse provides `IF NOT EXISTS` on most `CREATE` statements to skip creation silently when the object already exists, and `OR REPLACE` as an alternative that recreates the object unconditionally.

## IF NOT EXISTS in CREATE DATABASE

```sql
-- Creates the database only if it does not already exist
CREATE DATABASE IF NOT EXISTS analytics;

-- Without IF NOT EXISTS, re-running raises an error:
-- DB::Exception: Database analytics already exists.
CREATE DATABASE analytics;
```

## IF NOT EXISTS in CREATE TABLE

```sql
CREATE TABLE IF NOT EXISTS events
(
    event_id   UUID         DEFAULT generateUUIDv4(),
    created_at DateTime     DEFAULT now(),
    user_id    UInt64,
    type       LowCardinality(String),
    payload    String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, user_id);
```

This statement can be run repeatedly. If `events` already exists it does nothing, no error, no data loss.

## IF NOT EXISTS in CREATE VIEW

```sql
CREATE VIEW IF NOT EXISTS active_users_view AS
SELECT DISTINCT user_id
FROM events
WHERE created_at >= now() - INTERVAL 30 DAY;
```

## IF NOT EXISTS in CREATE MATERIALIZED VIEW

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_stats_mv
ENGINE = SummingMergeTree()
ORDER BY (hour, user_id)
POPULATE
AS
SELECT
    toStartOfHour(created_at) AS hour,
    user_id,
    count() AS event_count
FROM events
GROUP BY hour, user_id;
```

## IF NOT EXISTS in CREATE DICTIONARY

```sql
CREATE DICTIONARY IF NOT EXISTS ip_to_country
(
    ip_prefix   String,
    country     String
)
PRIMARY KEY ip_prefix
SOURCE(FILE(path '/var/lib/clickhouse/user_files/ip_country.tsv' format 'TabSeparated'))
LAYOUT(HASHED())
LIFETIME(MIN 3600 MAX 86400);
```

## IF NOT EXISTS in CREATE USER and CREATE ROLE

```sql
-- User management
CREATE USER IF NOT EXISTS alice IDENTIFIED BY 'password123';
CREATE USER IF NOT EXISTS etl_service IDENTIFIED BY 'etl_password';

-- Role management
CREATE ROLE IF NOT EXISTS analyst_role;
CREATE ROLE IF NOT EXISTS readonly_role;
```

## OR REPLACE - the Alternative

`OR REPLACE` drops and recreates the object atomically. This is useful for updating view or function definitions:

```sql
-- Recreate the view with updated logic (no separate DROP needed)
CREATE OR REPLACE VIEW active_users_view AS
SELECT DISTINCT user_id
FROM events
WHERE created_at >= now() - INTERVAL 7 DAY;

-- Recreate a function
CREATE OR REPLACE FUNCTION classify_event AS (type) ->
    multiIf(
        type IN ('click', 'hover'), 'interaction',
        type IN ('purchase', 'refund'), 'transaction',
        'other'
    );
```

Note: `OR REPLACE TABLE` is supported for the `Atomic` and `Replicated` database engines (the defaults), but it atomically replaces the table and discards existing data. Prefer `IF NOT EXISTS` for tables to avoid accidental data loss.

## Idempotent Migration Script Example

A typical migration script combining multiple DDL statements:

```sql
-- Step 1: ensure database exists
CREATE DATABASE IF NOT EXISTS app_db;

-- Step 2: create base table
CREATE TABLE IF NOT EXISTS app_db.users
(
    user_id    UInt64,
    email      String,
    created_at DateTime DEFAULT now(),
    is_active  UInt8 DEFAULT 1
)
ENGINE = MergeTree()
ORDER BY user_id;

-- Step 3: create events table
CREATE TABLE IF NOT EXISTS app_db.events
(
    event_id   UUID DEFAULT generateUUIDv4(),
    user_id    UInt64,
    type       LowCardinality(String),
    occurred_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (occurred_at, user_id);

-- Step 4: create a view
CREATE VIEW IF NOT EXISTS app_db.recent_events AS
SELECT *
FROM app_db.events
WHERE occurred_at >= now() - INTERVAL 24 HOUR;

-- Step 5: create roles and users
CREATE ROLE IF NOT EXISTS app_readonly;
CREATE USER IF NOT EXISTS app_reader IDENTIFIED BY 'reader_pass';
GRANT app_readonly TO app_reader;
GRANT SELECT ON app_db.* TO app_readonly;
```

## Checking Existence Before CREATE

You can also check existence manually using system tables before issuing DDL:

```sql
-- Check if a table exists
SELECT count() > 0 AS table_exists
FROM system.tables
WHERE database = 'app_db' AND name = 'events';

-- Check if a database exists
SELECT count() > 0 AS db_exists
FROM system.databases
WHERE name = 'app_db';
```

## Summary

`IF NOT EXISTS` makes ClickHouse DDL scripts idempotent and safe to re-run, covering databases, tables, views, materialized views, dictionaries, users, and roles. For views and functions where you want to update the definition without a separate DROP, prefer `OR REPLACE`. Reserve `IF NOT EXISTS` for tables and other objects where silent skipping is the desired behaviour.
