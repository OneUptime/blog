# How to Manage MySQL Tablespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Tablespace, InnoDB, Storage, Administration

Description: Learn how to manage MySQL InnoDB tablespaces including the system tablespace, file-per-table tablespaces, and general tablespaces.

---

MySQL InnoDB uses tablespaces to organize how data is physically stored on disk. Understanding the different tablespace types and how to manage them gives you control over storage layout, reclamation of disk space, and performance tuning.

## Types of InnoDB Tablespaces

InnoDB uses several types of tablespaces:

- **System tablespace** (`ibdata1`) - Stores the data dictionary (MySQL 5.7 and below), undo logs (older configurations), and the doublewrite buffer (before MySQL 8.0.20)
- **File-per-table tablespaces** - One `.ibd` file per table when `innodb_file_per_table` is ON
- **General tablespaces** - Named tablespaces that can contain multiple tables
- **Undo tablespaces** - Stores undo log segments for MVCC
- **Temporary tablespace** - Holds temporary tables

## Checking File-per-Table Status

```sql
SHOW VARIABLES LIKE 'innodb_file_per_table';
```

Enable file-per-table (recommended, and default in MySQL 5.6.6+):

```ini
[mysqld]
innodb_file_per_table = ON
```

With this setting, each table creates its own `.ibd` file, making it easier to manage storage and reclaim space.

## Viewing Tablespace Information

List all tablespaces:

```sql
SELECT FILE_ID, FILE_NAME, FILE_TYPE, TABLESPACE_NAME, FREE_EXTENTS, TOTAL_EXTENTS
FROM information_schema.FILES
WHERE FILE_TYPE = 'TABLESPACE'
ORDER BY TABLESPACE_NAME;
```

Check the size and location of InnoDB tablespace files:

```sql
SELECT FILE_NAME, ROUND(TOTAL_EXTENTS * EXTENT_SIZE / 1024 / 1024, 2) AS size_mb
FROM information_schema.FILES
WHERE FILE_TYPE != 'TEMPORARY';
```

## Creating a General Tablespace

General tablespaces let you place multiple tables in a single named file:

```sql
CREATE TABLESPACE ts_archive
  ADD DATAFILE '/data/mysql/ts_archive.ibd'
  ENGINE = InnoDB;
```

Create a table in the general tablespace:

```sql
CREATE TABLE archive_orders (
  id BIGINT PRIMARY KEY,
  order_date DATE,
  amount DECIMAL(10,2)
) ENGINE=InnoDB TABLESPACE ts_archive;
```

Move an existing table into a general tablespace:

```sql
ALTER TABLE old_orders TABLESPACE ts_archive;
```

## Moving a Table to a Specific Tablespace

Move a table to the default file-per-table tablespace:

```sql
ALTER TABLE mydb.orders TABLESPACE innodb_file_per_table;
```

Move to the system tablespace:

```sql
ALTER TABLE mydb.orders TABLESPACE innodb_system;
```

## Dropping a General Tablespace

Before dropping a general tablespace, move all tables out of it:

```sql
ALTER TABLE archive_orders TABLESPACE innodb_file_per_table;
DROP TABLESPACE ts_archive;
```

## Reclaiming Space from InnoDB Tables

When you delete rows from an InnoDB table, the space is not automatically returned to the OS. To reclaim it:

```sql
OPTIMIZE TABLE mydb.large_table;
```

For tables in file-per-table tablespaces, this rebuilds the `.ibd` file with only active data. For tables in the system tablespace, the space is reclaimed within `ibdata1` but the file does not shrink.

## Managing Undo Tablespaces

MySQL 8.0 uses dedicated undo tablespaces by default. Check their status:

```sql
SELECT NAME, FILE_SIZE, STATE
FROM information_schema.INNODB_TABLESPACES
WHERE ROW_FORMAT = 'Undo';
```

## Summary

MySQL InnoDB tablespace management starts with enabling `innodb_file_per_table` for flexible storage layout. Use general tablespaces to co-locate related tables on specific storage volumes, use `ALTER TABLE ... TABLESPACE` to move tables between tablespaces, and use `OPTIMIZE TABLE` to reclaim space after large deletes. Monitor tablespace sizes through `information_schema.FILES` to plan storage capacity.
