# How to Plan a MySQL Disaster Recovery Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Disaster Recovery, High Availability, Backup, RTO RTO

Description: Learn how to design a MySQL disaster recovery strategy covering RPO and RTO targets, backup types, replication topology, and failover procedures.

---

## Disaster Recovery Fundamentals

A disaster recovery (DR) plan defines how you recover a MySQL database after a catastrophic failure. The two key metrics are:

- **RPO (Recovery Point Objective)** - maximum acceptable data loss (e.g., 1 hour means you can lose up to 1 hour of data)
- **RTO (Recovery Time Objective)** - maximum acceptable downtime (e.g., 30 minutes means you must restore service within 30 minutes)

Your DR strategy must meet both targets cost-effectively.

## Tier 1: Daily Backups Only (RPO 24h, RTO 2-4h)

The simplest strategy - daily full backups stored off-site:

```bash
# Daily backup job
0 2 * * * mysqldump -u root -p \
  --all-databases \
  --single-transaction \
  --flush-logs \
  | gzip | aws s3 cp - s3://my-backups/daily-$(date +%Y%m%d).sql.gz
```

Recovery procedure:

```bash
# Download latest backup
aws s3 cp s3://my-backups/daily-20260101.sql.gz /tmp/

# Restore
gunzip -c /tmp/daily-20260101.sql.gz | mysql -u root -p

# Expected recovery time: 30 min - 4 hours depending on DB size
```

## Tier 2: Full + Point-In-Time Recovery (RPO 5min, RTO 1-2h)

Combine daily full backups with binary log shipping for near-zero data loss:

```text
[mysqld]
log_bin = /var/log/mysql/binlog
binlog_expire_logs_seconds = 604800   # Retain 7 days
sync_binlog = 1                        # Full durability
```

Ship binary logs to S3 continuously:

```bash
# Upload new binary logs every 5 minutes
*/5 * * * * aws s3 sync /var/log/mysql/ s3://my-binlog-backup/ \
  --exclude "*" --include "binlog.*"
```

Point-in-time recovery procedure:

```bash
# 1. Restore last full backup
gunzip -c daily-20260101.sql.gz | mysql -u root -p

# 2. Apply binary logs up to the desired point
mysqlbinlog \
  --start-datetime="2026-01-01 02:00:00" \
  --stop-datetime="2026-01-01 14:30:00" \
  /var/log/mysql/binlog.000001 \
  /var/log/mysql/binlog.000002 \
  | mysql -u root -p
```

## Tier 3: Replication with Manual Failover (RPO near-0, RTO 5-15min)

Set up a standby replica for faster failover:

```sql
-- On primary
CREATE USER 'repl'@'%' IDENTIFIED WITH mysql_native_password BY 'replpass';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
```

```sql
-- On replica
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='primary.example.com',
  SOURCE_USER='repl',
  SOURCE_PASSWORD='replpass',
  SOURCE_AUTO_POSITION=1;
START REPLICA;
```

Manual failover procedure:

```bash
# 1. Promote replica to primary
mysql -u root -p -e "STOP REPLICA; RESET REPLICA ALL;"

# 2. Update DNS/load balancer to point to replica IP
aws route53 change-resource-record-sets ...

# 3. Configure other replicas to follow the new primary
```

## Tier 4: InnoDB Cluster with Automatic Failover (RPO near-0, RTO under 30s)

MySQL InnoDB Cluster provides fully automatic failover:

```bash
mysqlsh -- dba configureInstance root@primary:3306
mysqlsh -- dba createCluster 'myCluster' --interactive

mysqlsh -- cluster addInstance root@replica1:3306
mysqlsh -- cluster addInstance root@replica2:3306
```

InnoDB Cluster automatically elects a new primary if the current one fails.

## Geographic Redundancy

For region-level failures, replicate to a different region:

```text
us-east-1 (Primary)
    |-- InnoDB Cluster (3 nodes, automatic failover)
    |-- Cross-region async replica (us-west-2)

us-west-2 (DR Region)
    |-- Async replica (can promote if us-east-1 fails completely)
```

## DR Runbook Template

Document your DR procedures:

```text
# MySQL Disaster Recovery Runbook

## Scenario: Primary MySQL server unreachable

### Step 1: Confirm failure
- Ping primary server
- Check cloud console for instance status
- Check replication lag on replicas

### Step 2: Decide to failover
- Confirm with on-call manager if RTO budget > 10 minutes

### Step 3: Promote replica
1. Connect to replica: ssh replica.example.com
2. mysql -u root -p -e "STOP REPLICA; RESET REPLICA ALL;"
3. Verify no replication lag: mysql -e "SHOW REPLICA STATUS\G" (check Seconds_Behind_Source)

### Step 4: Update DNS
1. Update MySQL CNAME: mysql.example.com -> replica-ip
2. Wait for TTL (set to 60 seconds for fast failover)

### Step 5: Verify application connectivity
1. curl https://app.example.com/health
2. Confirm DB connection in application logs

### Step 6: Notify stakeholders
```

## Test Your DR Plan

```bash
# Quarterly DR drill: simulate primary failure
docker stop mysql-primary

# Start timer
time ./promote-replica.sh

# Verify application works
curl -f https://app.example.com/api/health

# Record actual RTO vs target
```

## Summary

A MySQL DR strategy must be designed around your RPO and RTO targets. Daily backups with binary log shipping cover most small-to-medium businesses (RPO 5 min, RTO 1-2 hours). For lower RTO requirements, virtually synchronous replication with InnoDB Cluster provides automatic failover in under 30 seconds. Document runbooks, test failovers quarterly, and always verify that backups are actually restorable.
