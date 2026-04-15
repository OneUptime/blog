# How to Use system.data_skipping_indices in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.data_skipping_indices, Skip Index, MergeTree, Performance, Query Optimization

Description: Query system.data_skipping_indices to inspect all secondary skip indexes defined on MergeTree tables and understand their granularity and expression in ClickHouse.

---

ClickHouse supports secondary "data skipping indexes" on MergeTree tables that help skip granules during query execution when no matching data can exist. The `system.data_skipping_indices` table exposes metadata about all defined skip indexes, helping you audit their existence, type, and configuration.

## What are Data Skipping Indices?

Unlike primary keys which are always evaluated, skip indexes are secondary structures stored alongside data parts. During a query, if the index for a granule guarantees no matching data, that granule is skipped entirely - reducing I/O significantly for selective queries on non-key columns.

Types include:
- `minmax` - tracks min/max values per granule
- `set(N)` - stores up to N distinct values per granule
- `bloom_filter` - probabilistic bloom filter for membership tests
- `ngrambf_v1` - N-gram bloom filter for substring searches
- `tokenbf_v1` - token-based bloom filter for full-text-style searches

## Viewing All Skip Indexes

```sql
SELECT
    database,
    table,
    name,
    type,
    type_full,
    expr,
    granularity,
    data_compressed_bytes,
    data_uncompressed_bytes
FROM system.data_skipping_indices
ORDER BY database, table, name;
```

## Inspecting Indexes for a Specific Table

```sql
SELECT
    name,
    type_full,
    expr,
    granularity
FROM system.data_skipping_indices
WHERE database = 'mydb'
  AND table    = 'events';
```

## Understanding Index Size

```sql
SELECT
    database,
    table,
    name,
    type,
    formatReadableSize(data_compressed_bytes)   AS index_size_compressed,
    formatReadableSize(data_uncompressed_bytes)  AS index_size_uncompressed
FROM system.data_skipping_indices
WHERE database NOT IN ('system')
ORDER BY data_compressed_bytes DESC;
```

## Finding Tables Without Skip Indexes

Tables that might benefit from skip indexes for common filter patterns:

```sql
SELECT DISTINCT s.database, s.name AS table_name
FROM system.tables s
LEFT JOIN system.data_skipping_indices i
       ON s.database = i.database AND s.name = i.table
WHERE s.engine LIKE '%MergeTree%'
  AND i.name IS NULL
  AND s.database NOT IN ('system', 'information_schema')
ORDER BY s.database, s.name;
```

## Adding a Skip Index

If you find a frequently-filtered column not covered by a skip index:

```sql
ALTER TABLE mydb.events
    ADD INDEX idx_user_id (user_id) TYPE set(100) GRANULARITY 4;

-- Materialize it on existing parts
ALTER TABLE mydb.events MATERIALIZE INDEX idx_user_id;
```

## Verifying Index Effectiveness

After adding an index, check if it's being used:

```sql
SELECT
    query,
    read_rows,
    read_bytes
FROM system.query_log
WHERE type = 'QueryFinish'
  AND has(tables, 'mydb.events')
  AND query LIKE '%user_id%'
ORDER BY event_time DESC
LIMIT 10;
```

Compare `read_rows` before and after materializing the index.

## Summary

`system.data_skipping_indices` provides a catalog of all skip indexes in ClickHouse MergeTree tables. Use it to audit index coverage, understand index types and sizes, find tables lacking appropriate skip indexes, and verify that indexes are properly sized with appropriate granularity settings.
