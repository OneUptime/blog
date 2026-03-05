# How to Use mysqlpump for Parallel Database Backups on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MySQL, Database, Backup, Performance

Description: Use mysqlpump to create faster MySQL backups through parallel processing on Ubuntu, with filtering options and progress reporting not available in mysqldump.

---

mysqlpump is MySQL's next-generation backup tool, introduced in MySQL 5.7 as a faster alternative to mysqldump. The key difference is parallelism: mysqlpump can back up multiple databases and tables simultaneously using multiple threads, significantly reducing backup time for servers with many databases or large tables. It also adds built-in compression and progress reporting that mysqldump lacks.

## mysqlpump vs mysqldump

Feature comparison:

| Feature | mysqldump | mysqlpump |
|---------|-----------|-----------|
| Parallel backup | No | Yes |
| Built-in compression | No (pipe to gzip) | Yes (--compress-output) |
| Progress reporting | No | Yes |
| Per-object filtering | Limited | Extensive |
| Deferred indexes | No | Yes (faster restore) |
| Available since | Very old | MySQL 5.7 |

mysqlpump is particularly useful when backing up servers with dozens of databases or tables in the tens of gigabytes range. For small single-database backups, the difference is minimal.

## Checking mysqlpump Availability

```bash
# Verify mysqlpump is installed (comes with mysql-client)
which mysqlpump
mysqlpump --version

# mysqlpump is part of the mysql-client package
sudo apt install mysql-client -y
```

Note: mysqlpump is a MySQL tool. If you are running MariaDB, use mysqldump or mariabackup instead, as mysqlpump is not included with MariaDB.

## Basic Usage

```bash
# Backup a single database
mysqlpump -u root -p myapp_db > myapp_db_backup.sql

# Backup all databases
mysqlpump -u root -p --all-databases > all_databases.sql

# Use an options file to avoid entering password each time
mysqlpump --defaults-file=/etc/mysql/backup.cnf myapp_db > backup.sql
```

## Enabling Parallel Processing

This is the main reason to use mysqlpump. Set the number of parallel threads:

```bash
# Use 4 parallel threads for the default queue
# Default queue handles tables within a database in parallel
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --default-parallelism=4 \
    --all-databases > /backup/all_databases.sql
```

For servers with many databases, create separate queues per database:

```bash
# Each named queue runs in its own thread
# This backs up db1, db2, and db3 simultaneously
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --parallel-schemas=4:db1 \
    --parallel-schemas=4:db2 \
    --parallel-schemas=4:db3 \
    --all-databases > /backup/all_databases.sql
```

The `--parallel-schemas=N:db_name` syntax tells mysqlpump to use N threads for tables within that specific database.

## Progress Reporting

mysqlpump shows progress by default. Control the output interval:

```bash
# Show progress every 5 seconds (default is 2000ms)
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --watch-progress \
    --default-parallelism=4 \
    --all-databases > /backup/all_databases.sql 2>&1

# Sample output:
# Dump progress: 0/6 tables, 250/250 rows
# Dump progress: 3/6 tables, 75000/150000 rows
# Dump progress: 6/6 tables, 150000/150000 rows
# Dump completed in 4523 milliseconds
```

The progress goes to stderr, so redirect stderr separately if needed:

```bash
mysqlpump --all-databases \
    --watch-progress \
    > /backup/backup.sql \
    2> /backup/backup_progress.log
```

## Built-in Compression

mysqlpump can compress output directly without piping through gzip:

```bash
# LZ4 compression (fastest, least compression)
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --compress-output=LZ4 \
    --all-databases > /backup/all_databases.sql.lz4

# zlib compression (balanced speed and size)
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --compress-output=ZLIB \
    --all-databases > /backup/all_databases.sql.zlib

# Decompress to restore
mysql -u root -p < <(mysqlpump --uncompress /backup/all_databases.sql.lz4)
```

For compatibility with standard tools, piping through gzip is still an option:

```bash
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --default-parallelism=4 \
    --all-databases | gzip > /backup/all_databases_$(date +%Y%m%d).sql.gz
```

## Filtering Databases and Tables

mysqlpump provides flexible inclusion and exclusion filters:

```bash
# Include only specific databases
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --include-databases=myapp_db,wordpress_db \
    > /backup/selected_databases.sql

# Exclude specific databases from --all-databases
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --all-databases \
    --exclude-databases=test,legacy_db \
    > /backup/all_except_test.sql

# Exclude specific tables from a database
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --all-databases \
    --exclude-tables=myapp_db.audit_log,myapp_db.sessions \
    > /backup/without_logs.sql

# Back up only specific tables
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --include-databases=myapp_db \
    --include-tables=myapp_db.users,myapp_db.orders \
    > /backup/critical_tables.sql
```

## Deferred Secondary Indexes

mysqlpump supports adding secondary indexes after all data is loaded, which speeds up restores:

```bash
# Add secondary indexes after data insert (faster restore)
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --defer-table-indexes \
    --all-databases > /backup/all_databases.sql
```

During restore, the data loads without index overhead, and indexes are built once at the end. This can cut restore time significantly for tables with many indexes.

## Skipping Data or Structure

```bash
# Schema only (no data)
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --skip-dump-rows \
    --all-databases > /backup/schema_only.sql

# Data only (no CREATE statements)
mysqlpump --defaults-file=/etc/mysql/backup.cnf \
    --add-drop-table=FALSE \
    --no-create-info \
    --all-databases > /backup/data_only.sql
```

## A Complete Production Backup Script

```bash
sudo nano /usr/local/bin/mysqlpump-backup.sh
```

```bash
#!/bin/bash
# mysqlpump backup script with parallel processing

BACKUP_DIR="/backup/mysql"
DEFAULTS_FILE="/etc/mysql/backup.cnf"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/mysqlpump-backup.log"
THREADS=4  # Adjust based on CPU cores

mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting mysqlpump backup with $THREADS parallel threads"
START_TIME=$(date +%s)

# Run mysqlpump with parallel processing and progress reporting
mysqlpump \
    --defaults-file="$DEFAULTS_FILE" \
    --default-parallelism=$THREADS \
    --defer-table-indexes \
    --skip-definer \
    --all-databases \
    --exclude-databases=information_schema,performance_schema,sys \
    --watch-progress \
    2> "${BACKUP_DIR}/backup_${DATE}_progress.log" | \
    gzip > "${BACKUP_DIR}/full_backup_${DATE}.sql.gz"

EXIT_CODE=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $EXIT_CODE -eq 0 ]; then
    SIZE=$(du -sh "${BACKUP_DIR}/full_backup_${DATE}.sql.gz" | cut -f1)
    log "Backup completed successfully in ${DURATION}s, size: $SIZE"
else
    log "ERROR: Backup failed with exit code $EXIT_CODE"
    exit 1
fi

# Remove old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "*_progress.log" -mtime "+$RETENTION_DAYS" -delete
log "Cleaned up backups older than $RETENTION_DAYS days"
```

```bash
sudo chmod +x /usr/local/bin/mysqlpump-backup.sh

# Test run
sudo /usr/local/bin/mysqlpump-backup.sh

# Schedule via cron
echo "0 1 * * * root /usr/local/bin/mysqlpump-backup.sh" | sudo tee /etc/cron.d/mysqlpump-backup
```

## Restoring mysqlpump Backups

Restoration is the same as mysqldump:

```bash
# Restore from compressed backup
zcat /backup/mysql/full_backup_20260302.sql.gz | mysql -u root -p

# Restore single database
zcat /backup/mysql/full_backup_20260302.sql.gz | grep -A1000 "^-- Current Database: \`myapp_db\`" | \
    head -n -1 | mysql -u root -p myapp_db
```

mysqlpump fills the gap between mysqldump and full physical backups for medium-sized databases where speed matters but the full complexity of xtrabackup is not needed.
