# What Is the INSTANT Algorithm for ALTER TABLE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Instant Algorithm, Online DDL, Schema Change

Description: The INSTANT algorithm for ALTER TABLE in MySQL performs schema changes by modifying only metadata, completing in milliseconds regardless of table size.

---

## Overview

The `INSTANT` algorithm is the fastest ALTER TABLE option in MySQL. Instead of rebuilding or copying the table, it modifies only the table's metadata - the data dictionary - meaning the operation completes in constant time regardless of how many rows the table contains.

`INSTANT` was introduced in MySQL 8.0.12 for adding columns and has been expanded in subsequent releases to support more operations.

## Using the INSTANT Algorithm

```sql
-- Add a column instantly
ALTER TABLE orders
ADD COLUMN notes TEXT NULL,
ALGORITHM = INSTANT;

-- Drop a column instantly (MySQL 8.0.29+)
ALTER TABLE orders
DROP COLUMN deprecated_field,
ALGORITHM = INSTANT;

-- Rename a column instantly
ALTER TABLE users
RENAME COLUMN user_name TO username,
ALGORITHM = INSTANT;
```

## Operations Supported by INSTANT

| Operation | MySQL Version |
|-----------|--------------|
| Add column (at end) | 8.0.12 |
| Add column (any position) | 8.0.29 |
| Drop column | 8.0.29 |
| Drop virtual column | 8.0.12 |
| Rename column | 8.0.28 (instant) |
| Set column default | 8.0.12 |
| Drop column default | 8.0.12 |
| Change ENUM/SET definitions (add values) | 8.0.12 |

## How INSTANT Works Internally

Before INSTANT (INPLACE or COPY algorithms):
1. Create temp table with new schema
2. Copy all rows (takes time proportional to table size)
3. Swap tables

With INSTANT:
1. Update the data dictionary (InnoDB row format stores version info)
2. Done - no row copies needed

InnoDB uses row versioning to handle the schema difference: existing rows are read with the old format, and new rows are written with the new format.

## Checking If an Operation Supports INSTANT

```sql
-- Use ALGORITHM=INSTANT and let MySQL error if unsupported
ALTER TABLE my_large_table
ADD COLUMN status TINYINT DEFAULT 0,
ALGORITHM = INSTANT;
-- If error: 'ALGORITHM=INSTANT is not supported'
-- Then fall back to ALGORITHM=INPLACE
```

## Performance Comparison

For a table with 100 million rows:

| Algorithm | Time |
|-----------|------|
| COPY | 30-60 minutes |
| INPLACE | 5-15 minutes |
| INSTANT | < 1 second |

## INSTANT with Column Position

From MySQL 8.0.29, columns can be added at any position:

```sql
-- Add column after a specific column
ALTER TABLE products
ADD COLUMN weight DECIMAL(8,2) NULL AFTER price,
ALGORITHM = INSTANT;

-- Add column at the beginning
ALTER TABLE products
ADD COLUMN legacy_id INT NULL FIRST,
ALGORITHM = INSTANT;
```

## Limitations of INSTANT

Not all operations support INSTANT. These require INPLACE or COPY:
- Changing a column's data type
- Adding or modifying indexes
- Partitioning changes
- Changing character sets

## Checking Table Instant Row Version

```sql
-- Check if table has pending row versions from instant DDL changes
SELECT t.name, t.total_row_versions, t.n_cols
FROM information_schema.innodb_tables t
WHERE t.name LIKE 'mydb/%';
```

## Rebuilding After Multiple INSTANT Changes

After many INSTANT alterations, consider rebuilding the table to remove row version overhead:

```sql
-- Rebuild the table (compacts the row versions)
ALTER TABLE orders ENGINE = InnoDB, ALGORITHM = INPLACE, LOCK = NONE;
```

## Summary

The INSTANT algorithm for MySQL ALTER TABLE performs schema changes by updating only metadata, making it complete in under a second regardless of table size. It supports common operations like adding, dropping, and renaming columns in MySQL 8.0.29+. Always specify `ALGORITHM=INSTANT` explicitly for operations you know are supported, and fall back to INPLACE when needed.
