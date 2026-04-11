# How to Troubleshoot MySQL Backup Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, mysqldump, XtraBackup, Troubleshooting

Description: Learn how to diagnose and fix MySQL backup failures including mysqldump errors, permission issues, disk space problems, and lock timeout issues.

---

## Common Backup Failure Categories

MySQL backup failures fall into four main categories: permission errors, connectivity issues, disk space exhaustion, and lock or timeout failures. Identifying the category quickly directs the investigation.

## mysqldump Errors

Check the exit code and stderr output of the backup command:

```bash
mysqldump -u backup_user -p --single-transaction --all-databases \
  2>/tmp/backup_errors.log > /backups/full.sql
echo "Exit code: $?"
cat /tmp/backup_errors.log
```

### Permission Denied

```text
mysqldump: Got error: 1044: Access denied for user 'backup_user'@'localhost'
```

Grant the required privileges:

```sql
CREATE USER IF NOT EXISTS 'backup_user'@'localhost' IDENTIFIED BY 'strongpass';
GRANT SELECT, RELOAD, LOCK TABLES, REPLICATION CLIENT,
      SHOW VIEW, EVENT, TRIGGER ON *.* TO 'backup_user'@'localhost';
FLUSH PRIVILEGES;
```

### Lock Wait Timeout

```text
mysqldump: Got error: 1205: Lock wait timeout exceeded; try restarting transaction
```

Use `--single-transaction` for InnoDB tables to avoid locking:

```bash
mysqldump -u backup_user -p --single-transaction --quick \
  --all-databases > /backups/full.sql
```

For MyISAM tables, use `--lock-all-tables` and schedule backups during low-traffic periods.

## Disk Space Issues

A backup that starts but stops mid-way often indicates disk full:

```bash
df -h /backups
# If the backup destination is full, clean up old backups first
find /backups -name "*.sql.gz" -mtime +7 -delete
```

Stream the backup directly to compressed output to save space:

```bash
mysqldump -u backup_user -p --single-transaction --all-databases \
  | gzip > /backups/full_$(date +%Y%m%d).sql.gz
```

## Xtrabackup Failures

Percona Xtrabackup is common for large databases. Check its log file:

```bash
xtrabackup --backup --target-dir=/backups/xtrabackup/ \
  --user=backup_user --password=strongpass 2>/tmp/xtrabackup.log
cat /tmp/xtrabackup.log | grep -iE "error|failed"
```

Common Xtrabackup issues:

```text
InnoDB: Error: log file ./ib_logfile0 is of different size
```

This occurs when the redo log size in the data directory does not match the expected size. Use the `--innodb-log-file-size` flag to match:

```bash
xtrabackup --backup --innodb-log-file-size=256M \
  --target-dir=/backups/ --user=backup_user --password=strongpass
```

## Verifying Backup Integrity

Always verify backups after creation:

```bash
# Verify the dump file completed successfully (not truncated)
tail -1 /backups/full.sql | grep -q "Dump completed" \
  && echo "Backup complete" || echo "Backup may be truncated"

# Test restore to a separate MySQL instance
mysql -u root -p test_restore_db < /backups/full.sql
```

Or use Xtrabackup's prepare step:

```bash
xtrabackup --prepare --target-dir=/backups/xtrabackup/
# A successful prepare means the backup is consistent
```

## Automating and Alerting on Failures

Wrap backup scripts to capture failures and alert:

```bash
#!/bin/bash
set -o pipefail
BACKUP_FILE="/backups/mysql_$(date +%Y%m%d_%H%M%S).sql.gz"
mysqldump -u backup_user -p"${MYSQL_BACKUP_PASS}" \
  --single-transaction --all-databases \
  | gzip > "$BACKUP_FILE"
if [ $? -ne 0 ]; then
  echo "MySQL backup failed at $(date)" | mail -s "ALERT: MySQL Backup Failure" ops@example.com
fi
```

## Summary

MySQL backup failures are most commonly caused by insufficient privileges, lock wait timeouts, or disk space exhaustion. Use `--single-transaction` with mysqldump for InnoDB backups to avoid locking. Grant the backup user the minimum required privileges and verify them before relying on scheduled backups. Always run integrity checks on backup files and set up alerting for failed backup jobs.
