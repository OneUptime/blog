# How to Use InnoDB General Tablespaces in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Tablespace, Storage, Administration

Description: Learn how to create and manage InnoDB general tablespaces in MySQL to group multiple tables into shared storage files for better organization.

---

InnoDB general tablespaces allow multiple tables to share a single `.ibd` file, unlike the default file-per-table mode where each table gets its own file. This makes general tablespaces useful for grouping related tables, placing data on specific storage devices, or managing large numbers of tables more efficiently.

## Creating a General Tablespace

Use `CREATE TABLESPACE` to define a new general tablespace:

```sql
-- Create a general tablespace
CREATE TABLESPACE app_data
    ADD DATAFILE 'app_data.ibd'
    ENGINE=InnoDB;
```

By default, the datafile is created in the MySQL data directory. You can specify an absolute path to place it on a different storage volume:

```sql
-- Place on a high-performance SSD
CREATE TABLESPACE fast_ts
    ADD DATAFILE '/mnt/ssd/mysql/fast_ts.ibd'
    ENGINE=InnoDB;
```

## Adding Tables to a General Tablespace

Specify the `TABLESPACE` clause in `CREATE TABLE` or `ALTER TABLE`:

```sql
-- Create a new table in the general tablespace
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    total DECIMAL(10,2),
    created_at DATETIME
) TABLESPACE app_data;

-- Move an existing table into the tablespace
ALTER TABLE customers TABLESPACE app_data;
```

## Inspecting General Tablespaces

Query `information_schema` to see existing tablespaces and their contents:

```sql
-- List all general tablespaces
SELECT NAME, SPACE_TYPE, FILE_SIZE, ALLOCATED_SIZE
FROM information_schema.INNODB_TABLESPACES
WHERE SPACE_TYPE = 'General';

-- Find which tables are in a specific tablespace
SELECT TABLE_SCHEMA, TABLE_NAME
FROM information_schema.TABLES
WHERE CREATE_OPTIONS LIKE '%tablespace=app_data%';
```

You can also use:

```sql
SELECT NAME, SPACE, SPACE_TYPE
FROM information_schema.INNODB_TABLES
WHERE SPACE IN (
    SELECT SPACE FROM information_schema.INNODB_TABLESPACES
    WHERE NAME = 'app_data'
);
```

## Moving Tables Out of a General Tablespace

To move a table back to its own file-per-table tablespace:

```sql
ALTER TABLE orders TABLESPACE innodb_file_per_table;
```

## Row Format Considerations

General tablespaces support all row formats: `REDUNDANT`, `COMPACT`, `DYNAMIC`, and `COMPRESSED`. However, compressed and uncompressed tables cannot coexist in the same general tablespace due to different physical page sizes. To store compressed tables, specify `FILE_BLOCK_SIZE` when creating the tablespace:

```sql
-- Dynamic row format works fine in a standard general tablespace
CREATE TABLE large_blobs (
    id INT PRIMARY KEY,
    data LONGBLOB
) ROW_FORMAT=DYNAMIC TABLESPACE app_data;

-- For compressed tables, create a separate tablespace with FILE_BLOCK_SIZE
CREATE TABLESPACE compressed_ts
    ADD DATAFILE 'compressed_ts.ibd'
    FILE_BLOCK_SIZE = 8192
    ENGINE=InnoDB;

CREATE TABLE compressed_data (
    id INT PRIMARY KEY,
    payload TEXT
) ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8 TABLESPACE compressed_ts;
```

## Dropping a General Tablespace

A general tablespace can only be dropped after all its tables have been moved or dropped:

```sql
-- Move all tables out first
ALTER TABLE orders TABLESPACE innodb_file_per_table;
ALTER TABLE customers TABLESPACE innodb_file_per_table;

-- Then drop the tablespace
DROP TABLESPACE app_data;
```

## Use Cases

General tablespaces are practical when you need to colocate related tables on a specific disk, consolidate many small tables to reduce the OS file descriptor overhead, or apply uniform encryption and compression settings to a group of tables.

## Summary

InnoDB general tablespaces let you group multiple tables into a single datafile and control its physical location. Use `CREATE TABLESPACE` with `ADD DATAFILE`, then assign tables with `TABLESPACE` clause in `CREATE TABLE` or `ALTER TABLE`. Check `information_schema.INNODB_TABLESPACES` to audit your tablespace layout.
