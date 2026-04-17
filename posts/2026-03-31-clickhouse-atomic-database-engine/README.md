# How to Use Atomic Database Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Atomic Database Engine, Database Engine, RENAME TABLE, UUID

Description: Learn how the Atomic database engine works in ClickHouse, enabling atomic table renames, non-blocking drops, and UUID-based table identity.

---

The Atomic database engine was introduced in ClickHouse 20.5 and became the default database engine starting with version 20.10. It replaced the older Ordinary engine and introduced support for atomic table and dictionary operations, non-blocking DROP, and UUID-based table identification. Understanding Atomic is essential for reliable schema management in production ClickHouse deployments.

## Creating a Database with Atomic Engine

```sql
-- Atomic is the default; this is equivalent to CREATE DATABASE mydb
CREATE DATABASE mydb ENGINE = Atomic;
```

Verify the engine:

```sql
SELECT name, engine
FROM system.databases
WHERE name = 'mydb';
```

## Key Features

### Atomic RENAME TABLE

With the Atomic engine, RENAME TABLE is truly atomic - no data movement occurs, just a metadata update:

```sql
-- Swap a staging table into production atomically
RENAME TABLE
    mydb.events TO mydb.events_old,
    mydb.events_staging TO mydb.events;
```

This is safe to do in production - queries running against `events` will seamlessly switch to the new table after the rename.

### Non-Blocking DROP TABLE

The old Ordinary engine blocked until all parts were deleted. Atomic engine moves table data to a background trash directory and deletes asynchronously:

```sql
DROP TABLE mydb.large_table;
-- Returns immediately; data deleted in background
```

### UUID-Based Table Identity

Each table in an Atomic database gets a UUID. This decouples the table's logical name from its physical storage path:

```sql
SELECT name, uuid, data_paths
FROM system.tables
WHERE database = 'mydb';
```

The storage path is based on UUID, not the table name, which is why renames are instant.

## EXCHANGE TABLES

Atomic databases support the EXCHANGE TABLES command for atomically swapping two tables:

```sql
-- Swap events and events_backup atomically
EXCHANGE TABLES mydb.events AND mydb.events_backup;
```

This is useful for zero-downtime data refreshes - build a new version in `events_backup` and then swap.

## Moving Tables Between Databases

With Atomic databases, you can move a table to another database atomically:

```sql
RENAME TABLE mydb.events TO archive_db.events;
```

Both databases must use the Atomic engine.

## Differences from Ordinary Engine

| Feature | Ordinary | Atomic |
|---|---|---|
| RENAME TABLE | Copy + rename | Atomic metadata swap |
| DROP TABLE | Blocking | Non-blocking |
| Table identity | By name | By UUID |
| EXCHANGE TABLES | Not supported | Supported |

## Migrating from Ordinary to Atomic

If you have older databases on the Ordinary engine:

```sql
-- Check engine
SELECT name, engine FROM system.databases;
```

To convert all Ordinary databases to Atomic automatically (requires ClickHouse 22.8+), create an empty flag file and restart the server:

```bash
# Create the conversion flag (adjust path to your flags directory)
touch /var/lib/clickhouse/flags/convert_ordinary_to_atomic
chown clickhouse:clickhouse /var/lib/clickhouse/flags/convert_ordinary_to_atomic

# Restart ClickHouse; all Ordinary databases will be converted on startup
sudo systemctl restart clickhouse-server
```

## Summary

The Atomic database engine is the standard for ClickHouse databases and should be used for all new deployments. Its atomic rename and exchange operations enable zero-downtime schema migrations and data refreshes. UUID-based table identity and non-blocking drops make production schema management safer and faster. Legacy Ordinary databases should be migrated to Atomic.
