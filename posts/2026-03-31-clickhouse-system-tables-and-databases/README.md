# How to Use system.tables and system.databases in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.tables, system.databases, Schema Inspection, Metadata, System Table

Description: Use system.tables and system.databases to inspect table engines, row counts, storage sizes, and database metadata across your ClickHouse instance.

---

ClickHouse's `system.tables` and `system.databases` system tables expose metadata about every table and database on the server. These are essential for schema auditing, storage inventory, and automating administrative tasks.

## system.databases

`system.databases` lists all databases on the server with their storage engine and data path.

```sql
SELECT
    name,
    engine,
    data_path,
    metadata_path,
    uuid
FROM system.databases
ORDER BY name;
```

Typical engines include `Atomic` (default), `Ordinary` (legacy), and `Memory`.

## system.tables Overview

`system.tables` contains one row per table with metadata including engine, row count, compressed size, and creation SQL.

```sql
SELECT
    database,
    name,
    engine,
    total_rows,
    formatReadableSize(total_bytes)     AS total_size,
    formatReadableSize(total_bytes_uncompressed) AS uncompressed,
    is_temporary,
    create_table_query
FROM system.tables
WHERE database NOT IN ('system', 'information_schema')
ORDER BY total_bytes DESC NULLS LAST;
```

## Finding Largest Tables

```sql
SELECT
    database,
    name       AS table_name,
    engine,
    total_rows,
    formatReadableSize(total_bytes) AS size
FROM system.tables
WHERE database NOT IN ('system', 'information_schema')
  AND engine LIKE '%MergeTree%'
ORDER BY total_bytes DESC NULLS LAST
LIMIT 20;
```

## Listing Tables by Engine

```sql
SELECT
    engine,
    count()                                AS table_count,
    formatReadableSize(sum(total_bytes))   AS total_size
FROM system.tables
WHERE database NOT IN ('system')
GROUP BY engine
ORDER BY table_count DESC;
```

## Finding Tables with No Rows

```sql
SELECT database, name, engine, total_rows
FROM system.tables
WHERE database NOT IN ('system', 'information_schema')
  AND total_rows = 0
  AND engine LIKE '%MergeTree%'
ORDER BY database, name;
```

## Checking TTL and Partition Expression

```sql
SELECT
    database,
    name,
    partition_key,
    sorting_key,
    primary_key,
    sampling_key,
    engine_full
FROM system.tables
WHERE engine LIKE '%MergeTree%'
  AND database = 'mydb'
ORDER BY name;
```

## Finding Tables Without Comments

Good for documentation audits:

```sql
SELECT database, name
FROM system.tables
WHERE database = 'mydb'
  AND (comment IS NULL OR comment = '')
ORDER BY name;
```

## Checking Database Row

```sql
SELECT name, engine, uuid
FROM system.databases
WHERE name = 'mydb';
```

## Summary

`system.tables` and `system.databases` are fundamental metadata tables in ClickHouse. Use them for storage auditing, schema inventory, identifying engine types, and automating administrative workflows. Combine with `system.columns` for full schema inspection across your instance.
