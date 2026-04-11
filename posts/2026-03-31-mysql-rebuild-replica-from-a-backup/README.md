# How to Rebuild a MySQL Replica from a Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Backup, Rebuild, Recovery

Description: Learn how to rebuild a broken MySQL replica from a backup using mysqldump, XtraBackup, or the Clone Plugin to resync with the source.

---

A MySQL replica can fall into an unrecoverable state due to data divergence, corruption, hardware failure, or an unresolvable replication error. Rather than debugging a deeply broken replica, it is often faster and safer to rebuild it from scratch using a fresh backup. This guide covers all three main rebuilding approaches.

## When to Rebuild a Replica

Consider rebuilding when:
- The replication error cannot be skipped without data loss
- `pt-table-checksum` shows significant data divergence
- The relay logs are corrupted
- The replica's disk failed and the data directory is empty or corrupt

## Preparing for Rebuild

First, confirm the source is healthy and identify the rebuild method:

```sql
-- On source, verify it is healthy
SHOW MASTER STATUS;
SELECT @@global.gtid_executed;
```

On the broken replica, stop replication and clean up:

```sql
-- Stop all replication threads
STOP REPLICA;
RESET REPLICA ALL;
```

## Method 1: Rebuild Using mysqldump

Take a fresh backup from the source (or another healthy replica):

```bash
# On source or a healthy replica
mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --source-data=2 \
  --flush-logs \
  --set-gtid-purged=ON \
  | gzip > /tmp/rebuild_snapshot.sql.gz

# Transfer to broken replica
scp /tmp/rebuild_snapshot.sql.gz broken-replica:/tmp/
```

On the replica, wipe and restore:

```bash
# Stop MySQL
systemctl stop mysql

# Clear the data directory (WARNING: this deletes all data)
rm -rf /var/lib/mysql/*

# Initialize a fresh data directory
mysqld --initialize-insecure --user=mysql

# Start MySQL
systemctl start mysql

# Restore the backup (no password after --initialize-insecure)
zcat /tmp/rebuild_snapshot.sql.gz | mysql -u root
```

## Method 2: Rebuild Using Percona XtraBackup

XtraBackup is faster than mysqldump for large databases:

```bash
# Create fresh backup on source
xtrabackup --backup \
  --user=root --password=RootPass \
  --target-dir=/var/backup/mysql/rebuild \
  --compress

# Prepare the backup
xtrabackup --decompress --target-dir=/var/backup/mysql/rebuild
xtrabackup --prepare --target-dir=/var/backup/mysql/rebuild

# Transfer to replica
rsync -avz /var/backup/mysql/rebuild/ broken-replica:/tmp/rebuild/

# On the replica
systemctl stop mysql
rm -rf /var/lib/mysql/*
xtrabackup --copy-back --target-dir=/tmp/rebuild/
chown -R mysql:mysql /var/lib/mysql
systemctl start mysql
```

## Method 3: Rebuild Using Clone Plugin (MySQL 8.0+)

The simplest approach for MySQL 8.0:

```sql
-- On the broken replica
STOP REPLICA;

-- Install Clone Plugin if not already installed
INSTALL PLUGIN clone SONAME 'mysql_clone.so';

-- Set the source as a valid donor
SET GLOBAL clone_valid_donor_list = '192.168.1.10:3306';

-- Initiate clone (this overwrites all local data)
CLONE INSTANCE FROM 'clone_donor'@'192.168.1.10':3306
  IDENTIFIED BY 'DonorPassword';

-- Server restarts automatically after clone
```

## Reconfiguring Replication After Rebuild

After data is restored via any method, configure replication:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.10',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'ReplPassword',
  SOURCE_AUTO_POSITION = 1;

START REPLICA;
SHOW REPLICA STATUS\G
```

## Monitoring the Rebuilt Replica

Watch catch-up progress:

```bash
watch -n 5 'mysql -u root -p -e "SHOW REPLICA STATUS\G" | grep -E "Running|Seconds_Behind|Error"'
```

Validate data consistency after catch-up:

```bash
pt-table-checksum \
  --host=192.168.1.10 \
  --replicate=percona.checksums \
  --databases=mydb
```

## Resetting GTID State if Needed

If GTID state on the rebuilt replica conflicts with the source:

```sql
STOP REPLICA;
RESET MASTER;  -- Clears local GTID executed set
RESET REPLICA ALL;

CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.10',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'ReplPassword',
  SOURCE_AUTO_POSITION = 1;

START REPLICA;
```

## Summary

Rebuilding a MySQL replica is often faster than debugging deep replication errors. Use `mysqldump --set-gtid-purged=ON` for smaller databases, XtraBackup for large InnoDB databases, or the MySQL Clone Plugin for the fastest and most automated rebuild on MySQL 8.0+. After restoring data, configure GTID auto-position replication and monitor with `SHOW REPLICA STATUS` until the replica fully catches up to the source.
