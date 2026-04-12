# How to Find Table Sizes Using INFORMATION_SCHEMA in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, Performance, Disk Usage, Database Administration

Description: Learn how to find the size of tables in MySQL using INFORMATION_SCHEMA.TABLES, including data size, index size, and total size in human-readable format.

---

## Why Check Table Sizes?

As databases grow, understanding the disk footprint of individual tables is essential for capacity planning, identifying bloat, and prioritizing optimization efforts. MySQL's `INFORMATION_SCHEMA.TABLES` view provides data and index size estimates for every table, making it easy to identify the largest tables across all databases.

## Relevant Columns in INFORMATION_SCHEMA.TABLES

- `TABLE_SCHEMA` - the database name
- `TABLE_NAME` - the table name
- `DATA_LENGTH` - bytes used by table data
- `INDEX_LENGTH` - bytes used by indexes
- `DATA_FREE` - bytes of free space allocated but not yet used (fragmentation)
- `TABLE_ROWS` - estimated row count
- `ENGINE` - the storage engine

## List All Tables by Total Size (Largest First)

```sql
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS total_size_mb,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_size_mb,
    ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_size_mb
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND TABLE_SCHEMA NOT IN (
      'information_schema', 'performance_schema', 'mysql', 'sys'
  )
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
LIMIT 20;
```

## Find the Largest Tables in a Specific Database

```sql
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
    ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS total_mb
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'production_db'
  AND TABLE_TYPE = 'BASE TABLE'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
```

## Identify Fragmented Tables

High `DATA_FREE` relative to `DATA_LENGTH` indicates fragmentation that can be reclaimed with `OPTIMIZE TABLE`:

```sql
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
    ROUND(DATA_FREE / 1024 / 1024, 2) AS free_mb,
    ROUND(DATA_FREE / (DATA_LENGTH + 1) * 100, 1) AS fragmentation_pct
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND DATA_FREE > 0
  AND DATA_LENGTH > 1048576
ORDER BY fragmentation_pct DESC
LIMIT 10;
```

## Find Tables Where Indexes Are Larger Than Data

This often indicates over-indexing:

```sql
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
    ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND INDEX_LENGTH > DATA_LENGTH
  AND DATA_LENGTH > 102400
ORDER BY INDEX_LENGTH DESC;
```

## Display Sizes in GB for Large Databases

```sql
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1073741824, 3) AS total_gb
FROM INFORMATION_SCHEMA.TABLES
WHERE (DATA_LENGTH + INDEX_LENGTH) > 1073741824
ORDER BY total_gb DESC;
```

## Note on Accuracy

The `TABLE_ROWS` and size columns in `INFORMATION_SCHEMA.TABLES` are estimates for InnoDB tables. `SHOW TABLE STATUS` returns the same estimates from the same internal source. For exact row counts, run `SELECT COUNT(*)` on the table. For exact on-disk sizes, check the file system (e.g., the `.ibd` files when `innodb_file_per_table` is enabled). The estimates are close enough for capacity planning but may differ from actual file sizes.

## Summary

`INFORMATION_SCHEMA.TABLES` provides fast, no-disruption access to table size estimates across your entire MySQL server. Use it routinely to spot large or fragmented tables, compare data size versus index size, and prioritize maintenance tasks like `OPTIMIZE TABLE` or archiving old data.
