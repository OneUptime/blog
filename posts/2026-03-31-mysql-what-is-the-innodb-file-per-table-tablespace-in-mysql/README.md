# What Is the InnoDB File-Per-Table Tablespace in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, File-Per-Table, Tablespace, ibdata, Storage Management

Description: Learn what the InnoDB file-per-table tablespace is, why it is the recommended default, and how it affects disk space management in MySQL.

---

## What Is File-Per-Table Tablespace

When `innodb_file_per_table` is enabled, each InnoDB table stores its data and indexes in its own dedicated file with a `.ibd` extension, located in the database directory. This is the default configuration in MySQL 5.6.6 and later.

Without file-per-table, all table data and indexes share the system tablespace (`ibdata1`), which grows over time and cannot shrink.

## Checking the Current Setting

```sql
SHOW VARIABLES LIKE 'innodb_file_per_table';
```

```text
+-----------------------+-------+
| Variable_name         | Value |
+-----------------------+-------+
| innodb_file_per_table | ON    |
+-----------------------+-------+
```

## Enabling File-Per-Table

Enable in `my.cnf`:

```ini
[mysqld]
innodb_file_per_table = ON
```

Or set at runtime (affects new tables only):

```sql
SET GLOBAL innodb_file_per_table = ON;
```

Tables created before the setting change remain in their original tablespace. To move existing tables:

```sql
ALTER TABLE orders ENGINE = InnoDB;
```

This rebuilds the table in its own `.ibd` file.

## How the .ibd File Is Organized

When you create a table with file-per-table enabled:

```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200),
  price DECIMAL(10,2),
  INDEX idx_name (name)
);
```

MySQL creates the following files in the `myapp/` directory under the MySQL data directory:

```text
/var/lib/mysql/myapp/products.frm   -- Table structure (MySQL 5.x only; removed in 8.0)
/var/lib/mysql/myapp/products.ibd   -- Table data and indexes
```

In MySQL 8.0 and later, only the `.ibd` file is created because the data dictionary replaces `.frm` files.

The `.ibd` file contains the table's B-tree pages for the clustered primary key index and all secondary indexes.

## Advantages of File-Per-Table

**Reclaim disk space after DROP TABLE**: When a table is dropped, the `.ibd` file is deleted and disk space is returned to the OS immediately.

```sql
-- This frees disk space on the OS
DROP TABLE old_logs;
```

With the system tablespace, dropping a table frees space internally but does not shrink `ibdata1`.

**Reclaim space after large DELETE with OPTIMIZE TABLE**:

```sql
-- After deleting many rows, reclaim the space in the .ibd file
OPTIMIZE TABLE orders;
```

This rebuilds the table and returns freed pages to the OS (for file-per-table tablespaces only).

**Transportable tablespaces**: Individual tables can be exported and imported on another MySQL server.

```sql
-- Export a table
FLUSH TABLES products FOR EXPORT;
-- Copy the .ibd and .cfg files to another server
-- UNLOCK TABLES;
```

**Simpler diagnostics**: Each table's file size is directly visible on the filesystem.

```bash
du -sh /var/lib/mysql/myapp/*.ibd | sort -rh | head -20
```

## Disadvantages of File-Per-Table

- Many tables mean many files, which can hit OS file descriptor limits in systems with thousands of tables
- More file system metadata overhead for databases with thousands of small tables
- Cannot store tables on different storage devices as easily as general tablespaces

## Checking Which Tablespace a Table Uses

In MySQL 8.0 and later, query the `INNODB_TABLESPACES` table:

```sql
SELECT
  NAME,
  SPACE_TYPE,
  ROW_FORMAT
FROM information_schema.INNODB_TABLESPACES
WHERE NAME LIKE 'myapp/%';
```

The `SPACE_TYPE` column shows `Single` for file-per-table tablespaces and `General` for general tablespaces. Tables stored in the system tablespace do not appear in this view.

## Moving a Table Back to the System Tablespace

```sql
SET GLOBAL innodb_file_per_table = OFF;
ALTER TABLE products ENGINE = InnoDB;
SET GLOBAL innodb_file_per_table = ON;
```

This rebuilds the table in the system tablespace. It is generally not recommended.

## Summary

The InnoDB file-per-table tablespace stores each table's data and indexes in a dedicated `.ibd` file. This is the default and recommended configuration in MySQL because it allows disk space to be reclaimed after DROP TABLE and OPTIMIZE TABLE, enables transportable tablespaces for easy table migration, and simplifies disk usage monitoring. The only reason to disable file-per-table is for databases with extremely large numbers of tiny tables where file system overhead becomes a concern.
