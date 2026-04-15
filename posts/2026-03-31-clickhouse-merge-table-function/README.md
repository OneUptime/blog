# How to Use merge() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Table Function, Merge, SQL, Database, Query

Description: Learn how to use the merge() table function in ClickHouse to query multiple tables with matching schemas as a single unified virtual table using SQL.

---

The `merge()` table function in ClickHouse creates a virtual table that combines the data from multiple physical tables sharing the same schema. It is the ad-hoc, query-time equivalent of the Merge table engine, letting you union across tables without permanent DDL.

## What Is the merge() Table Function?

`merge()` reads from several tables in the same database (or across databases) and presents their rows as a single result set. It uses a regular expression to match table names, making it easy to query a family of tables with a common naming convention.

```sql
-- Query all tables matching 'events_202*' in the 'default' database
SELECT count()
FROM merge('default', '^events_202');
```

## Basic Syntax

```sql
merge([db_name,] tables_regexp)
```

| Parameter      | Description |
|----------------|-------------|
| `db_name`      | The database to search in (optional, defaults to `currentDatabase()`) |
| `tables_regexp`| A regular expression matching the table names to include |

The result schema is derived by taking the union of all columns from matched tables and coercing to common types.

## Common Use Case: Date-Partitioned Tables

A typical pattern in ClickHouse is to partition data into monthly or yearly tables manually (e.g., `events_2024`, `events_2025`, `events_2026`). `merge()` lets you query across all of them transparently:

```sql
-- Tables: events_2024, events_2025, events_2026
SELECT
    toYear(ts)  AS year,
    count()     AS total_events
FROM merge('default', '^events_20[0-9]{2}$')
GROUP BY year
ORDER BY year;
```

## Querying Tables Across a Retention Scheme

```sql
-- Monthly log tables: logs_202401, logs_202402, ..., logs_202603
SELECT
    level,
    count() AS log_count
FROM merge('logs_db', '^logs_2026')
WHERE ts >= now() - INTERVAL 90 DAY
GROUP BY level
ORDER BY log_count DESC;
```

## The _table Virtual Column

Use the `_table` virtual column to see which source table each row came from:

```sql
SELECT
    _table AS source_table,
    count() AS row_count
FROM merge('default', '^events_202')
GROUP BY source_table
ORDER BY source_table;
```

This is very useful for auditing data distribution across the matched tables.

## Filtering by Source Table

You can filter on `_table` to narrow down which tables are actually scanned:

```sql
-- Only read from tables for 2025 and 2026
SELECT count()
FROM merge('default', '^events_20(25|26)$');
```

## Schema Requirements

The result schema is built from the union of columns across all matched tables, with types coerced to a common supertype. If a column exists in some tables but not others, rows from tables without it will contain default values. Verify schemas before using `merge()` to ensure columns align as expected:

```sql
-- Check schemas of all events_ tables
SELECT
    table,
    name  AS column,
    type
FROM system.columns
WHERE database = 'default' AND table LIKE 'events_%'
ORDER BY table, position;
```

## Using merge() in INSERT Statements

Copy and consolidate data from multiple tables into one:

```sql
CREATE TABLE events_all
(
    ts         DateTime,
    user_id    UInt64,
    event_type String,
    properties String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id);

INSERT INTO events_all
SELECT ts, user_id, event_type, properties
FROM merge('default', '^events_202[0-9]$');
```

## Joining merge() with Other Tables

```sql
SELECT
    e.user_id,
    e.event_type,
    u.username,
    u.country
FROM merge('default', '^events_202') AS e
JOIN users AS u ON e.user_id = u.user_id
WHERE e.ts >= now() - INTERVAL 30 DAY
LIMIT 1000;
```

## merge() vs Merge Table Engine vs UNION ALL

| Approach | Requires DDL | Matches tables dynamically | Use case |
|---|---|---|---|
| `merge()` function | No | Yes (regex) | Ad-hoc cross-table queries |
| Merge engine | Yes (CREATE TABLE) | Yes (regex) | Persistent virtual table |
| `UNION ALL` | No | No (explicit) | Querying a known fixed list |

```sql
-- Equivalent with UNION ALL (verbose for many tables)
SELECT * FROM events_2024
UNION ALL
SELECT * FROM events_2025
UNION ALL
SELECT * FROM events_2026;

-- Equivalent with merge() (concise and dynamic)
SELECT * FROM merge('default', '^events_202[0-9]$');
```

## Aggregating Across a Large Table Family

```sql
-- Daily summary across three years of data
SELECT
    toDate(ts)   AS date,
    event_type,
    count()      AS event_count,
    uniq(user_id) AS unique_users
FROM merge('analytics', '^page_views_20(2[3-6])$')
WHERE ts BETWEEN '2023-01-01' AND '2026-12-31'
GROUP BY date, event_type
ORDER BY date, event_count DESC;
```

## Performance Considerations

- `merge()` reads all matched tables with automatic parallelization. There is no cross-table index, but each table's own indexes are used when they exist. Partitioning and primary key pruning work within each table independently.
- Use narrow `WHERE` clauses that align with each table's `ORDER BY` or `PARTITION BY` to limit per-table scans.
- For very large table families (dozens of tables), consider consolidating into a single partitioned MergeTree table.
- Filtering on `_table` in a `WHERE` clause optimizes table selection - only tables whose name satisfies the filter condition are actually read.

## Regex Tips

```sql
-- Match any table starting with 'metrics_'
FROM merge('default', '^metrics_')

-- Match exactly named tables for 2025 and 2026
FROM merge('default', '^events_(2025|2026)$')

-- Match tables with 8-digit date suffixes
FROM merge('default', '^logs_[0-9]{8}$')

-- Match all tables in a database (use with caution)
FROM merge('default', '.*')
```

## Summary

The `merge()` table function is a convenient tool for working with table families in ClickHouse. Key points:

- Query multiple tables with a matching schema as a single virtual table using a regex.
- Use the `_table` virtual column to identify row origins.
- No DDL required - great for ad-hoc exploration of partitioned table schemes.
- For permanent access patterns, use the Merge table engine instead.
- The result schema is the union of columns from matched tables, with types coerced to common supertypes.
