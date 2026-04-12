# How to Fix ERROR 1114 The Table Is Full in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Error, Disk, Storage

Description: Fix MySQL ERROR 1114 The table is full by freeing disk space, adjusting InnoDB tablespace settings, or fixing MyISAM size limits and tmpdir space.

---

MySQL ERROR 1114 means a table cannot accept more data. The full error is: `ERROR 1114 (HY000): The table 'tablename' is full`. The cause depends on the storage engine and configuration in use.

## Diagnose the Cause

Before fixing the error, determine which situation applies:

```sql
-- Check storage engine for the affected table
SHOW CREATE TABLE your_table_name\G

-- Check available disk space
-- (Run in the OS terminal)
```

```bash
df -h /var/lib/mysql
```

## Cause 1: Disk Space Exhausted

For InnoDB tables, the most common cause is the disk being full:

```bash
# Check disk usage
df -h
du -sh /var/lib/mysql/*

# Free space by removing old binary logs
```

```sql
-- Check binary log size
SHOW BINARY LOGS;

-- Purge old binary logs
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);
```

## Cause 2: InnoDB Tablespace Full

InnoDB shared tablespace (`ibdata1`) can fill up if `innodb_file_per_table` is OFF:

```sql
SHOW VARIABLES LIKE 'innodb_file_per_table';
```

Enable per-table tablespace files to prevent a single file from growing indefinitely:

```text
[mysqld]
innodb_file_per_table = ON
```

For tables already in the shared tablespace, export and reimport the data to move them:

```bash
mysqldump -u root -p mydb your_table_name > table_backup.sql
```

```sql
DROP TABLE your_table_name;
-- Re-create and import
```

## Cause 3: MyISAM Table Size Limit

MyISAM tables have a default maximum size of 256 TB (based on the default 6-byte pointer size), but the practical limit depends on the operating system file size limit. If your table hits this limit, increase it:

```sql
ALTER TABLE your_table_name
  MAX_ROWS = 1000000000
  AVG_ROW_LENGTH = 512;
```

Or convert to InnoDB which has no row limit:

```sql
ALTER TABLE your_table_name ENGINE = InnoDB;
```

## Cause 4: tmpdir Is Full

For queries that use disk-based temporary tables, MySQL writes to `tmpdir`. If that partition is full:

```sql
SHOW VARIABLES LIKE 'tmpdir';
```

```bash
# Check tmpdir space
df -h /tmp

# Clean up temp files (be careful - only MySQL-related)
ls -lh /tmp/
```

Change `tmpdir` to a partition with more space:

```text
[mysqld]
tmpdir = /mnt/large-disk/mysql-tmp
```

## Cause 5: innodb_data_file_path Not Auto-extending

If `ibdata1` is not configured to auto-extend, it hits its defined size:

```sql
SHOW VARIABLES LIKE 'innodb_data_file_path';
```

A configuration like `ibdata1:10M:autoextend` is correct. Without `autoextend`, the file stops growing:

```text
[mysqld]
innodb_data_file_path = ibdata1:10M:autoextend
```

## Summary

ERROR 1114 has several root causes. Start by checking disk space on the MySQL data directory and tmpdir. For InnoDB, enable `innodb_file_per_table` to avoid the shared tablespace growing without bound. For MyISAM, increase `MAX_ROWS` or convert to InnoDB. Always monitor disk usage proactively with alerting to catch this before queries start failing.
