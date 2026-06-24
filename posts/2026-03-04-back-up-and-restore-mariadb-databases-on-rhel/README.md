# How to Back Up and Restore MariaDB Databases on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, Backup, Restore, mysqldump, Mariabackup

Description: Back up and restore MariaDB databases on RHEL using mysqldump for logical backups and mariabackup for hot physical backups without downtime.

---

MariaDB on RHEL offers two primary backup approaches: mariadb-dump for logical SQL exports and mariabackup for online physical backups. Each fits different scenarios depending on database size and downtime tolerance.

## Logical Backups with mariadb-dump

`mariadb-dump` was previously named `mysqldump`. On older systems, the `mysqldump` compatibility name might still be available.

### Back Up a Single Database

```bash
# Dump a single database

mariadb-dump -u root -p mydb > /backup/mydb_$(date +%Y%m%d).sql

# Dump with compression
mariadb-dump -u root -p mydb | gzip > /backup/mydb_$(date +%Y%m%d).sql.gz

# Dump with single-transaction (consistent snapshot, no locks for InnoDB)
mariadb-dump -u root -p --single-transaction mydb > /backup/mydb_$(date +%Y%m%d).sql
```

### Back Up All Databases

```bash
# Dump all databases
mariadb-dump -u root -p --all-databases --single-transaction > /backup/all_dbs_$(date +%Y%m%d).sql

# Dump all databases with routines and triggers
mariadb-dump -u root -p --all-databases --single-transaction \
    --routines --triggers --events > /backup/all_dbs_full_$(date +%Y%m%d).sql
```

### Back Up Specific Tables

```bash
# Dump specific tables from a database
mariadb-dump -u root -p mydb orders customers > /backup/mydb_tables.sql

# Dump schema only
mariadb-dump -u root -p --no-data mydb > /backup/mydb_schema.sql

# Dump data only
mariadb-dump -u root -p --no-create-info mydb > /backup/mydb_data.sql
```

## Restore from mariadb-dump

```bash
# Restore a single database
mariadb -u root -p mydb < /backup/mydb_20250115.sql

# Restore from compressed backup
gunzip < /backup/mydb_20250115.sql.gz | mariadb -u root -p mydb

# Restore all databases
mariadb -u root -p < /backup/all_dbs_20250115.sql

# Create a new database and restore into it
mariadb -u root -p -e "CREATE DATABASE newdb;"
mariadb -u root -p newdb < /backup/mydb_20250115.sql
```

## Physical Backups with mariabackup

mariabackup (based on Percona XtraBackup) creates online physical backups. For InnoDB, hot backups are possible without locking tables for the whole backup.

```bash
# Install mariabackup
sudo dnf install -y mariadb-backup

# Create a full backup
sudo mariabackup --backup \
    --target-dir=/backup/mariabackup_$(date +%Y%m%d) \
    --user=root --password=yourpassword

# Prepare the backup (apply committed transactions, roll back uncommitted)
sudo mariabackup --prepare \
    --target-dir=/backup/mariabackup_20250115
```

## Restore from mariabackup

```bash
# Stop MariaDB
sudo systemctl stop mariadb

# Remove existing data directory
sudo rm -rf /var/lib/mysql/*

# Restore the backup
sudo mariabackup --copy-back \
    --target-dir=/backup/mariabackup_20250115

# Fix file ownership
sudo chown -R mysql:mysql /var/lib/mysql

# Start MariaDB
sudo systemctl start mariadb
```

## Incremental Backups with mariabackup

```bash
# Create a full backup first
sudo mariabackup --backup \
    --target-dir=/backup/full \
    --user=root --password=yourpassword

# Create an incremental backup based on the full backup
sudo mariabackup --backup \
    --target-dir=/backup/inc1 \
    --incremental-basedir=/backup/full \
    --user=root --password=yourpassword

# Prepare: apply the full backup
sudo mariabackup --prepare --target-dir=/backup/full

# Apply the incremental on top
sudo mariabackup --prepare --target-dir=/backup/full \
    --incremental-dir=/backup/inc1
```

## Verify Backups

```bash
# Check dump file integrity
mariadb -u root -p -e "SOURCE /backup/mydb_20250115.sql;" test_restore_db

# Check mariabackup log for errors
cat /backup/mariabackup_20250115/xtrabackup_info
```

For databases under 10GB, mariadb-dump works well. For larger databases, mariabackup is preferred because it avoids long-running logical dumps and can run significantly faster.
