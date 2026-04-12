# How to Implement a Disaster Recovery Plan for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Disaster Recovery, Backup, Replication, Database

Description: Learn how to build a MySQL disaster recovery plan covering RPO, RTO, backup strategies, replication, and failover procedures.

---

A disaster recovery (DR) plan for MySQL defines what happens when your primary database becomes unavailable due to hardware failure, data corruption, or a regional outage. Without a clear plan, recovery becomes a stressful, error-prone scramble. This guide walks through the key components of a practical MySQL DR plan.

## Define RPO and RTO

Before choosing any technical approach, define your business requirements:

- **RPO (Recovery Point Objective)**: How much data loss is acceptable? An RPO of 1 hour means you can tolerate losing up to one hour of transactions.
- **RTO (Recovery Time Objective)**: How quickly must the database be back online? An RTO of 15 minutes requires standby infrastructure ready to promote.

These numbers drive all technical decisions.

## Backup Strategy

Layer your backups for comprehensive coverage:

```bash
# Daily full logical backup
mysqldump -u root -p --all-databases --single-transaction \
  --source-data=2 --flush-logs \
  | gzip > /var/backups/mysql/full_$(date +%Y%m%d).sql.gz

# Hourly binary log backup
rsync -av /var/lib/mysql/binlogs/ /var/backups/mysql/binlogs/
```

Configure binary log retention to cover your RPO window:

```ini
[mysqld]
log_bin = /var/lib/mysql/binlogs/mysql-bin
binlog_expire_logs_seconds = 604800  # 7 days
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
```

## Replication-Based Standby

A replica provides near-real-time data redundancy:

```sql
-- Check replication health
SHOW REPLICA STATUS\G

-- Monitor lag
SELECT TIMESTAMPDIFF(SECOND, MAX(ts), NOW()) AS lag_seconds
FROM heartbeat;
```

For minimal RTO, consider MySQL InnoDB Cluster which automates failover:

```bash
# Using MySQL Shell
mysqlsh -- cluster status
mysqlsh -- cluster setPrimaryInstance replica.db.example.com:3306
```

## Point-in-Time Recovery Procedure

When data corruption is discovered, use binary logs to recover to a specific moment:

```bash
# Restore the last full backup
mysql -u root -p < /var/backups/mysql/full_20240315.sql

# Apply binary logs up to the corruption event
mysqlbinlog --start-datetime="2024-03-15 00:00:00" \
            --stop-datetime="2024-03-15 14:30:00" \
            /var/lib/mysql/binlogs/mysql-bin.000042 | mysql -u root -p
```

## Failover Runbook

Document and rehearse the failover steps:

```bash
#!/bin/bash
# DR Failover Runbook

echo "Step 1: Verify primary is unreachable"
mysqladmin -h primary.db.example.com ping 2>&1 || echo "Primary is DOWN"

echo "Step 2: Check replica status"
mysql -h replica.db.example.com -e "SHOW REPLICA STATUS\G" | grep Seconds_Behind_Source

echo "Step 3: Stop replication on replica"
mysql -h replica.db.example.com -e "STOP REPLICA;"

echo "Step 4: Make replica writable"
mysql -h replica.db.example.com -e "SET GLOBAL read_only = OFF; SET GLOBAL super_read_only = OFF;"

echo "Step 5: Update DNS/load balancer to point to replica"
# aws route53 change-resource-record-sets ...

echo "Failover complete. New primary: replica.db.example.com"
```

## Testing the DR Plan

DR plans that are never tested fail when needed. Schedule quarterly DR drills:

```bash
# Test restore to an isolated environment monthly
docker run -d --name dr-test --network isolated -p 3307:3306 \
  -e MYSQL_ROOT_PASSWORD=drtest mysql:8.0

mysql -h 127.0.0.1 -P 3307 -u root -pdrtest < /var/backups/mysql/latest.sql

# Validate key tables
mysql -h 127.0.0.1 -P 3307 -u root -pdrtest -e "SELECT COUNT(*) FROM mydb.orders;"
```

## Summary

An effective MySQL DR plan combines clear RPO/RTO targets, layered backups with binary log retention, a tested standby replica, and a documented failover runbook. Enable `sync_binlog=1` and `innodb_flush_log_at_trx_commit=1` for durability. Test restores monthly and run full DR drills quarterly - a plan rehearsed under calm conditions is far more reliable in an actual crisis.
