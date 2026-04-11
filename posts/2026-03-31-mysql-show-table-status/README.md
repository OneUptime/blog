# How to Use SHOW TABLE STATUS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Table, Metadata

Description: Learn how to use SHOW TABLE STATUS in MySQL to view metadata about tables including engine, row count, data size, and index size.

---

## What Is SHOW TABLE STATUS

`SHOW TABLE STATUS` returns detailed metadata about tables in a database. It shows the storage engine, approximate row count, data and index sizes, character set, creation time, and more. This command is useful for capacity planning, identifying tables that need optimization, and auditing table configurations.

```sql
SHOW TABLE STATUS;
SHOW TABLE STATUS FROM database_name;
SHOW TABLE STATUS LIKE 'pattern';
SHOW TABLE STATUS WHERE condition;
```

## Basic Usage

Show all tables in the current database:

```sql
USE myapp_db;
SHOW TABLE STATUS\G
```

Show tables in a specific database:

```sql
SHOW TABLE STATUS FROM myapp_db\G
```

## Key Output Columns

```text
Name          : Table name
Engine        : Storage engine (InnoDB, MyISAM, etc.)
Version       : Version number of the .frm file
Row_format    : Row storage format (Dynamic, Fixed, Compact, etc.)
Rows          : Approximate number of rows
Avg_row_length: Average row size in bytes
Data_length   : Size of the data file in bytes
Max_data_length: Maximum size the data file can reach
Index_length  : Size of index file in bytes
Data_free     : Bytes allocated but not used (fragmentation)
Auto_increment: Next auto-increment value
Create_time   : When the table was created
Update_time   : When data was last updated
Check_time    : When the table was last checked
Collation     : Character set and collation
Comment       : Table comment
```

## Filtering with LIKE

Find all tables matching a pattern:

```sql
SHOW TABLE STATUS LIKE 'order%';
SHOW TABLE STATUS LIKE '%_log';
```

## Filtering with WHERE

Use `WHERE` to filter by any column in the output:

```sql
-- Find tables using MyISAM engine
SHOW TABLE STATUS WHERE Engine = 'MyISAM';

-- Find fragmented tables (Data_free > 1MB)
SHOW TABLE STATUS WHERE Data_free > 1048576;

-- Find large tables
SHOW TABLE STATUS WHERE Data_length > 104857600;  -- > 100MB
```

## Finding Tables That Need OPTIMIZE

The `Data_free` column shows unused space due to fragmentation. High values suggest running `OPTIMIZE TABLE`:

```sql
-- Find heavily fragmented tables
SHOW TABLE STATUS FROM myapp_db
WHERE Data_free > 10485760;  -- > 10MB fragmentation
```

Then optimize:

```sql
OPTIMIZE TABLE orders;
OPTIMIZE TABLE events_log;
```

## Checking Table Sizes via Information Schema

For programmatic access with better filtering, query `information_schema` directly:

```sql
SELECT
  TABLE_NAME,
  ENGINE,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
  ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb,
  ROUND(DATA_FREE / 1024 / 1024, 2) AS free_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'myapp_db'
ORDER BY DATA_LENGTH DESC
LIMIT 10;
```

## Checking Auto Increment Values

To find tables where auto-increment is approaching its limit:

```sql
SHOW TABLE STATUS FROM myapp_db
WHERE Auto_increment > 2000000000;
```

For a signed `INT` column, the maximum is ~2.1 billion (2,147,483,647). For an unsigned `INT`, it is ~4.3 billion (4,294,967,295). Consider changing to `BIGINT` before hitting that limit.

## Summary

`SHOW TABLE STATUS` provides comprehensive metadata about MySQL tables including size, engine, fragmentation, and auto-increment values. Use it to identify fragmented tables for `OPTIMIZE TABLE`, detect capacity issues with auto-increment columns, find non-InnoDB tables, and monitor table growth. For automated monitoring and alerting, query `information_schema.TABLES` for programmatic access.
