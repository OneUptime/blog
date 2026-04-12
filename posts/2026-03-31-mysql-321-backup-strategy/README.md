# How to Implement a 3-2-1 Backup Strategy for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Disaster Recovery

Description: Learn how to implement the 3-2-1 backup strategy for MySQL: 3 copies of data, 2 different media types, and 1 offsite copy for reliable disaster recovery.

---

The 3-2-1 backup strategy is an industry-standard approach to data protection. It requires maintaining 3 copies of your data, stored on 2 different types of media, with 1 copy kept offsite (or in a separate cloud region). For MySQL, this translates to combining local backups, a secondary storage device, and cloud object storage.

## Understanding 3-2-1 for MySQL

- **3 copies**: the live database, a local backup, and an offsite backup
- **2 media types**: local disk and cloud storage (or NAS and tape, or two cloud providers)
- **1 offsite copy**: a backup physically or logically separated from the primary site

A single `mysqldump` to the same server as the database satisfies none of these requirements.

## Copy 1: Live Database

The live database running in MySQL is your first copy. Protect it with InnoDB's crash-safe storage engine and binary logging enabled:

```ini
[mysqld]
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
```

## Copy 2: Local Logical Backup

Perform nightly logical backups with `mysqldump` to a local backup directory:

```bash
#!/bin/bash
BACKUP_DIR="/backups/mysql"
DATE=$(date +%F)
DB="myapp_db"

mysqldump \
  --single-transaction \
  --source-data=2 \
  --routines \
  --triggers \
  --events \
  "$DB" | gzip > "$BACKUP_DIR/$DB-$DATE.sql.gz"

# Retain 7 days of local backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
```

`--single-transaction` creates a consistent snapshot without locking the database.

## Copy 3: Offsite Cloud Backup

Upload the local backup to a cloud storage bucket immediately after creation. Using AWS S3:

```bash
#!/bin/bash
BACKUP_DIR="/backups/mysql"
DATE=$(date +%F)
DB="myapp_db"
BUCKET="s3://my-company-mysql-backups"

# Upload to S3 with server-side encryption
aws s3 cp \
  "$BACKUP_DIR/$DB-$DATE.sql.gz" \
  "$BUCKET/$DB/$DATE/$DB-$DATE.sql.gz" \
  --sse AES256

# Verify upload
aws s3 ls "$BUCKET/$DB/$DATE/"
```

Set S3 lifecycle rules to transition old backups to Glacier for cost-effective long-term retention.

## Using Percona XtraBackup for Physical Backups

For large databases, use Percona XtraBackup instead of `mysqldump` for faster, non-blocking physical backups:

```bash
# Full backup
xtrabackup --backup \
  --target-dir=/backups/mysql/full \
  --user=backup_user \
  --password=secret

# Compress and upload
tar czf - /backups/mysql/full | \
  aws s3 cp - s3://my-company-mysql-backups/full/$(date +%F).tar.gz
```

## Scheduling with Cron

```bash
# /etc/cron.d/mysql-backup
0 2 * * * root /opt/scripts/mysql-backup.sh >> /var/log/mysql-backup.log 2>&1
```

## Validating the Strategy

Periodically test restores from each backup copy independently:

```bash
# Restore from local backup
gunzip < /backups/mysql/myapp_db-2026-03-31.sql.gz | mysql myapp_db_test

# Restore from S3
aws s3 cp s3://my-company-mysql-backups/myapp_db/2026-03-31/myapp_db-2026-03-31.sql.gz - | \
  gunzip | mysql myapp_db_test
```

A backup that has never been tested is not a verified backup.

## Summary

The MySQL 3-2-1 strategy combines a live database, nightly local backups with `mysqldump` or XtraBackup, and offsite cloud uploads to S3. Automate all three layers and schedule regular restore tests to confirm the strategy works when it matters most.
