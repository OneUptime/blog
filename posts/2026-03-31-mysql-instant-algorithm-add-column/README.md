# How to Add a Column Instantly in MySQL 8 (INSTANT Algorithm)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, InnoDB, Performance, Schema

Description: Learn how to use ALGORITHM=INSTANT in MySQL 8 to add columns to large tables in milliseconds without a table rebuild or any read/write blocking.

---

## What Is ALGORITHM=INSTANT?

Introduced in MySQL 8.0.12, `ALGORITHM=INSTANT` allows certain `ALTER TABLE` operations to complete by modifying only the InnoDB data dictionary. No rows are read or written, so the operation takes the same time whether the table has 100 rows or 1 billion rows.

## Adding a Column Instantly

```sql
ALTER TABLE orders
    ADD COLUMN priority TINYINT NOT NULL DEFAULT 0 COMMENT 'Fulfillment priority 1-5',
    ALGORITHM = INSTANT;
```

The column is logically added immediately. Existing rows will return the default value when the column is read until those rows are physically updated.

## Verifying the Algorithm Was Used

Check the `INSTANT_COLS` counter in the InnoDB data dictionary:

```sql
SELECT NAME, INSTANT_COLS
FROM information_schema.INNODB_TABLES
WHERE NAME = 'your_database/orders';
```

A non-zero value indicates the table has columns added via INSTANT.

## Supported Operations for INSTANT

```sql
-- Add a nullable column (with or without default)
ALTER TABLE products ADD COLUMN description TEXT NULL, ALGORITHM=INSTANT;

-- Add a NOT NULL column with a default value
ALTER TABLE products ADD COLUMN is_active TINYINT NOT NULL DEFAULT 1, ALGORITHM=INSTANT;

-- Change column default value
ALTER TABLE products ALTER COLUMN is_active SET DEFAULT 0, ALGORITHM=INSTANT;

-- Drop a column default
ALTER TABLE products ALTER COLUMN is_active DROP DEFAULT, ALGORITHM=INSTANT;
```

## Operations NOT Supported by INSTANT

```sql
-- Changing data type - requires COPY
ALTER TABLE orders MODIFY COLUMN total BIGINT, ALGORITHM=COPY;

-- Adding an index - use INPLACE
ALTER TABLE orders ADD INDEX idx_priority (priority), ALGORITHM=INPLACE, LOCK=NONE;
```

## Multiple Instant Columns and Row Format

The INSTANT algorithm stores column metadata in the row header when rows are first written after the INSTANT add. If a table accumulates many INSTANT columns, consider a full table rebuild to normalize the row format:

```sql
-- Rebuild the table to merge all INSTANT columns into the physical format
ALTER TABLE orders FORCE, ALGORITHM=INPLACE, LOCK=NONE;
```

## Falling Back Gracefully

If your MySQL version or table configuration does not support INSTANT for a given operation, MySQL will raise an error rather than silently choosing a slower algorithm. This predictable behavior is useful in deployment scripts:

```bash
mysql -u root -p your_db -e "
  ALTER TABLE orders
    ADD COLUMN retry_count INT NOT NULL DEFAULT 0,
    ALGORITHM=INSTANT;
" || echo "INSTANT not supported, falling back to INPLACE"
```

## Performance Comparison

```text
Table rows: 500 million
ALGORITHM=COPY:    ~45 minutes, table locked for writes
ALGORITHM=INPLACE: ~12 minutes, writes allowed
ALGORITHM=INSTANT: < 1 second,  no blocking
```

## Summary

`ALGORITHM=INSTANT` is the preferred way to add columns to large MySQL 8 tables. It modifies only the data dictionary and introduces zero downtime. Always specify it explicitly, handle the error if unsupported, and periodically rebuild tables with many INSTANT columns to keep the row format clean.
