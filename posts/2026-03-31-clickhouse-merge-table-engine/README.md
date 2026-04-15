# How to Use Merge Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Merge Engine, Table Engine, Data Partitioning, Query Federation

Description: Learn how the Merge table engine in ClickHouse creates a unified view over multiple tables, enabling transparent queries across partitioned or sharded datasets.

---

The Merge table engine in ClickHouse is a virtual engine that queries multiple tables simultaneously and returns a unified result set. It does not store data itself - it reads from the underlying tables at query time. This makes it ideal for querying data spread across time-partitioned tables or logically separated datasets.

## When to Use the Merge Engine

A common ClickHouse pattern is to store data in monthly or yearly tables - for example, `events_2024`, `events_2025`, `events_2026`. Querying across these tables normally requires UNION ALL. The Merge engine eliminates this by creating a single virtual table that reads from all of them.

## Creating a Merge Table

```sql
CREATE TABLE events_all (event_date Date, user_id UInt64, event_name String)
ENGINE = Merge(currentDatabase(), '^events_\\d{4}$');
```

The two arguments are:
1. The database name (or `currentDatabase()` for the current db)
2. A regular expression matching the table names to include

Now you can query all yearly event tables as one:

```sql
SELECT
    toYear(event_date) AS year,
    count() AS event_count
FROM events_all
WHERE event_date BETWEEN '2024-01-01' AND '2026-12-31'
GROUP BY year
ORDER BY year;
```

## Adding a _table Column

The Merge engine adds a virtual `_table` column that tells you which underlying table each row came from:

```sql
SELECT
    _table,
    count() AS rows
FROM events_all
GROUP BY _table
ORDER BY _table;
```

```text
_table       | rows
-------------|----------
events_2024  | 12400000
events_2025  | 18900000
events_2026  | 5200000
```

This is useful for debugging and for understanding data distribution.

## Filtering and Pushdown

ClickHouse can push down WHERE clauses to the individual underlying tables. If the tables have partition keys or primary keys, the Merge engine will still benefit from pruning:

```sql
SELECT count()
FROM events_all
WHERE event_date = today();
```

ClickHouse evaluates the regex against table names, opens only the matching tables, and applies the filter within each. Tables that do not contain matching data are skipped via index.

## Schema Requirements

All tables included in the Merge engine must have identical (or compatible) schemas. The column names and types must match. If schemas diverge, queries will fail or return incorrect results.

```sql
-- All three tables must have matching columns
CREATE TABLE events_2024 (event_date Date, user_id UInt64, event_name String)
    ENGINE = MergeTree ORDER BY event_date;
CREATE TABLE events_2025 (event_date Date, user_id UInt64, event_name String)
    ENGINE = MergeTree ORDER BY event_date;

CREATE TABLE events_all AS events_2024 ENGINE = Merge(currentDatabase(), '^events_\\d{4}$');
```

## Summary

The Merge table engine is a lightweight and effective way to create unified query interfaces over multiple ClickHouse tables. Use it when data is spread across time-partitioned tables, logical shards, or experiment groups. It requires no data movement and adds minimal overhead, making it a practical tool for simplifying analytics queries across large multi-table datasets.
