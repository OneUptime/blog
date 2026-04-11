# How to Use Instant ADD COLUMN in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema, Migration, Performance, InnoDB

Description: Learn how MySQL 8.0 Instant ADD COLUMN lets you add columns to large tables without rebuilding the entire table on disk.

---

## The Problem with Traditional ALTER TABLE

In earlier MySQL versions, adding a column to a large table required a full table rebuild. MySQL would create a new copy of the table with the new column, copy all rows, and then swap the files. For a table with hundreds of millions of rows, this could take hours and lock the table for the duration.

MySQL 8.0 introduced `ALGORITHM=INSTANT` for `ADD COLUMN`, which makes this operation nearly instantaneous regardless of table size.

## How Instant ADD COLUMN Works

Instead of rebuilding the table, MySQL stores the new column's metadata and default value in the data dictionary. Existing rows are not rewritten. When MySQL reads an old row, it knows to return the default value for the new column. When new rows are inserted, they include the new column value.

```sql
-- Traditional approach (full table copy, slow on large tables)
ALTER TABLE orders ADD COLUMN notes TEXT, ALGORITHM=COPY;

-- Instant approach (no table rebuild, milliseconds regardless of size)
ALTER TABLE orders ADD COLUMN notes TEXT, ALGORITHM=INSTANT;
```

## Basic Usage

```sql
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add a column instantly - no table lock, no data copy
ALTER TABLE products
    ADD COLUMN description TEXT DEFAULT NULL,
    ALGORITHM=INSTANT;

-- Add a column with a default value
ALTER TABLE products
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1,
    ALGORITHM=INSTANT;
```

## Checking if Instant Is Supported

You can verify whether a specific ALTER operation supports INSTANT:

```sql
-- Use ALGORITHM=INSTANT with a LOCK clause to test feasibility
ALTER TABLE products
    ADD COLUMN weight DECIMAL(8,3) DEFAULT NULL,
    ALGORITHM=INSTANT,
    LOCK=NONE;
-- If it runs successfully, INSTANT is supported for this operation
```

If INSTANT is not supported for your operation, MySQL will return an error so you can fall back to INPLACE or COPY.

## Monitoring Instant Columns

MySQL tracks instant column changes via the `information_schema`. In MySQL 8.0.29+, use `TOTAL_ROW_VERSIONS` to see how many row versions have been created by instant DDL operations:

```sql
SELECT
    TABLE_NAME,
    TOTAL_ROW_VERSIONS
FROM information_schema.INNODB_TABLES
WHERE NAME LIKE 'your_database/%';
```

After many instant column additions, it is good practice to eventually rebuild the table to consolidate the physical layout:

```sql
-- Full rebuild to clean up instant column metadata overhead
ALTER TABLE products FORCE, ALGORITHM=INPLACE;
```

## Limitations

Not every ADD COLUMN operation supports INSTANT. Columns must be added at the end of the table (in MySQL 8.0.29+, you can specify position with `AFTER column_name`). Tables with a `FULLTEXT` index, tables in the data dictionary tablespace, and temporary tables do not support INSTANT. Row format must not be `COMPRESSED` (`DYNAMIC`, `COMPACT`, and `REDUNDANT` are supported).

```sql
-- Check row format
SELECT TABLE_NAME, ROW_FORMAT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'your_database'
  AND TABLE_NAME = 'products';

-- Convert to DYNAMIC if needed
ALTER TABLE products ROW_FORMAT=DYNAMIC;
```

## Summary

Instant ADD COLUMN in MySQL 8.0 is a major quality-of-life improvement for database operations teams. By storing new column metadata in the data dictionary rather than rebuilding the entire table, schema migrations that used to require multi-hour maintenance windows can now complete in milliseconds, enabling zero-downtime deployments even on very large production tables.
