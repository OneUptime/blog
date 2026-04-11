# What Is the MySQL Data Dictionary

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Dictionary, InnoDB, Metadata, MySQL 8

Description: The MySQL data dictionary is a centralized InnoDB-based catalog introduced in MySQL 8.0 that stores all schema metadata, replacing the older file-based approach.

---

## Overview

The MySQL data dictionary is the internal repository that stores metadata about all database objects: tables, columns, indexes, stored procedures, views, triggers, and more. In MySQL 8.0, the data dictionary was completely redesigned. The old approach stored metadata in `.frm` files on disk alongside individual table files. MySQL 8.0 replaced this with a centralized, transactional data dictionary stored in InnoDB tables within the `mysql` system database.

## What Changed in MySQL 8.0

Before MySQL 8.0:
- Each table had a `.frm` file in the data directory containing its definition.
- `INFORMATION_SCHEMA` queries read from these files, which was slow.
- Schema operations were not fully transactional -- a crash during `ALTER TABLE` could leave `.frm` and InnoDB dictionary out of sync.

In MySQL 8.0:
- All metadata lives in transactional InnoDB tables.
- Dictionary tables are hidden from users but exposed through `INFORMATION_SCHEMA` views.
- Schema operations are fully atomic: they either complete entirely or are rolled back.
- Startup is faster because dictionary data is cached in the InnoDB buffer pool.

## How the Data Dictionary Is Structured

The data dictionary is stored in the `mysql` schema in tables like `mysql.tables`, `mysql.columns`, `mysql.indexes`, etc. These are not directly accessible:

```sql
-- These tables exist but cannot be queried directly
SELECT * FROM mysql.tables;  -- ERROR: Access denied
```

Instead, MySQL exposes the data through `INFORMATION_SCHEMA` views:

```sql
-- This reads from the data dictionary via an INFORMATION_SCHEMA view
SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'mydb';
```

## Atomic DDL

Atomic DDL is one of the most important benefits of the new data dictionary. In MySQL 8.0, DDL statements like `CREATE TABLE`, `DROP TABLE`, `ALTER TABLE`, and `RENAME TABLE` are fully atomic:

```sql
-- If this crashes midway, the data dictionary ensures a clean rollback
DROP TABLE IF EXISTS old_table, new_table;

-- Renaming multiple tables is atomic
RENAME TABLE t1 TO t1_backup, t2 TO t1;
```

In older MySQL versions, a crash during multi-table DDL could leave the server in an inconsistent state where `.frm` files existed without corresponding InnoDB data.

## Managing the Data Dictionary

The data dictionary is managed automatically. Most interactions are indirect:

```sql
-- View table definition stored in data dictionary
SHOW CREATE TABLE orders;

-- Close and reopen the table, refreshing cached table definitions
FLUSH TABLES orders;

-- Check the table for errors and inconsistencies
CHECK TABLE orders EXTENDED;
```

## Impact on Backup and Recovery

Because the data dictionary is stored in InnoDB, it is included in physical InnoDB backups automatically. Tools like `mysqldump` and MySQL Enterprise Backup handle the data dictionary correctly without special configuration.

```bash
# Physical backup includes data dictionary automatically
mysqlbackup --backup-dir=/backups/full backup
```

## Upgrading from MySQL 5.7

When upgrading from MySQL 5.7 to 8.0, the upgrade process converts `.frm` files to data dictionary entries automatically. Before upgrading, use MySQL Shell's upgrade checker to identify potential issues:

```javascript
util.checkForServerUpgrade('root@localhost:3306')
```

## Summary

The MySQL data dictionary in version 8.0 replaces the old file-based metadata system with a centralized, transactional InnoDB store. This enables atomic DDL, faster `INFORMATION_SCHEMA` queries, and eliminates `.frm` file inconsistencies. The data dictionary is managed automatically by MySQL and is exposed to users through `INFORMATION_SCHEMA` views and standard DDL commands.
