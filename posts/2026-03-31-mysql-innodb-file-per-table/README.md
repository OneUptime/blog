# How to Configure innodb_file_per_table in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Storage, Configuration, Tablespace

Description: Learn how innodb_file_per_table works in MySQL, its benefits over the shared tablespace, and how to manage per-table .ibd files.

---

## What Is innodb_file_per_table?

`innodb_file_per_table` controls whether each InnoDB table stores its data and index in a dedicated `.ibd` file or in the shared system tablespace (`ibdata1`). Since MySQL 5.6, this setting defaults to ON, meaning each table gets its own tablespace file.

## Checking the Current Setting

```sql
SHOW VARIABLES LIKE 'innodb_file_per_table';
-- Default: ON
```

## How It Works

With `innodb_file_per_table = ON`:

```bash
# Each table has its own file
ls -lh /var/lib/mysql/mydb/
# mydb/orders.ibd       - orders table data + indexes
# mydb/customers.ibd    - customers table data + indexes
# mydb/products.ibd     - products table data + indexes
```

With `innodb_file_per_table = OFF`:

```bash
# All InnoDB tables go into the shared system tablespace
ls -lh /var/lib/mysql/
# ibdata1               - all tables stored here (grows indefinitely)
```

## Benefits of File Per Table

**1. Reclaim disk space after DROP TABLE or TRUNCATE:**

```sql
-- With file_per_table=ON: dropping the table frees the .ibd file
DROP TABLE large_archive_table;
-- Disk space is immediately reclaimed

-- With shared tablespace: space is NOT returned to the OS
-- ibdata1 never shrinks automatically
```

**2. OPTIMIZE TABLE can shrink individual files:**

```sql
-- Defragment and reclaim space in an individual table file
OPTIMIZE TABLE orders;
-- Rewrites orders.ibd, removing fragmentation
```

**3. Individual file-level operations:**

```sql
-- Export a single table for transport to another server
FLUSH TABLES orders FOR EXPORT;
-- Then copy orders.ibd and orders.cfg to the destination
```

```bash
# Easier per-table backup with tools like Percona XtraBackup
```

## Enabling or Disabling

```ini
# my.cnf
[mysqld]
innodb_file_per_table = ON   # default and recommended
```

To change:

```sql
-- Enable dynamically (affects new tables created after this point)
SET GLOBAL innodb_file_per_table = ON;

-- Existing tables in shared tablespace are NOT moved automatically
-- Must rebuild existing tables:
ALTER TABLE existing_table ENGINE = InnoDB;
```

## Checking Which Tablespace Each Table Uses

```sql
-- List all InnoDB tables and their tablespace
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    CREATE_OPTIONS
FROM information_schema.TABLES
WHERE ENGINE = 'InnoDB'
  AND TABLE_SCHEMA NOT IN ('mysql', 'information_schema', 'performance_schema')
ORDER BY TABLE_SCHEMA, TABLE_NAME;
```

```sql
-- Check tablespace file paths
SELECT
    SPACE,
    NAME,
    FILE_SIZE / 1024 / 1024 AS size_mb,
    ALLOCATED_SIZE / 1024 / 1024 AS allocated_mb
FROM information_schema.INNODB_TABLESPACES
WHERE SPACE_TYPE = 'Single'
ORDER BY FILE_SIZE DESC
LIMIT 20;
```

## Fragmentation and OPTIMIZE TABLE

Over time, heavy UPDATE/DELETE workloads fragment `.ibd` files:

```sql
-- Check table fragmentation
SELECT
    TABLE_NAME,
    DATA_FREE / 1024 / 1024 AS free_space_mb,
    DATA_LENGTH / 1024 / 1024 AS data_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb'
  AND ENGINE = 'InnoDB'
ORDER BY DATA_FREE DESC;

-- Reclaim fragmented space (causes table rebuild - use during maintenance window)
OPTIMIZE TABLE orders;
```

## When to Use Shared Tablespace Instead

The shared tablespace (`innodb_file_per_table = OFF`) may be preferable when:

- The database has thousands of tables (many `.ibd` files can stress the filesystem)
- Storage encryption is managed at the tablespace level and simplicity is preferred
- The OS has file descriptor limits that restrict large numbers of open files

## Summary

`innodb_file_per_table = ON` (the default) gives each InnoDB table its own `.ibd` file, enabling disk space reclamation after DROP or TRUNCATE, per-table OPTIMIZE operations, and easier backup and transport. It is the recommended setting for most workloads. The shared tablespace remains appropriate for deployments with very large numbers of small tables where filesystem overhead is a concern.
