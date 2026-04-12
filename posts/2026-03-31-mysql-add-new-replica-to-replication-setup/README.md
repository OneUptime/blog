# How to Add a New Replica to an Existing MySQL Replication Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Replica, Scaling, Administration

Description: Learn how to add a new MySQL replica to an existing replication setup using mysqldump, XtraBackup, or the Clone Plugin.

---

Adding a new replica to an existing MySQL replication setup is a common scaling operation - whether for read scaling, high availability, or offloading backups. The process involves seeding the replica with a consistent copy of the source data and then starting replication from the correct position.

## Choose Your Seeding Method

Three main options exist for seeding a new replica:

1. **mysqldump** - Simple, no downtime, suitable for smaller databases (under 50 GB)
2. **Percona XtraBackup** - Fast, non-blocking, suited for large InnoDB databases
3. **MySQL Clone Plugin** - Fastest and simplest for MySQL 8.0+

## Method 1: Using mysqldump

On the source server, create a backup with GTID or position information:

```bash
mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --source-data=2 \
  --flush-logs \
  --set-gtid-purged=ON \
  | gzip > /tmp/source_snapshot.sql.gz
```

Transfer to the new replica:

```bash
scp /tmp/source_snapshot.sql.gz replica-server:/tmp/
```

On the new replica, configure `my.cnf`:

```ini
[mysqld]
server_id = 3
log_bin = /var/lib/mysql/binlogs/mysql-bin
relay_log = /var/lib/mysql/relaylogs/relay-bin
read_only = ON
super_read_only = ON
gtid_mode = ON
enforce_gtid_consistency = ON
log_replica_updates = ON
```

Restore the snapshot:

```bash
zcat /tmp/source_snapshot.sql.gz | mysql -u root -p
```

Configure and start replication:

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

## Method 2: Using Percona XtraBackup

For large databases, XtraBackup takes a hot backup without blocking writes:

On the source:

```bash
xtrabackup --backup \
  --user=root --password=RootPass \
  --target-dir=/var/backup/mysql/new-replica \
  --compress

# Transfer to new replica
rsync -avz /var/backup/mysql/new-replica/ replica:/var/backup/mysql/
```

On the new replica:

```bash
# Decompress and prepare
xtrabackup --decompress --target-dir=/var/backup/mysql/new-replica
xtrabackup --prepare --target-dir=/var/backup/mysql/new-replica

# Stop MySQL and restore
systemctl stop mysql
xtrabackup --copy-back --target-dir=/var/backup/mysql/new-replica
chown -R mysql:mysql /var/lib/mysql

systemctl start mysql
```

Get the GTID position from the backup:

```bash
cat /var/backup/mysql/new-replica/xtrabackup_binlog_info
```

Then configure replication as shown in Method 1.

## Method 3: Using the MySQL Clone Plugin (MySQL 8.0+)

The Clone Plugin is the fastest and most automated approach:

On the new replica, ensure the Clone Plugin is installed:

```sql
INSTALL PLUGIN clone SONAME 'mysql_clone.so';
```

Configure the donor list and clone:

```sql
SET GLOBAL clone_valid_donor_list = '192.168.1.10:3306';

CLONE INSTANCE FROM 'clone_donor'@'192.168.1.10':3306
  IDENTIFIED BY 'DonorPassword';
```

After the server restarts automatically, configure replication:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.10',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'ReplPassword',
  SOURCE_AUTO_POSITION = 1;

START REPLICA;
```

## Creating the Replication User on the Source

If not already present, create the replication user:

```sql
-- On the source
CREATE USER 'repl_user'@'192.168.1.%' IDENTIFIED BY 'ReplPassword';
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'192.168.1.%';
FLUSH PRIVILEGES;
```

## Monitoring the New Replica

```sql
-- Check replication is running
SHOW REPLICA STATUS\G
```

Monitor catch-up progress from the shell:

```bash
watch -n 5 "mysql -u root -p -e 'SHOW REPLICA STATUS\G' | grep Seconds_Behind"
```

## Summary

Adding a new MySQL replica involves seeding it with a consistent snapshot and then starting GTID-based replication. Use `mysqldump --set-gtid-purged=ON` for smaller databases, Percona XtraBackup for large InnoDB datasets, or the MySQL Clone Plugin for the fastest zero-configuration approach on MySQL 8.0+. Always configure `read_only=ON`, `super_read_only=ON`, and `log_replica_updates=ON` on the new replica before starting replication.
