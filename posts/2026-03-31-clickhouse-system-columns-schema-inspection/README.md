# How to Use system.columns for Schema Inspection in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.columns, Schema Inspection, Metadata, Column, System Table

Description: Query system.columns to inspect column types, default expressions, compression codecs, and comments for all tables in ClickHouse.

---

`system.columns` is a metadata table in ClickHouse that provides detailed information about every column in every table. It is the primary tool for schema inspection, auditing column types, finding compression codec assignments, and validating table structures programmatically.

## What is system.columns?

`system.columns` has one row per column per table. Key columns:

- `database`, `table`, `name` - column identity
- `type` - data type (e.g., `UInt64`, `DateTime`, `String`)
- `default_kind` - kind of default (`DEFAULT`, `MATERIALIZED`, `ALIAS`, or empty)
- `default_expression` - the default/expression definition
- `compression_codec` - codec assignment if any
- `comment` - column comment
- `position` - ordinal column position

## Basic Schema Query

```sql
SELECT
    name,
    type,
    default_kind,
    default_expression,
    compression_codec,
    comment
FROM system.columns
WHERE database = 'mydb'
  AND table    = 'events'
ORDER BY position;
```

## Finding All Columns of a Specific Type

```sql
SELECT
    database,
    table,
    name,
    type
FROM system.columns
WHERE type LIKE '%String%'
  AND database = 'mydb'
ORDER BY table, position;
```

## Auditing Compression Codecs

Find columns that have no compression codec assigned:

```sql
SELECT
    database,
    table,
    name,
    type
FROM system.columns
WHERE database = 'mydb'
  AND (compression_codec IS NULL OR compression_codec = '')
  AND table NOT IN (SELECT name FROM system.tables WHERE engine = 'View' AND database = 'mydb')
ORDER BY table, position;
```

## Finding Nullable Columns

```sql
SELECT
    database,
    table,
    name,
    type
FROM system.columns
WHERE type LIKE 'Nullable%'
  AND database = 'mydb'
ORDER BY table, name;
```

Nullable columns in ClickHouse have overhead - reviewing them helps identify optimization opportunities.

## Schema Documentation Audit

Find columns missing comments:

```sql
SELECT
    database,
    table,
    name,
    type
FROM system.columns
WHERE database = 'mydb'
  AND (comment IS NULL OR comment = '')
ORDER BY table, position;
```

## Cross-Table Column Name Search

Find all tables that have a specific column:

```sql
SELECT DISTINCT database, table
FROM system.columns
WHERE name = 'user_id'
  AND database NOT IN ('system', 'information_schema')
ORDER BY database, table;
```

## Finding Materialized and Alias Columns

```sql
SELECT
    database,
    table,
    name,
    type,
    default_kind,
    default_expression
FROM system.columns
WHERE default_kind IN ('MATERIALIZED', 'ALIAS')
  AND database = 'mydb'
ORDER BY table, position;
```

## Summary

`system.columns` is the go-to table for schema inspection in ClickHouse. Use it to audit column types, identify missing codecs, find nullable columns for optimization, validate default expressions, and search for specific columns across your entire database. Combine it with `system.tables` for a complete schema inventory.
