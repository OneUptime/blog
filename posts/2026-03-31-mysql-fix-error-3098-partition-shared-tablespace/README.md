# How to Fix ERROR 3098 Table Has a Partition in Shared Tablespace in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partition, Error, InnoDB, Tablespace

Description: Fix MySQL ERROR 3098 by enabling innodb_file_per_table and rebuilding partitioned tables to use per-partition tablespace files instead of the shared tablespace.

---

MySQL ERROR 3098 occurs when attempting to add partitions to or import/export a partitioned table that was created when `innodb_file_per_table = OFF`. The error reads: `ERROR 3098 (HY000): The table does not comply with the requirements by an external plugin. Table 'mydb.orders' is in the shared tablespace`.

## Why This Happens

When `innodb_file_per_table = OFF`, InnoDB stores all table data in the shared `ibdata1` file. Partitioned tables stored in the shared tablespace cannot be exported, imported into a different MySQL instance, or have some DDL operations performed on them. MySQL 8.0 also requires partitioned tables to use per-table tablespace files.

## Check the Current Setting

```sql
SHOW VARIABLES LIKE 'innodb_file_per_table';

-- Check which tablespace the table uses
SELECT TABLE_NAME, CREATE_OPTIONS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'orders';

-- Check tablespace for each partition (MySQL 5.7)
SELECT NAME, SPACE, FILE_FORMAT
FROM information_schema.INNODB_SYS_TABLESPACES
WHERE NAME LIKE 'mydb/orders%';

-- MySQL 8.0 equivalent (table renamed, FILE_FORMAT removed)
SELECT NAME, SPACE
FROM information_schema.INNODB_TABLESPACES
WHERE NAME LIKE 'mydb/orders%';
```

## Fix Step 1: Enable innodb_file_per_table

```sql
SET GLOBAL innodb_file_per_table = ON;
```

Or in `my.cnf`:

```text
[mysqld]
innodb_file_per_table = ON
```

Enabling this setting only affects new tables. Existing tables remain in the shared tablespace until rebuilt.

## Fix Step 2: Rebuild the Table

To move an existing partitioned table from shared to per-table tablespace:

```sql
-- Option 1: ALTER TABLE with ALGORITHM=COPY (rebuilds table by copying)
ALTER TABLE orders ENGINE = InnoDB, ALGORITHM = COPY;

-- Option 2: OPTIMIZE TABLE (also rebuilds)
OPTIMIZE TABLE orders;
```

Verify the table is now using per-table tablespace:

```sql
-- MySQL 5.7
SELECT NAME, SPACE
FROM information_schema.INNODB_SYS_TABLESPACES
WHERE NAME LIKE 'mydb/orders%';

-- MySQL 8.0
SELECT NAME, SPACE
FROM information_schema.INNODB_TABLESPACES
WHERE NAME LIKE 'mydb/orders%';
```

## Fix Step 3: For Large Tables - Export and Reimport

For very large tables where in-place rebuild is not practical:

```bash
# Dump with structure and data
mysqldump -u root -p --single-transaction \
  mydb orders > orders_backup.sql
```

```sql
-- Drop the old table
DROP TABLE orders;

-- Verify innodb_file_per_table is ON
SHOW VARIABLES LIKE 'innodb_file_per_table';
```

```bash
# Recreate from dump (will use per-table tablespace)
mysql -u root -p mydb < orders_backup.sql
```

## Fix for MySQL 8.0 Upgrade

MySQL 8.0 enforces per-table tablespace for partitioned tables. Before upgrading:

```bash
# Check all partitioned tables in shared tablespace
mysql -u root -p -e "
SELECT TABLE_SCHEMA, TABLE_NAME
FROM information_schema.TABLES
WHERE CREATE_OPTIONS LIKE '%partitioned%';" | while read schema table; do
  echo "ALTER TABLE \`$schema\`.\`$table\` ENGINE=InnoDB, ALGORITHM=COPY;"
done
```

## Verify After Fix

```sql
-- Confirm individual .ibd files exist for each partition
SHOW TABLE STATUS FROM mydb LIKE 'orders';

-- Check partitions
SELECT PARTITION_NAME, TABLE_ROWS
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'orders';
```

## Summary

ERROR 3098 requires moving a partitioned table from the shared InnoDB tablespace to individual per-table tablespace files. Enable `innodb_file_per_table = ON`, then rebuild the table using `ALTER TABLE ... ENGINE = InnoDB` or by dumping and reimporting. This is a required step before upgrading to MySQL 8.0 which enforces per-table tablespace for all partitioned tables.
