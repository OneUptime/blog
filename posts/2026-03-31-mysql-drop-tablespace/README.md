# How to Use DROP TABLESPACE Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Tablespace, InnoDB, Storage, DDL

Description: Learn how to use DROP TABLESPACE in MySQL to remove a general tablespace and reclaim disk space after relocating or dropping its tables.

---

## Overview

The `DROP TABLESPACE` statement removes an existing InnoDB general tablespace from MySQL. Before you can drop a tablespace, all tables that reside in it must be either dropped or moved to another tablespace. Once dropped, the underlying `.ibd` data file is deleted from disk.

## Basic Syntax

```sql
DROP TABLESPACE tablespace_name;
```

## Prerequisites Before Dropping

Attempting to drop a tablespace that still contains tables will fail with an error. You must first empty the tablespace.

### Option 1: Drop all tables in the tablespace

```sql
DROP TABLE orders;
DROP TABLE order_items;
```

### Option 2: Move tables to another tablespace

```sql
-- Move to per-file tablespace
ALTER TABLE orders     TABLESPACE innodb_file_per_table;
ALTER TABLE order_items TABLESPACE innodb_file_per_table;
```

### Option 3: Move tables to the system tablespace

```sql
ALTER TABLE orders TABLESPACE innodb_system;
```

## Checking Which Tables Use a Tablespace

Before dropping, verify which tables are assigned to the tablespace:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE CREATE_OPTIONS LIKE '%TABLESPACE=ts_fast_disk%';
```

Or query `INNODB_TABLES`:

```sql
SELECT NAME, SPACE_TYPE
FROM INFORMATION_SCHEMA.INNODB_TABLES
WHERE SPACE IN (
  SELECT SPACE
  FROM INFORMATION_SCHEMA.INNODB_TABLESPACES
  WHERE NAME = 'ts_fast_disk'
);
```

## Dropping the Tablespace

Once all tables have been moved or dropped:

```sql
DROP TABLESPACE ts_fast_disk;
```

MySQL will delete the `.ibd` file from the filesystem automatically. You do not need to remove the file manually.

## Dropping an Encrypted Tablespace

Encrypted tablespaces are dropped the same way:

```sql
DROP TABLESPACE ts_secure;
```

The encryption key remains in the keyring after the tablespace is dropped. Refer to the MySQL keyring documentation for key management best practices.

## Error: Tablespace Not Empty

If you attempt to drop a tablespace that still has tables:

```text
ERROR 3120 (HY000): Tablespace 'ts_fast_disk' is not empty.
```

Resolve by identifying and relocating the tables as described above.

## Full Workflow Example

```sql
-- 1. Create a tablespace
CREATE TABLESPACE ts_temp
  ADD DATAFILE 'ts_temp.ibd'
  ENGINE = InnoDB;

-- 2. Assign a table
CREATE TABLE temp_data (
  id   INT NOT NULL AUTO_INCREMENT,
  val  VARCHAR(100),
  PRIMARY KEY (id)
) TABLESPACE ts_temp;

-- 3. Move the table out before dropping
ALTER TABLE temp_data TABLESPACE innodb_file_per_table;

-- 4. Drop the tablespace
DROP TABLESPACE ts_temp;
```

## Summary

`DROP TABLESPACE` removes an InnoDB general tablespace and its associated data file from disk. The key requirement is that the tablespace must be empty - all tables must be dropped or moved to another tablespace first. Use `INFORMATION_SCHEMA` queries to identify which tables reside in a tablespace before attempting to drop it.
