# How to Fix ERROR 1118 Row Size Too Large in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error Handling, Troubleshooting, InnoDB

Description: Learn how to diagnose and fix MySQL ERROR 1118 'Row size too large' by adjusting row format, moving large columns, and optimizing table structure.

---

## What is ERROR 1118

MySQL ERROR 1118 appears as:

```text
ERROR 1118 (42000): Row size too large (> 8126). Changing some columns to TEXT or BLOB may help. In current row format, BLOB prefix of 0 bytes is stored inline.
```

Or the more common variant:

```text
ERROR 1118 (42000): Row size too large. The maximum row size for the used table type, not counting BLOBs, is 65535.
```

The error occurs when the total size of all columns in a row exceeds InnoDB's maximum inline row size limit, which depends on the page size (typically 16KB) and row format.

## Understanding InnoDB Row Size Limits

- InnoDB default page size is 16KB
- Maximum row size in `COMPACT` or `REDUNDANT` format is approximately 8,126 bytes
- `DYNAMIC` and `COMPRESSED` formats allow off-page storage for variable-length columns
- `BLOB`, `TEXT`, `VARCHAR` columns can overflow to external pages in `DYNAMIC` format

## Checking Current Row Format

```sql
SELECT table_name, row_format, engine
FROM information_schema.tables
WHERE table_schema = 'your_database'
  AND table_name = 'your_table';
```

## Fix 1 - Change to DYNAMIC Row Format

The most effective fix is switching to the `DYNAMIC` row format, which stores variable-length column data off-page:

```sql
ALTER TABLE your_table ROW_FORMAT=DYNAMIC;
```

Or set it globally for all new tables in `/etc/mysql/my.cnf`:

```text
[mysqld]
innodb_default_row_format = DYNAMIC
```

## Fix 2 - Enable innodb_strict_mode Off (Temporary)

This allows table creation to proceed but can mask real issues - use only temporarily:

```sql
SET innodb_strict_mode = OFF;
-- Run your CREATE or ALTER TABLE
SET innodb_strict_mode = ON;
```

## Fix 3 - Convert VARCHAR to TEXT or BLOB

Converting large `VARCHAR` columns to `TEXT` reduces inline storage since `TEXT`/`BLOB` data is stored off-page in `DYNAMIC` format:

```sql
-- This fails with ERROR 1118 due to large VARCHAR columns
CREATE TABLE documents (
  id INT PRIMARY KEY,
  content1 VARCHAR(10000),
  content2 VARCHAR(10000),
  content3 VARCHAR(10000)
);
-- ERROR 1118

-- Fix: use TEXT type instead
CREATE TABLE documents (
  id INT PRIMARY KEY,
  content1 TEXT,
  content2 TEXT,
  content3 TEXT
);
```

If the table already exists with large `VARCHAR` columns, alter it in place:

```sql
ALTER TABLE documents
  MODIFY content1 TEXT,
  MODIFY content2 TEXT,
  MODIFY content3 TEXT;
```

## Fix 4 - Reduce VARCHAR Column Sizes

If columns are oversized by design, reduce them:

```sql
-- If actual data rarely exceeds 500 chars, shrink it
ALTER TABLE profiles
  MODIFY bio VARCHAR(1000),
  MODIFY description VARCHAR(500);
```

## Fix 5 - Split the Table

If the table legitimately needs many large columns, normalize it:

```sql
-- Original wide table
-- CREATE TABLE user_profile (user_id, name, address, bio, preferences, settings ...)

-- Split into related tables
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100)
);

CREATE TABLE user_bio (
  user_id INT PRIMARY KEY,
  bio TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_settings (
  user_id INT PRIMARY KEY,
  preferences JSON,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Diagnosing Column Sizes

Calculate approximate row size for a table:

```sql
SELECT
  column_name,
  data_type,
  character_maximum_length,
  character_maximum_length * 4 AS max_bytes_utf8mb4
FROM information_schema.columns
WHERE table_schema = 'your_database'
  AND table_name = 'your_table'
ORDER BY character_maximum_length DESC;
```

## Summary

ERROR 1118 in MySQL is resolved by switching the table to `DYNAMIC` row format (so large variable-length columns spill to off-page storage), converting oversized `VARCHAR` columns to `TEXT`, or splitting the table into related entities. Setting `innodb_default_row_format = DYNAMIC` in `my.cnf` prevents this issue for all future tables.
