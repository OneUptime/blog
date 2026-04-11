# How to List All Indexes on a Table in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Schema, Information Schema, Performance

Description: Learn how to list all indexes on a MySQL table using SHOW INDEX, information_schema.STATISTICS, and sys schema queries with filtering and sorting options.

---

## Using SHOW INDEX

The fastest way to see all indexes on a specific table:

```sql
SHOW INDEX FROM orders;
SHOW INDEX FROM orders FROM your_database;  -- specify database explicitly
```

```text
+--------+------------+-------------------+--------------+-------------+-----------+...
| Table  | Non_unique | Key_name          | Seq_in_index | Column_name | Collation |...
+--------+------------+-------------------+--------------+-------------+-----------+...
| orders |          0 | PRIMARY           |            1 | id          | A         |...
| orders |          1 | idx_customer      |            1 | customer_id | A         |...
| orders |          0 | uk_reference      |            1 | reference   | A         |...
+--------+------------+-------------------+--------------+-------------+-----------+...
```

Key columns:
- `Non_unique`: 0 = unique, 1 = non-unique
- `Seq_in_index`: position of the column in a composite index
- `Cardinality`: estimated number of distinct values

## Filtering SHOW INDEX Output

```sql
-- Only unique indexes
SHOW INDEX FROM orders WHERE Non_unique = 0;

-- Only a specific index
SHOW INDEX FROM orders WHERE Key_name = 'idx_customer';
```

## Using information_schema.STATISTICS

For programmatic access or cross-table queries:

```sql
SELECT
    INDEX_NAME,
    NON_UNIQUE,
    SEQ_IN_INDEX,
    COLUMN_NAME,
    COLLATION,
    CARDINALITY,
    INDEX_TYPE,
    IS_VISIBLE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'your_database'
  AND TABLE_NAME = 'orders'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;
```

## Listing All Indexes Across All Tables in a Database

```sql
SELECT
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns,
    NON_UNIQUE,
    INDEX_TYPE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'your_database'
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE, INDEX_TYPE
ORDER BY TABLE_NAME, INDEX_NAME;
```

## Finding Tables Without Indexes

```sql
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'your_database'
  AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME NOT IN (
      SELECT DISTINCT TABLE_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = 'your_database'
  );
```

## Using the sys Schema

The `sys` schema provides convenient views for index analysis:

```sql
-- Tables experiencing full table scans (may indicate missing indexes)
SELECT * FROM sys.schema_tables_with_full_table_scans
WHERE object_schema = 'your_database';

-- Unused indexes
SELECT * FROM sys.schema_unused_indexes
WHERE object_schema = 'your_database';
```

## From the Command Line

```bash
mysql -u root -p your_database -e "SHOW INDEX FROM orders\G"
```

## Summary

Use `SHOW INDEX FROM table_name` for a quick look at a single table's indexes. For multi-table analysis or scripting, query `information_schema.STATISTICS` directly. The `sys` schema provides higher-level views for identifying tables without indexes and unused indexes across the entire database.
