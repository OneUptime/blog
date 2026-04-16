# How to Use SQLite Database Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQLite Database Engine, SQLite, Embedded Database, Data Migration

Description: Learn how to use the SQLite database engine in ClickHouse to query SQLite database files directly from ClickHouse SQL.

---

The SQLite database engine in ClickHouse allows you to connect to a SQLite database file and query its tables as if they were ClickHouse tables. This is useful for migrating data from SQLite to ClickHouse, analyzing embedded application databases, or integrating small local datasets with large ClickHouse analytics tables.

## Creating the Database

Point ClickHouse to a SQLite database file:

```sql
CREATE DATABASE sqlite_db
ENGINE = SQLite('/path/to/application.db');
```

The path must be accessible by the ClickHouse server process. All tables in the SQLite file become queryable.

## Listing Available Tables

```sql
SHOW TABLES FROM sqlite_db;
```

Or:

```sql
SELECT name
FROM system.tables
WHERE database = 'sqlite_db';
```

## Querying SQLite Tables

```sql
SELECT
    id,
    name,
    email,
    created_at
FROM sqlite_db.users
WHERE active = 1
ORDER BY created_at DESC
LIMIT 100;
```

## Migrating Data from SQLite to ClickHouse

The SQLite engine is excellent for one-time or recurring migrations:

```sql
-- Create destination table in ClickHouse
CREATE TABLE users_clickhouse (
    id UInt64,
    name String,
    email String,
    created_at DateTime
)
ENGINE = MergeTree()
ORDER BY id;

-- Copy data from SQLite to ClickHouse
INSERT INTO users_clickhouse
SELECT id, name, email, parseDateTimeBestEffort(created_at)
FROM sqlite_db.users;
```

## Joining SQLite Data with ClickHouse Analytics

```sql
SELECT
    e.event_type,
    count() AS events,
    u.name AS user_name
FROM analytics_events AS e
INNER JOIN sqlite_db.users AS u ON e.user_id = u.id
WHERE e.ts >= today()
GROUP BY e.event_type, u.name
ORDER BY events DESC;
```

## Type Mapping

SQLite has a flexible type system. ClickHouse maps SQLite types as follows:

```text
SQLite INTEGER  -> Int64
SQLite REAL     -> Float64
SQLite TEXT     -> String
SQLite BLOB     -> String
SQLite NULL     -> Nullable(String)
```

Use CAST or conversion functions if you need more specific types:

```sql
SELECT
    id,
    name,
    toDateTime(created_at) AS created_at
FROM sqlite_db.users;
```

## Writing to SQLite

The SQLite database engine supports INSERT:

```sql
INSERT INTO sqlite_db.audit_log VALUES
(42, 'export', '2024-06-01 10:00:00', 'success');
```

This writes directly to the SQLite file. Be careful with concurrent writes as SQLite has limited write concurrency.

## Limitations

- Read-write access is limited by SQLite's single-writer model
- Not suitable for high-concurrency production workloads
- Large SQLite files may be slow due to sequential scanning
- No network access - SQLite file must be local to the ClickHouse server

## Summary

The SQLite database engine provides a convenient bridge between ClickHouse and local SQLite files. It is ideal for data migrations, one-off analysis of embedded application databases, and integrating small reference datasets. For large-scale analytics, copy the SQLite data into a MergeTree table in ClickHouse for optimal query performance.
