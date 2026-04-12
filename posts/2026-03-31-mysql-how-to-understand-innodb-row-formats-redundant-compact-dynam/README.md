# How to Understand InnoDB Row Formats in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Row Format, Storage, Configuration

Description: Learn the differences between InnoDB row formats - REDUNDANT, COMPACT, DYNAMIC, and COMPRESSED - and how to choose the right one for your tables.

---

## What Are InnoDB Row Formats?

InnoDB row formats determine how data rows are physically stored within B-tree index pages on disk. Choosing the right row format affects storage efficiency, compression ratios, and how large columns (TEXT, BLOB, VARCHAR) are stored.

MySQL 8.0 supports four row formats: REDUNDANT, COMPACT, DYNAMIC, and COMPRESSED.

## REDUNDANT Row Format

REDUNDANT is the original InnoDB row format, preserved for backward compatibility. It stores the full list of field lengths at the start of each row record.

- Least storage-efficient format
- Stores the first 768 bytes of long columns inline; the rest in overflow pages
- Rarely used in modern MySQL deployments

```sql
CREATE TABLE t1 (id INT, name VARCHAR(255))
ROW_FORMAT=REDUNDANT ENGINE=InnoDB;
```

## COMPACT Row Format

COMPACT was introduced in MySQL 5.0 and reduces row storage size by about 20% compared to REDUNDANT.

- Stores a more compact null-value bitmap
- First 768 bytes of long columns stored inline; overflow in separate pages
- Default in MySQL 5.6 and earlier

```sql
CREATE TABLE t2 (id INT, bio TEXT)
ROW_FORMAT=COMPACT ENGINE=InnoDB;
```

## DYNAMIC Row Format

DYNAMIC is the default row format since MySQL 5.7. It stores long variable-length columns (TEXT, BLOB, VARCHAR > 768 bytes) entirely in overflow pages, keeping only a 20-byte pointer in the main row record.

- More efficient use of B-tree pages when rows contain large columns
- Supports index key prefixes up to 3072 bytes (always enabled in MySQL 8.0; in MySQL 5.7 this required `innodb_large_prefix = ON`, which was removed in 8.0)
- Recommended for most modern workloads

```sql
CREATE TABLE t3 (id INT, content LONGTEXT)
ROW_FORMAT=DYNAMIC ENGINE=InnoDB;
```

Verify the default:

```sql
SHOW VARIABLES LIKE 'innodb_default_row_format';
```

```text
+---------------------------+---------+
| Variable_name             | Value   |
+---------------------------+---------+
| innodb_default_row_format | dynamic |
+---------------------------+---------+
```

## COMPRESSED Row Format

COMPRESSED is similar to DYNAMIC in how it handles overflow pages, but additionally compresses both the main page data and overflow pages using zlib.

- Reduces storage size by 50-70% for text-heavy tables
- Requires more CPU for compression/decompression
- Works best for archival or read-heavy data with limited I/O bandwidth
- Cannot be used with general tablespaces (must use file-per-table)

```sql
CREATE TABLE t4 (id INT, log_data TEXT)
ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8 ENGINE=InnoDB;
```

`KEY_BLOCK_SIZE` sets the compressed page size in KB (1, 2, 4, 8, or 16). Use 8KB as a starting point and test compression ratios.

## Comparing Row Formats

| Format | Overflow Storage | Compression | Default In |
|---|---|---|---|
| REDUNDANT | First 768 bytes inline | No | MySQL 4.x |
| COMPACT | First 768 bytes inline | No | MySQL 5.0-5.6 |
| DYNAMIC | Pointer only (20 bytes) | No | MySQL 5.7+ |
| COMPRESSED | Pointer only (20 bytes) | Yes (zlib) | N/A |

## Checking Row Formats of Existing Tables

```sql
SELECT
  TABLE_NAME,
  ROW_FORMAT,
  DATA_LENGTH,
  INDEX_LENGTH
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'your_database'
ORDER BY DATA_LENGTH DESC;
```

## Converting a Table's Row Format

```sql
-- Convert to DYNAMIC (recommended for most tables)
ALTER TABLE orders ROW_FORMAT=DYNAMIC;

-- Convert to COMPRESSED for archival tables
ALTER TABLE audit_logs ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
```

Note: `ALTER TABLE` with a row format change rebuilds the entire table and may take significant time on large tables. Use `pt-online-schema-change` from Percona Toolkit for zero-downtime changes.

## Setting the Global Default Row Format

```text
[mysqld]
innodb_default_row_format = dynamic
```

## Summary

InnoDB supports four row formats: REDUNDANT (legacy), COMPACT (MySQL 5.0+), DYNAMIC (default in MySQL 5.7+), and COMPRESSED. DYNAMIC is the best choice for most workloads because it efficiently handles large columns. Use COMPRESSED for archival tables where storage reduction justifies the CPU overhead of compression.
