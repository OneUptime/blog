# What Is Percona XtraBackup for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Percona XtraBackup, Backup, InnoDB, Hot Backup

Description: Percona XtraBackup is an open-source hot backup tool for MySQL and InnoDB that creates consistent backups without locking tables or interrupting production traffic.

---

## Overview

Percona XtraBackup is the industry-standard open-source backup tool for MySQL and InnoDB databases. Unlike `mysqldump`, which locks tables and copies data row by row, XtraBackup performs a physical, file-level copy while the database continues serving traffic. This makes it suitable for large databases where downtime during backup is unacceptable.

## How XtraBackup Works

XtraBackup uses a multi-phase approach to ensure consistency:

1. **Copy phase** - Copies InnoDB data files while tracking changes in the InnoDB redo log
2. **Prepare phase** - Applies the captured redo log to make the backup consistent to a single point in time
3. **Restore phase** - Copies prepared files to the MySQL data directory

```text
Phase 1: Copy
  - Copies .ibd files from datadir
  - Tails InnoDB redo logs for changes during copy

Phase 2: Prepare
  - Applies redo logs to bring all pages to a consistent LSN
  - Rolls back uncommitted transactions

Phase 3: Restore
  - Stop MySQL
  - Copy prepared backup to datadir
  - Start MySQL
```

## Installation

```bash
# On RHEL/CentOS/Amazon Linux 2
sudo yum install percona-xtrabackup-80

# On Debian/Ubuntu
wget https://downloads.percona.com/downloads/Percona-XtraBackup-8.0/8.0.35/binary/debian/jammy/x86_64/percona-xtrabackup-80_8.0.35-30-1.jammy_amd64.deb
sudo dpkg -i percona-xtrabackup-80_8.0.35-30-1.jammy_amd64.deb
```

## Required MySQL Privileges

```sql
CREATE USER 'xtrabackup'@'localhost' IDENTIFIED BY 'backuppass';
GRANT BACKUP_ADMIN, PROCESS, RELOAD, LOCK TABLES, REPLICATION CLIENT ON *.* TO 'xtrabackup'@'localhost';
GRANT SELECT ON performance_schema.log_status TO 'xtrabackup'@'localhost';
FLUSH PRIVILEGES;
```

## Full Backup

```bash
# Create a full backup to /backup/full
xtrabackup \
  --user=xtrabackup \
  --password=backuppass \
  --backup \
  --target-dir=/backup/full

# Check what was created
ls /backup/full/
```

```text
ibdata1  ib_logfile0  xtrabackup_binlog_info  xtrabackup_checkpoints
mydb/    mysql/       performance_schema/      xtrabackup_info
```

## Prepare the Backup

Before restoring, the backup must be prepared (made crash-consistent):

```bash
xtrabackup \
  --prepare \
  --target-dir=/backup/full
```

## Incremental Backups

XtraBackup supports incremental backups based on the Log Sequence Number (LSN):

```bash
# Full backup (Monday)
xtrabackup --user=xtrabackup --password=backuppass \
  --backup --target-dir=/backup/base

# Incremental backup (Tuesday) - only changes since base
xtrabackup --user=xtrabackup --password=backuppass \
  --backup \
  --target-dir=/backup/inc1 \
  --incremental-basedir=/backup/base

# Incremental backup (Wednesday) - only changes since inc1
xtrabackup --user=xtrabackup --password=backuppass \
  --backup \
  --target-dir=/backup/inc2 \
  --incremental-basedir=/backup/inc1
```

## Preparing Incremental Backups

```bash
# Prepare base (do NOT rollback yet)
xtrabackup --prepare --apply-log-only --target-dir=/backup/base

# Apply first incremental
xtrabackup --prepare --apply-log-only \
  --target-dir=/backup/base \
  --incremental-dir=/backup/inc1

# Apply second incremental (final - allow rollback)
xtrabackup --prepare \
  --target-dir=/backup/base \
  --incremental-dir=/backup/inc2
```

## Restore

```bash
# Stop MySQL
systemctl stop mysqld

# Move old data directory out of the way
mv /var/lib/mysql /var/lib/mysql.old

# Copy prepared backup to data directory
xtrabackup --copy-back --target-dir=/backup/base

# Fix permissions
chown -R mysql:mysql /var/lib/mysql

# Start MySQL
systemctl start mysqld
```

## Streaming Backups

XtraBackup can stream backups directly to another server or to compressed archives:

```bash
# Stream to a remote server via SSH
xtrabackup --user=xtrabackup --password=backuppass \
  --backup --stream=xbstream \
  | ssh backup-server "xbstream -x -C /backup/full"

# Compress while streaming
xtrabackup --user=xtrabackup --password=backuppass \
  --backup --stream=xbstream \
  | gzip > /backup/full_$(date +%Y%m%d).xbstream.gz
```

## Checking Backup Info

```bash
# View backup metadata
cat /backup/full/xtrabackup_checkpoints
```

```text
backup_type = full-backuped
from_lsn = 0
to_lsn = 12345678
last_lsn = 12345680
compact = 0
recover_binlog_info = 0
```

## Summary

Percona XtraBackup is the go-to solution for hot backups of large MySQL databases. Its copy-then-prepare approach produces consistent, restorable backups without blocking reads or writes, making it far superior to `mysqldump` for production databases above a few gigabytes. Its support for incremental backups makes it efficient for daily backup strategies, and its streaming capability simplifies offsite backup workflows.
