# MySQL Backup and Restore Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Restore, Cheat Sheet

Description: Quick reference for MySQL backup and restore tools including mysqldump, mysqlpump, MySQL Shell dump, and binary log point-in-time recovery with ready commands.

---

## mysqldump - Logical Backup

```bash
# Single database
mysqldump -u root -p mydb > mydb_backup.sql

# Multiple databases
mysqldump -u root -p --databases mydb otherdb > multi_backup.sql

# All databases
mysqldump -u root -p --all-databases > all_dbs.sql

# Single table
mysqldump -u root -p mydb orders > orders_backup.sql

# Compressed backup
mysqldump -u root -p mydb | gzip > mydb_backup.sql.gz
```

## mysqldump - Useful Options

```bash
# Consistent snapshot (InnoDB)
mysqldump --single-transaction --quick --lock-tables=false -u root -p mydb > backup.sql

# Include routines and events
mysqldump --routines --events -u root -p mydb > backup.sql

# Skip specific tables
mysqldump -u root -p mydb --ignore-table=mydb.logs > backup.sql

# Structure only
mysqldump --no-data -u root -p mydb > schema.sql

# Data only
mysqldump --no-create-info -u root -p mydb > data.sql
```

## Restore from mysqldump

```bash
# Restore full dump
mysql -u root -p mydb < mydb_backup.sql

# Restore compressed dump
gunzip -c mydb_backup.sql.gz | mysql -u root -p mydb

# Create database and restore
mysql -u root -p -e "CREATE DATABASE mydb;"
mysql -u root -p mydb < mydb_backup.sql
```

## mysqlpump - Parallel Logical Backup (MySQL 5.7 – 8.0)

```bash
# Parallel backup across databases
mysqlpump --default-parallelism=4 -u root -p --all-databases > dump.sql

# Compress output
mysqlpump --compress-output=zlib -u root -p mydb > mydb.zlib
```

## MySQL Shell - Enterprise-Grade Dump (8.0+)

```bash
# Dump a schema
mysqlsh root@localhost -- util dump-schemas mydb --outputUrl=/backups/mydb

# Load (parallel, fast)
mysqlsh root@localhost -- util load-dump /backups/mydb
```

## Binary Log Point-in-Time Recovery

```bash
# Enable binary logging in my.cnf
# log_bin = /var/log/mysql/mysql-bin.log
# binlog_format = ROW

# List binary logs
mysql -u root -p -e "SHOW BINARY LOGS;"

# Extract events between timestamps
mysqlbinlog --start-datetime="2026-03-31 00:00:00" \
            --stop-datetime="2026-03-31 10:00:00" \
            /var/log/mysql/mysql-bin.000042 > recovery.sql

# Apply to database
mysql -u root -p mydb < recovery.sql
```

## Backup Position for Replication

```bash
# MySQL 8.0.26+
mysqldump --single-transaction --source-data=2 -u root -p mydb > backup.sql
# source-data=2 writes CHANGE REPLICATION SOURCE TO as a comment at the top
```

## Verify Backup Integrity

```bash
# Restore with error tolerance (continues past errors, not a dry run)
mysql -u root -p --force < backup.sql

# Check table checksums
mysql -u root -p -e "CHECKSUM TABLE mydb.orders;"
```

## Automation Example (cron script)

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/mysql
mkdir -p "$BACKUP_DIR"

mysqldump --single-transaction --routines --events \
  -u backup_user -p"$MYSQL_PASS" mydb | \
  gzip > "$BACKUP_DIR/mydb_$DATE.sql.gz"

# Retain last 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
```

## Summary

MySQL backup options range from logical dumps with mysqldump (portable, easy restore) to the faster MySQL Shell parallel dump utility for large databases. Always use `--single-transaction` with InnoDB to get a consistent snapshot without locking. Combine full dumps with binary log backups for point-in-time recovery, and test restores regularly to verify backup validity.
