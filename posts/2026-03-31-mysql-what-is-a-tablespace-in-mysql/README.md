# What Is a Tablespace in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Tablespace, Storage, Database Administration

Description: A tablespace in MySQL is a storage container that maps database objects to physical files on disk, controlling how InnoDB stores and manages data.

---

## Overview

A tablespace is the physical storage unit used by the InnoDB storage engine to organize and persist data on disk. Every InnoDB table, index, and undo log resides in some tablespace. Understanding tablespaces helps you optimize disk layout, manage storage quotas, and improve backup and recovery strategies.

## Types of Tablespaces in MySQL

MySQL supports several tablespace types:

| Type | Description |
|------|-------------|
| System Tablespace | Shared storage for change buffer and system data |
| File-Per-Table | Each table gets its own `.ibd` file |
| General Tablespace | A shared tablespace for multiple tables |
| Undo Tablespace | Dedicated storage for undo logs |
| Temporary Tablespace | Used for temporary tables and sort operations |

## System Tablespace

The system tablespace (`ibdata1` by default) is the original shared tablespace. In older MySQL versions it stored all InnoDB data. Today it primarily holds the change buffer.

```sql
-- Check system tablespace file location
SHOW VARIABLES LIKE 'innodb_data_file_path';
```

```text
+-----------------------+------------------------+
| Variable_name         | Value                  |
+-----------------------+------------------------+
| innodb_data_file_path | ibdata1:12M:autoextend |
+-----------------------+------------------------+
```

## File-Per-Table Tablespace

The recommended mode since MySQL 5.6, where each table gets its own `.ibd` file. This makes it easy to manage, move, or delete individual tables.

```sql
-- Check if file-per-table is enabled (default ON in MySQL 8)
SHOW VARIABLES LIKE 'innodb_file_per_table';
```

```text
+-----------------------+-------+
| Variable_name         | Value |
+-----------------------+-------+
| innodb_file_per_table | ON    |
+-----------------------+-------+
```

Creating a table automatically creates an `.ibd` file:

```sql
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    total DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

This creates `orders.ibd` in the database directory.

## General Tablespace

A general tablespace lets you group multiple tables into a single shared file, with more control over file placement:

```sql
-- Create a general tablespace
CREATE TABLESPACE ts_app
    ADD DATAFILE '/var/lib/mysql/ts_app.ibd'
    ENGINE = InnoDB;

-- Create a table in the general tablespace
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    price DECIMAL(10,2)
) TABLESPACE ts_app;

-- Move an existing table to a different tablespace
ALTER TABLE orders TABLESPACE ts_app;
```

## Undo Tablespace

Undo tablespaces store undo logs used for MVCC (multi-version concurrency control) and transaction rollbacks. MySQL 8 creates two undo tablespaces by default.

```sql
-- View undo tablespaces
SELECT TABLESPACE_NAME, FILE_NAME, FILE_TYPE, ENGINE
FROM INFORMATION_SCHEMA.FILES
WHERE FILE_TYPE = 'UNDO LOG';
```

You can add more undo tablespaces for better I/O distribution:

```sql
-- Create an additional undo tablespace
CREATE UNDO TABLESPACE undo_003
    ADD DATAFILE 'undo_003.ibu';

-- Set it active
ALTER UNDO TABLESPACE undo_003 SET ACTIVE;
```

## Temporary Tablespace

The global temporary tablespace (`ibtmp1`) is recreated on every MySQL startup and holds data for on-disk temporary tables.

```sql
-- Check temporary tablespace settings
SHOW VARIABLES LIKE 'innodb_temp_data_file_path';
```

Session-specific temporary tablespaces (one per session using temporary tables) are stored in a dedicated directory:

```sql
SHOW VARIABLES LIKE 'innodb_temp_tablespaces_dir';
```

## Viewing Tablespace Information

```sql
-- List all tablespaces via INFORMATION_SCHEMA
SELECT
    TABLESPACE_NAME,
    FILE_NAME,
    FILE_TYPE,
    ENGINE,
    ROUND(TOTAL_EXTENTS * EXTENT_SIZE / 1024 / 1024, 2) AS total_mb
FROM INFORMATION_SCHEMA.FILES
WHERE ENGINE = 'InnoDB'
ORDER BY TABLESPACE_NAME;
```

## Transporting Tablespaces

You can move a file-per-table tablespace between servers for fast data migration:

```sql
-- On source server: flush and export
FLUSH TABLES orders FOR EXPORT;
-- Copy orders.ibd and orders.cfg to target server
UNLOCK TABLES;

-- On target server: create matching table structure, discard, then import
CREATE TABLE orders (...);
ALTER TABLE orders DISCARD TABLESPACE;
-- Place .ibd and .cfg files in target data directory
ALTER TABLE orders IMPORT TABLESPACE;
```

## Summary

MySQL tablespaces are the physical storage layer for InnoDB data, giving you control over how tables map to files on disk. Using file-per-table mode simplifies table management and backup, while general tablespaces allow fine-grained placement of data across storage volumes. Understanding tablespace types is essential for performance tuning, storage management, and disaster recovery planning.
