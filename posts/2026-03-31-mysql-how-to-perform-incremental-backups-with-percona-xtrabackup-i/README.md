# How to Perform Incremental Backups with Percona XtraBackup in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Percona XtraBackup, Incremental Backup, Administration

Description: Learn how to use Percona XtraBackup to perform incremental physical backups of MySQL databases, reducing backup time and storage compared to full backups.

---

## What Is Percona XtraBackup?

Percona XtraBackup is an open-source tool for hot physical backups of InnoDB databases. Unlike `mysqldump`, XtraBackup copies the actual InnoDB data files without locking tables, making it suitable for large production databases.

Incremental backups only copy pages that changed since the last full or incremental backup, significantly reducing backup time and storage.

## Installing Percona XtraBackup

```bash
# Ubuntu/Debian
sudo apt install percona-xtrabackup-80

# CentOS/RHEL
sudo yum install percona-xtrabackup-80

# Verify
xtrabackup --version
```

## Step 1 - Full Backup

Before incremental backups, you need a base full backup:

```bash
xtrabackup \
  --backup \
  --target-dir=/backups/base \
  --user=backup_user \
  --password=BackupPass!
```

This creates a full backup in `/backups/base/`. The backup contains all InnoDB data files and binary log position information.

## Step 2 - First Incremental Backup

```bash
xtrabackup \
  --backup \
  --target-dir=/backups/incremental_1 \
  --incremental-basedir=/backups/base \
  --user=backup_user \
  --password=BackupPass!
```

`--incremental-basedir` points to the full backup. XtraBackup reads the LSN (Log Sequence Number) from the base and copies only pages with an LSN greater than that value.

## Step 3 - Second Incremental Backup

Each incremental can use the previous incremental as its base:

```bash
xtrabackup \
  --backup \
  --target-dir=/backups/incremental_2 \
  --incremental-basedir=/backups/incremental_1 \
  --user=backup_user \
  --password=BackupPass!
```

## Verifying the LSN Chain

Each backup directory contains `xtrabackup_checkpoints`:

```bash
cat /backups/base/xtrabackup_checkpoints
```

```text
backup_type = full-backuped
from_lsn = 0
to_lsn = 1234567890
last_lsn = 1234567890
```

```bash
cat /backups/incremental_1/xtrabackup_checkpoints
```

```text
backup_type = incremental
from_lsn = 1234567890
to_lsn = 2345678901
last_lsn = 2345678901
```

## Restoring an Incremental Backup Chain

Restoration requires preparing each backup in sequence before applying the next.

### Step 1 - Prepare the Full Backup (Do Not Roll Back Yet)

```bash
xtrabackup \
  --prepare \
  --apply-log-only \
  --target-dir=/backups/base
```

`--apply-log-only` prevents XtraBackup from rolling back uncommitted transactions, which is needed to apply subsequent incrementals.

### Step 2 - Apply the First Incremental

```bash
xtrabackup \
  --prepare \
  --apply-log-only \
  --target-dir=/backups/base \
  --incremental-dir=/backups/incremental_1
```

### Step 3 - Apply the Last Incremental (Without apply-log-only)

The final prepare step rolls forward all transactions:

```bash
xtrabackup \
  --prepare \
  --target-dir=/backups/base \
  --incremental-dir=/backups/incremental_2
```

### Step 4 - Copy Files to Data Directory

```bash
sudo systemctl stop mysql
sudo rm -rf /var/lib/mysql/*
sudo xtrabackup --copy-back --target-dir=/backups/base
sudo chown -R mysql:mysql /var/lib/mysql
sudo systemctl start mysql
```

## Backup Strategy Example

A typical weekly schedule:

```bash
# Sunday: Full backup
xtrabackup --backup --target-dir=/backups/$(date +%Y%m%d)_full ...

# Monday through Saturday: Daily incremental
xtrabackup --backup \
  --target-dir=/backups/$(date +%Y%m%d)_incr \
  --incremental-basedir=/backups/$(date -d yesterday +%Y%m%d)_* ...
```

## Required Privileges for XtraBackup User

```sql
CREATE USER 'backup_user'@'localhost' IDENTIFIED BY 'BackupPass!';
GRANT BACKUP_ADMIN, PROCESS, RELOAD, LOCK TABLES,
      REPLICATION CLIENT, CREATE TABLESPACE,
      SELECT ON *.* TO 'backup_user'@'localhost';
```

## Summary

Percona XtraBackup enables hot incremental backups by copying only InnoDB pages that changed since the last backup. Create a full backup first, then daily incrementals using `--incremental-basedir`. To restore, prepare the full backup with `--apply-log-only`, apply each incremental in order, and restore the final prepared backup to the data directory.
