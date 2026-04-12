# How to Use the InnoDB System Tablespace in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Tablespace, Storage, Administration

Description: Understand the InnoDB system tablespace in MySQL - what it stores, how to configure its size, and how to manage ibdata files effectively.

---

The InnoDB system tablespace is the central storage area used by InnoDB before `innodb_file_per_table` became the default. Even with file-per-table enabled, the system tablespace still stores critical InnoDB internal data structures.

## What the System Tablespace Contains

The system tablespace (`ibdata1` by default) stores:
- The InnoDB data dictionary (in MySQL 5.7 and earlier; moved to the `mysql.ibd` data dictionary tablespace in MySQL 8.0)
- The undo log tablespace (in older configurations; separate undo tablespaces are required in MySQL 8.0)
- The doublewrite buffer (in MySQL versions before 8.0.20; moved to separate `.dblwr` files in 8.0.20+)
- The change buffer
- Tables created with `TABLESPACE innodb_system`

```sql
-- Check system tablespace files
SELECT FILE_NAME, FILE_TYPE, TABLESPACE_NAME,
       ROUND(FILE_SIZE / 1024 / 1024, 2) AS size_mb
FROM information_schema.FILES
WHERE TABLESPACE_NAME = 'innodb_system';
```

## Configuring System Tablespace Files

The system tablespace configuration is defined in `my.cnf`:

```text
[mysqld]
# Single file, auto-extending
innodb_data_file_path=ibdata1:12M:autoextend

# Multiple files with a max size on the last file
innodb_data_file_path=ibdata1:50M;ibdata2:50M:autoextend:max:500M
```

The syntax is `filename:size[:autoextend[:max:maxsize]]`. Once `ibdata1` grows, it never shrinks back. This is a key limitation of using the system tablespace for data.

## Checking System Tablespace Size

```sql
-- Check current size in MB
SELECT ROUND(SUM(FILE_SIZE) / 1024 / 1024, 2) AS total_mb
FROM information_schema.FILES
WHERE TABLESPACE_NAME = 'innodb_system';
```

```bash
# Check on disk
ls -lh /var/lib/mysql/ibdata*
```

## Moving Data Out of the System Tablespace

If you have tables stored in the system tablespace (because `innodb_file_per_table` was off when they were created), migrate them:

```sql
-- Set file-per-table before rebuilding
SET GLOBAL innodb_file_per_table = ON;

-- Rebuild the table into its own file
ALTER TABLE legacy_table ENGINE=InnoDB;
```

## Shrinking the System Tablespace

The system tablespace cannot be shrunk in place. To reduce its size, you must perform a logical backup and restore:

```bash
# 1. Dump all databases
mysqldump --all-databases > full_backup.sql

# 2. Stop MySQL and remove ibdata and redo log files
sudo systemctl stop mysql
sudo rm /var/lib/mysql/ibdata1
sudo rm -f /var/lib/mysql/ib_logfile*          # MySQL before 8.0.30
sudo rm -rf /var/lib/mysql/'#innodb_redo'      # MySQL 8.0.30+

# 3. Restart MySQL (creates fresh system tablespace and redo logs)
sudo systemctl start mysql

# 4. Restore data
mysql < full_backup.sql
```

## System Tablespace vs. File-Per-Table

| Feature | System Tablespace | File-Per-Table |
| --- | --- | --- |
| Space reclamation | No | Yes (DROP TABLE) |
| Per-table encryption | No | Yes |
| Fragmentation | High over time | Manageable |
| Backup granularity | Whole file | Per table |

## Summary

The InnoDB system tablespace (`ibdata1`) is always present and stores internal metadata even when `innodb_file_per_table=ON`. Configure its size in `innodb_data_file_path`. Avoid storing user tables in the system tablespace since it cannot be shrunk. If you need to reduce its size, a dump-and-restore cycle is required.
