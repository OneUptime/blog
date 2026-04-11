# What Is the InnoDB General Tablespace in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, General Tablespace, Tablespace Management, Storage

Description: Learn what a MySQL InnoDB general tablespace is, how to create one, and how to use it to group tables into shared storage files.

---

## What Is a General Tablespace

An InnoDB general tablespace is a shared tablespace file that can contain data from multiple tables. It was introduced in MySQL 5.7.6 as a middle ground between the system tablespace (one file for everything) and file-per-table tablespaces (one file per table).

A general tablespace is a user-created named tablespace. Tables can be explicitly assigned to it at creation time, allowing you to control where table data is stored.

## How It Differs from Other Tablespace Types

```text
Tablespace Type     Description
---------------     -----------
System              ibdata1 - shared, grows forever, stores internal structures
File-per-table      One .ibd file per table - most common modern configuration
General             Named shared file - user-created, multiple tables per file
Undo                Stores undo logs - separate from system tablespace in MySQL 8.0
Temporary           For temporary tables
```

## Creating a General Tablespace

Create a general tablespace with `CREATE TABLESPACE`:

```sql
-- Create a general tablespace in the data directory
CREATE TABLESPACE ts_archive
  ADD DATAFILE 'ts_archive.ibd'
  ENGINE = InnoDB;
```

You can specify an absolute path to place the file on a different disk:

```sql
CREATE TABLESPACE ts_fast
  ADD DATAFILE '/fast_disk/mysql/ts_fast.ibd'
  ENGINE = InnoDB;
```

Note that the file path must be inside the MySQL data directory or a directory specified by `innodb_directories`.

## Assigning Tables to a General Tablespace

Specify the tablespace when creating a table:

```sql
CREATE TABLE orders_2024 (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  total DECIMAL(10,2),
  created_at DATETIME
) TABLESPACE = ts_archive;
```

Move an existing table to a general tablespace:

```sql
ALTER TABLE orders_2023 TABLESPACE = ts_archive;
```

Move a table from a general tablespace to file-per-table:

```sql
ALTER TABLE orders_2024 TABLESPACE = innodb_file_per_table;
```

## Use Cases for General Tablespaces

**Archival storage**: Place older, less frequently accessed tables on cheaper, slower disks.

```sql
CREATE TABLESPACE ts_cold_storage
  ADD DATAFILE '/slow_disk/mysql/cold.ibd'
  ENGINE = InnoDB;

ALTER TABLE orders_2020 TABLESPACE = ts_cold_storage;
ALTER TABLE orders_2021 TABLESPACE = ts_cold_storage;
ALTER TABLE orders_2022 TABLESPACE = ts_cold_storage;
```

**SSD tiering**: Place hot tables on fast NVMe storage.

```sql
CREATE TABLESPACE ts_nvme
  ADD DATAFILE '/nvme/mysql/hot_tables.ibd'
  ENGINE = InnoDB;

ALTER TABLE user_sessions TABLESPACE = ts_nvme;
ALTER TABLE product_cache TABLESPACE = ts_nvme;
```

**Grouping related tables**: Simplify backup of related tables by placing them in the same file.

## Viewing General Tablespaces

List all tablespaces:

```sql
SELECT
  TABLESPACE_NAME,
  FILE_NAME,
  FILE_TYPE,
  ROUND(TOTAL_EXTENTS * EXTENT_SIZE / 1024 / 1024, 2) AS size_mb
FROM information_schema.FILES
WHERE FILE_TYPE = 'TABLESPACE'
ORDER BY TABLESPACE_NAME;
```

Find which tables are in a specific tablespace (MySQL 8.0+):

```sql
SELECT t.NAME AS table_name, ts.NAME AS tablespace_name
FROM information_schema.INNODB_TABLES t
JOIN information_schema.INNODB_TABLESPACES ts ON t.SPACE = ts.SPACE
WHERE ts.NAME = 'ts_archive';
```

## Dropping a General Tablespace

A general tablespace can only be dropped when it contains no tables:

```sql
-- First move or drop all tables in the tablespace
ALTER TABLE orders_2024 TABLESPACE = innodb_file_per_table;

-- Then drop the tablespace
DROP TABLESPACE ts_archive;
```

## Limitations

- A general tablespace file cannot be moved to a different server directory after creation without MySQL knowing
- Tables with compressed row format (ROW_FORMAT=COMPRESSED) cannot share a general tablespace with tables using other row formats
- Partitioned tables cannot be placed in a general tablespace

## Summary

An InnoDB general tablespace is a user-created named tablespace that can hold multiple tables in a single shared file. It provides more control over data placement than file-per-table tablespaces while being more flexible than the system tablespace. The primary use case is placing groups of tables on specific storage tiers - fast SSDs for hot data, slow HDDs for archival data - without the overhead of managing hundreds of individual `.ibd` files.
