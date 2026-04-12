# What Is Row Format in MySQL InnoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Storage, Performance, Row Format

Description: InnoDB row formats - REDUNDANT, COMPACT, DYNAMIC, and COMPRESSED - control how row data is physically stored on disk, affecting storage efficiency and performance.

---

## Overview

InnoDB stores table rows on disk using a specific row format that determines how column data, variable-length fields, and overflow pages are organized. Choosing the right row format affects storage space, query performance, and which MySQL features you can use. MySQL 8.0 defaults to DYNAMIC, which is suitable for most workloads.

## The Four Row Formats

### REDUNDANT

The original InnoDB row format, included for backward compatibility. It stores the first 768 bytes of variable-length columns (VARCHAR, BLOB, TEXT) inline in the row and the rest on overflow pages. It uses more space than newer formats because it stores the lengths of all columns, including fixed-length ones.

```sql
CREATE TABLE legacy_table (
  id INT PRIMARY KEY,
  data TEXT
) ENGINE=InnoDB ROW_FORMAT=REDUNDANT;
```

### COMPACT

Introduced in MySQL 5.0, COMPACT reduces storage space by about 20% compared to REDUNDANT. It stores the first 768 bytes of variable-length columns inline.

```sql
CREATE TABLE compact_table (
  id INT PRIMARY KEY,
  name VARCHAR(255)
) ENGINE=InnoDB ROW_FORMAT=COMPACT;
```

### DYNAMIC

The default in MySQL 8.0. DYNAMIC stores long variable-length column values entirely on overflow pages rather than splitting them at 768 bytes. This makes the row itself smaller, which means more rows fit on a B-tree page and index performance improves for wide rows with long VARCHAR or BLOB columns.

```sql
CREATE TABLE dynamic_table (
  id INT PRIMARY KEY,
  description TEXT,
  payload JSON
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC;
```

### COMPRESSED

COMPRESSED uses the same overflow approach as DYNAMIC but also applies zlib compression to both the row data and index pages. This significantly reduces storage space at the cost of CPU overhead for compression and decompression.

```sql
CREATE TABLE compressed_table (
  id INT PRIMARY KEY,
  content LONGTEXT
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;
```

`KEY_BLOCK_SIZE` sets the compressed page size in kilobytes (1, 2, 4, 8, or 16).

## Checking the Row Format of Existing Tables

```sql
SELECT table_name, row_format
FROM information_schema.tables
WHERE table_schema = 'mydb';
```

```text
+------------------+------------+
| table_name       | row_format |
+------------------+------------+
| orders           | Dynamic    |
| audit_log        | Compressed |
| legacy_import    | Compact    |
+------------------+------------+
```

## Changing the Row Format

```sql
ALTER TABLE orders ROW_FORMAT=DYNAMIC;
```

This rebuilds the table, so run it during a maintenance window or use `pt-online-schema-change` or `gh-ost` for large tables.

## Row Format and Barracuda File Format

In MySQL 5.6 and 5.7, DYNAMIC and COMPRESSED required the Barracuda file format (`innodb_file_format=Barracuda`) and `innodb_file_per_table=ON`. In MySQL 8.0 the file format concept was removed and `innodb_file_per_table` defaults to ON, so no additional configuration is needed.

## Impact on Index Limitations

The InnoDB index key prefix limit is 767 bytes with COMPACT/REDUNDANT and 3072 bytes with DYNAMIC/COMPRESSED. In MySQL 5.7 this required `innodb_large_prefix=ON`; in MySQL 8.0 the variable was removed and 3072 bytes is always the limit for DYNAMIC/COMPRESSED. This is why switching to DYNAMIC resolves errors like:

```text
ERROR 1071 (42000): Specified key was too long; max key length is 767 bytes
```

## Summary

InnoDB row formats control the physical layout of row data. DYNAMIC is the right choice for most MySQL 8.0 tables - it handles variable-length columns efficiently, supports longer index prefixes, and avoids unnecessary CPU overhead. COMPRESSED is useful when storage cost is a priority and the workload is read-heavy. REDUNDANT and COMPACT are legacy formats that should only be used when migrating older schemas.
