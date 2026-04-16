# How to Use SQLite Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQLite, Table Engine, Integration, External Data, SQL, Migration

Description: Learn how to use the ClickHouse SQLite table engine to query SQLite database files directly from ClickHouse SQL, enabling data access and migration from SQLite.

---

The SQLite table engine in ClickHouse allows you to read from (and write to) a SQLite database file directly via SQL queries. It is useful for migrating embedded SQLite data into ClickHouse, joining ClickHouse analytics data with SQLite configuration databases, or accessing SQLite files produced by mobile apps or edge devices.

## Prerequisites

ClickHouse must be built with SQLite support (`WITH_SQLITE=1`), which is included in standard ClickHouse distributions since version 22.x.

## Creating a SQLite Table

```sql
CREATE TABLE sqlite_users (
    id    UInt32,
    name  String,
    email String,
    plan  String
) ENGINE = SQLite('/path/to/database.db', 'users');
```

Arguments:
1. Absolute path to the SQLite file.
2. Table name in the SQLite database.

## Querying SQLite Data

```sql
SELECT id, name, plan
FROM sqlite_users
WHERE plan = 'pro'
ORDER BY name;
```

```text
id  name   plan
5   Alice  pro
12  Bob    pro
```

## Inserting Data into SQLite

The SQLite engine supports writes as well:

```sql
INSERT INTO sqlite_users (id, name, email, plan)
VALUES (100, 'Carol', 'carol@example.com', 'free');
```

This writes directly to the SQLite file.

## Joining SQLite with ClickHouse Native Tables

```sql
SELECT
    e.event_type,
    u.plan,
    count() AS events
FROM events AS e
LEFT JOIN sqlite_users AS u ON e.user_id = u.id
WHERE e.event_time >= today() - 7
GROUP BY e.event_type, u.plan
ORDER BY events DESC;
```

## Migrating SQLite Data into ClickHouse

```sql
-- Create native ClickHouse table
CREATE TABLE ch_users (
    id    UInt32,
    name  String,
    email String,
    plan  LowCardinality(String)
) ENGINE = MergeTree ORDER BY id;

-- Copy from SQLite
INSERT INTO ch_users
SELECT id, name, email, plan FROM sqlite_users;

-- Verify
SELECT count() FROM ch_users;
```

## Type Mapping

```text
SQLite Type     ClickHouse Type
INTEGER         Int32
TEXT            String
REAL            Float32
BLOB            String
NULL            Nullable(String) / NULL
```

## Describing the SQLite Table Schema

```sql
DESCRIBE TABLE sqlite_users;
```

## Reading from a SQLite File on S3

ClickHouse does not natively support reading SQLite files from S3. The file must be accessible on the local filesystem. For remote files, download them first:

```bash
aws s3 cp s3://bucket/config.db /var/lib/clickhouse/user_files/config.db
```

Then query:

```sql
SELECT * FROM sqlite('/var/lib/clickhouse/user_files/config.db', 'config_table');
```

## Limitations

- SQLite has no concurrent write support - only one writer at a time.
- No support for ClickHouse-specific types like DateTime64, LowCardinality, or arrays.
- Large SQLite files (> 1 GB) are not well-suited for analytics - migrate to MergeTree.
- No partitioning or indexing beyond SQLite's built-in indexes.

## Summary

The ClickHouse SQLite table engine provides direct read/write access to SQLite database files. Use it for migrating SQLite data into ClickHouse, joining small SQLite configuration tables with analytical data, and accessing embedded databases from edge devices or mobile apps. For production analytical workloads, migrate data into a MergeTree table for full ClickHouse performance.
