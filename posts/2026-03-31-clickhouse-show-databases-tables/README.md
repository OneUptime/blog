# How to Use SHOW DATABASES and SHOW TABLES in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SHOW, Database, Table, Metadata

Description: Learn how to use SHOW DATABASES and SHOW TABLES in ClickHouse to list and filter databases, tables, and views by name pattern.

---

`SHOW DATABASES` and `SHOW TABLES` are the quickest commands for exploring what objects exist in a ClickHouse server. They are interactive commands designed for use in the `clickhouse-client` shell or any SQL interface, and they support pattern matching so you can narrow down long lists without writing full system table queries.

## SHOW DATABASES

List all databases the current user can access:

```sql
SHOW DATABASES;
```

Sample output:

```text
INFORMATION_SCHEMA
default
analytics
system
```

### Filter Databases with LIKE

```sql
SHOW DATABASES LIKE 'ana%';
```

```text
analytics
```

The `LIKE` pattern uses SQL wildcard syntax: `%` matches any sequence of characters and `_` matches exactly one character.

### Filter Databases with a Query

`SHOW DATABASES` does not support a `WHERE` clause. For more expressive filtering, query `system.databases` directly:

```sql
SELECT name FROM system.databases
WHERE name NOT IN ('system', 'INFORMATION_SCHEMA', 'information_schema');
```

```text
default
analytics
staging
```

## SHOW TABLES

List all tables in the current database:

```sql
SHOW TABLES;
```

Sample output:

```text
events
orders
users
daily_revenue
sensor_readings
```

### List Tables in a Specific Database

```sql
SHOW TABLES FROM analytics;
```

```text
pageviews
sessions
conversions
funnel_steps
```

You can also use the `IN` alias which is equivalent to `FROM`:

```sql
SHOW TABLES IN analytics;
```

### Filter Tables with LIKE

```sql
SHOW TABLES LIKE '%event%';
```

```text
events
event_aggregates
event_schema_log
```

### Filter Tables with a Query

`SHOW TABLES` does not support a `WHERE` clause. For more expressive filtering, query `system.tables` directly:

```sql
SELECT name FROM system.tables
WHERE database = 'analytics'
  AND (name LIKE 'session%' OR name LIKE 'funnel%');
```

```text
sessions
funnel_steps
```

## SHOW FULL TABLES

`SHOW FULL TABLES` adds an `engine` column to the output so you can see each table's storage engine:

```sql
SHOW FULL TABLES FROM analytics;
```

```text
name             | engine
conversions      | MergeTree
daily_revenue    | View
funnel_steps     | MergeTree
pageviews        | MergeTree
sessions         | MergeTree
```

This is useful when a database mixes different engine types and you need to quickly identify views (engine `View`) or distinguish MergeTree tables from other engines before running DDL that might only apply to specific engine types.

## SHOW DICTIONARIES

Similarly, `SHOW DICTIONARIES` lists external dictionaries:

```sql
SHOW DICTIONARIES FROM analytics;
```

```text
region_names
product_categories
```

## Practical Patterns

### Count Tables by Database

Use `system.tables` for quick counts:

```sql
SELECT database, count() AS table_count
FROM system.tables
WHERE database NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')
GROUP BY database
ORDER BY table_count DESC;
```

```text
analytics | 18
default   | 7
staging   | 5
```

### Find All MergeTree Tables

```sql
SELECT database, name, engine
FROM system.tables
WHERE engine LIKE '%MergeTree%'
  AND database NOT IN ('system')
ORDER BY database, name;
```

### Check If a Table Exists

```sql
SELECT count() > 0 AS table_exists
FROM system.tables
WHERE database = 'analytics' AND name = 'pageviews';
```

```text
1
```

## Comparing SHOW Commands vs system Tables

```sql
-- Quick interactive listing
SHOW TABLES FROM analytics;

-- Programmatic: filter by engine, row count, or other metadata
SELECT name, engine, total_rows, total_bytes
FROM system.tables
WHERE database = 'analytics'
ORDER BY total_bytes DESC;
```

Use `SHOW DATABASES` and `SHOW TABLES` for fast interactive exploration. Use `system.databases` and `system.tables` when you need to filter by engine type, size, or other metadata columns not exposed by the SHOW commands.

## Summary

`SHOW DATABASES` and `SHOW TABLES` provide a fast way to list and filter ClickHouse databases and tables using SQL LIKE patterns. `SHOW FULL TABLES` adds an `engine` column so you can see each table's storage engine at a glance. For more expressive filtering with `WHERE` clauses, or for richer metadata such as size or row count, query `system.tables` and `system.databases` directly, which expose all the same names plus dozens of additional columns.
