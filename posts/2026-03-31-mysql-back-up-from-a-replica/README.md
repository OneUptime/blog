# How to Back Up from a MySQL Replica

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Replica, Performance, Administration

Description: Learn how to take MySQL backups from a replica server to offload backup overhead from the source and avoid impacting production workloads.

---

Taking backups directly from the source MySQL server introduces I/O and CPU overhead that can affect production performance. A better approach is running backups from a dedicated replica. The replica holds the same data as the source (with minimal lag) while absorbing all backup-related load away from production traffic.

## Why Back Up from a Replica

- Backup processes (especially logical dumps) lock the replica briefly but do not affect the source
- XtraBackup's I/O-intensive operations run on the replica's disks
- The source remains fully available for application writes and reads
- Dedicated backup replicas can be configured with different hardware (larger disks, slower IOPS)

## Prerequisites

The replica used for backups should be configured with:

```ini
[mysqld]
server_id = 99
log_bin = /var/lib/mysql/binlogs/mysql-bin
relay_log = /var/lib/mysql/relaylogs/relay-bin
log_replica_updates = ON
read_only = ON
super_read_only = ON
gtid_mode = ON
enforce_gtid_consistency = ON
```

## Taking a mysqldump from a Replica

Use `--single-transaction` and `--source-data` to get a consistent backup with position metadata:

```bash
mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --source-data=2 \
  --set-gtid-purged=ON \
  --flush-logs \
  | gzip > /var/backups/mysql/replica_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

`--source-data=2` records the replica's own binary log position as a SQL comment. With GTID mode enabled, `--set-gtid-purged=ON` includes the GTID set in the dump, which is what matters for seeding new replicas. If you need the source's binary log position instead, use `--dump-replica=2`.

## Pausing Replication During Backup

For transactional backups with `--single-transaction`, replication does not need to be paused. MySQL's consistent read snapshot handles this.

For non-transactional tables or if you need a point-in-time snapshot:

```sql
-- Pause SQL thread but keep IO thread running (downloads events but doesn't apply them)
STOP REPLICA SQL_THREAD;

-- Take your backup
-- mysqldump or xtrabackup here

-- Resume replication
START REPLICA SQL_THREAD;
```

## Taking a XtraBackup from a Replica

XtraBackup works the same on a replica as on the source:

```bash
xtrabackup --backup \
  --user=root \
  --password=RootPass \
  --target-dir=/var/backup/mysql/$(date +%Y%m%d) \
  --slave-info \
  --compress

# Verify backup completed successfully
ls /var/backup/mysql/$(date +%Y%m%d)/
```

The `--slave-info` flag tells XtraBackup to record the source's binary log position in `xtrabackup_slave_info`, making the backup usable for seeding new replicas. The replica's own binary log position is always recorded in `xtrabackup_binlog_info`.

## Verifying Backup Contains Source Position

```bash
# For mysqldump (--source-data includes CHANGE REPLICATION SOURCE TO as a comment)
zcat /var/backups/mysql/latest.sql.gz | grep "CHANGE REPLICATION SOURCE"

# For XtraBackup (source position recorded by --slave-info)
cat /var/backup/mysql/latest/xtrabackup_slave_info
```

Example XtraBackup output:

```text
mysql-bin.000015  1234  aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:1-5000
```

This information allows seeding a new replica from this backup.

## Monitoring Replica Lag During Backup

Monitor that the backup does not cause excessive replica lag:

```bash
# Check lag every 10 seconds during backup
while true; do
  mysql -u root -p -e "SHOW REPLICA STATUS\G" | grep "Seconds_Behind_Source"
  sleep 10
done
```

If lag becomes too large, the backup is consuming too many resources. Consider:
- Limiting XtraBackup's I/O with `--throttle`
- Running mysqldump during off-peak hours

```bash
# --throttle limits chunks copied per second (each chunk is 10 MB)
xtrabackup --backup \
  --throttle=10 \
  --target-dir=/var/backup/mysql/
```

## Automated Daily Backup from Replica

```bash
#!/bin/bash
set -o pipefail

BACKUP_DIR=/var/backups/mysql
DATE=$(date +%Y%m%d_%H%M%S)
LOG=/var/log/mysql-backup.log

echo "$(date): Starting replica backup" >> $LOG

mysqldump -u root -p"$(cat /etc/mysql/mysql.pass)" \
  --all-databases \
  --single-transaction \
  --source-data=2 \
  --set-gtid-purged=ON \
  --flush-logs \
  | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

if [ $? -eq 0 ]; then
  echo "$(date): Backup completed successfully" >> $LOG
  # Clean up backups older than 14 days
  find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +14 -delete
else
  echo "$(date): ERROR - Backup failed" >> $LOG
fi
```

## Summary

Backing up from a replica is a best practice for production MySQL environments. It offloads the backup I/O and CPU overhead from the source, keeping production performance unaffected. Use `mysqldump --single-transaction --source-data=2 --set-gtid-purged=ON` for logical backups, or XtraBackup for large databases. Always verify the backup contains the source binary log position so it can be used to seed new replicas. Monitor replica lag during backups to ensure the backup process does not cause the replica to fall behind.
