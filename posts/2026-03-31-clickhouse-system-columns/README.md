# How to Use system.columns to Inspect Table Schemas in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema, System Table, Administration, Metadata

Description: Learn how to query system.columns to inspect column types, compression codecs, default expressions, and data statistics across all tables in ClickHouse.

---

`system.columns` contains one row for every column in every table on the ClickHouse node. It lets you query schema metadata programmatically - useful for schema migrations, documentation generation, type audits, and understanding storage layout without parsing DDL text manually.

## What system.columns Contains

```sql
DESCRIBE system.columns;
```

Key columns:

| Column | Type | Meaning |
|---|---|---|
| `database` | String | Database name |
| `table` | String | Table name |
| `name` | String | Column name |
| `type` | String | ClickHouse data type as a string |
| `position` | UInt64 | Ordinal position in the table (1-based) |
| `default_kind` | String | `DEFAULT`, `MATERIALIZED`, `ALIAS`, or empty |
| `default_expression` | String | SQL expression for the default/alias |
| `data_compressed_bytes` | UInt64 | Compressed bytes used by this column |
| `data_uncompressed_bytes` | UInt64 | Uncompressed bytes for this column |
| `marks_bytes` | UInt64 | Index mark bytes for this column |
| `comment` | String | Column comment if set |
| `is_in_partition_key` | UInt8 | 1 if this column is part of PARTITION BY |
| `is_in_sorting_key` | UInt8 | 1 if this column is part of ORDER BY |
| `is_in_primary_key` | UInt8 | 1 if this column is part of PRIMARY KEY |
| `is_in_sampling_key` | UInt8 | 1 if this column is part of SAMPLE BY |
| `compression_codec` | String | Codec configured for this column |
| `character_octet_length` | Nullable(UInt64) | Max byte length for string types |
| `numeric_precision` | Nullable(UInt64) | Precision for numeric types |
| `numeric_scale` | Nullable(UInt64) | Scale for decimal types |

## List All Columns in a Table

```sql
SELECT
    position,
    name,
    type,
    default_kind,
    default_expression,
    compression_codec,
    comment
FROM system.columns
WHERE database = 'default'
  AND table    = 'events'
ORDER BY position;
```

## Find Columns by Type Across All Tables

```sql
-- Find all DateTime64 columns
SELECT database, table, name, type
FROM system.columns
WHERE type LIKE 'DateTime64%'
ORDER BY database, table, name;
```

```sql
-- Find all Nullable columns
SELECT database, table, name, type
FROM system.columns
WHERE type LIKE 'Nullable%'
ORDER BY database, table;
```

## Identify Sorting Key and Partition Key Columns

```sql
SELECT
    database,
    table,
    name,
    type,
    is_in_partition_key,
    is_in_sorting_key,
    is_in_primary_key
FROM system.columns
WHERE database = 'default'
  AND table    = 'events'
  AND (is_in_partition_key = 1 OR is_in_sorting_key = 1 OR is_in_primary_key = 1)
ORDER BY position;
```

## Check Compression Codecs

```sql
SELECT
    database,
    table,
    name,
    type,
    compression_codec
FROM system.columns
WHERE database = 'default'
  AND table    = 'events'
ORDER BY position;
```

Columns with an empty `compression_codec` use the table-level or default codec. Explicitly set codecs like `CODEC(ZSTD(3))` or `CODEC(Delta, LZ4)` appear here.

## Estimate Column Size Contribution

```sql
SELECT
    name,
    type,
    formatReadableSize(data_compressed_bytes)   AS compressed,
    formatReadableSize(data_uncompressed_bytes) AS uncompressed,
    round(data_uncompressed_bytes /
          nullIf(data_compressed_bytes, 0), 2)  AS compression_ratio
FROM system.columns
WHERE database = 'default'
  AND table    = 'events'
ORDER BY data_compressed_bytes DESC;
```

This reveals which columns consume the most storage and which compress well. Columns with low compression ratios are candidates for better codecs.

## Find Tables with a Specific Column Name

```sql
SELECT database, table, type, position
FROM system.columns
WHERE name = 'user_id'
ORDER BY database, table;
```

Useful during refactoring to find all tables that reference a given field.

## Audit for Missing Comments

```sql
SELECT
    database,
    table,
    name,
    type
FROM system.columns
WHERE database != 'system'
  AND database != 'information_schema'
  AND comment  = ''
ORDER BY database, table, position;
```

## Find All Materialized and Alias Columns

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
ORDER BY database, table, name;
```

## Generate a Schema Documentation Report

```sql
SELECT
    database,
    table,
    position,
    name,
    type,
    if(default_kind != '', concat(default_kind, ' ', default_expression), '') AS default_info,
    compression_codec,
    comment
FROM system.columns
WHERE database NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')
ORDER BY database, table, position
FORMAT PrettyCompactNoEscapes;
```

## Export Schema as CREATE TABLE DDL (Alternative)

```sql
SELECT create_table_query
FROM system.tables
WHERE database = 'default'
  AND name     = 'events';
```

This returns the full DDL with all column definitions, making it easy to diff two schemas.

## Compare Column Types Across Replicas

```bash
#!/usr/bin/env bash
# Check that the events table has the same column count on all replicas

DB="default"
TABLE="events"

clickhouse-client --query "
    SELECT hostName() AS host, count() AS col_count
    FROM clusterAllReplicas('my_cluster', system.columns)
    WHERE database = '${DB}' AND table = '${TABLE}'
    GROUP BY host
    ORDER BY host
    FORMAT TSV
"
```

## Add or Modify Column Comments

```sql
-- Add a comment to a column
ALTER TABLE default.events
    COMMENT COLUMN user_id 'Internal user identifier, references users.id';

-- Verify the comment was saved
SELECT name, comment
FROM system.columns
WHERE database = 'default'
  AND table    = 'events'
  AND name     = 'user_id';
```

## Common Pitfalls

- `data_compressed_bytes` and `data_uncompressed_bytes` are zero for tables that do not use the MergeTree family (e.g., `Memory`, `Log`, `View`).
- When no explicit `PRIMARY KEY` is specified, the primary key defaults to the full `ORDER BY` key, so `is_in_primary_key` and `is_in_sorting_key` are equivalent. When `PRIMARY KEY` is explicitly set to a prefix of `ORDER BY`, `is_in_primary_key` only covers the prefix columns, while `is_in_sorting_key` covers all `ORDER BY` columns.
- Virtual columns (like `_part`, `_partition_id`) do not appear in `system.columns` because they are not stored on disk.

## Summary

`system.columns` is the metadata catalog for every table in your ClickHouse instance. Use it to audit types, find large columns, check codec assignments, identify key columns without reading DDL, and generate schema documentation. It is a lightweight query with no disk I/O, making it safe to run frequently in monitoring scripts.
