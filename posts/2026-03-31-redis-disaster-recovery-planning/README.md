# How to Plan Redis Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Disaster Recovery, Reliability

Description: Learn how to plan and implement Redis disaster recovery covering backup strategies, RTO/RPO targets, failover procedures, and recovery testing.

---

Redis disaster recovery planning ensures you can restore service within defined time objectives when catastrophic failures occur. This guide covers the key components of a solid DR strategy.

## Define Your RTO and RPO

Before configuring anything, establish your requirements:

```text
RTO (Recovery Time Objective): How long can Redis be unavailable?
RPO (Recovery Point Objective): How much data loss is acceptable?

Example targets:
  Cache-only Redis: RTO 5 min, RPO 1 hour (cache warms from DB)
  Session store:    RTO 1 min, RPO 5 min
  Primary data store: RTO 30 sec, RPO 0 (no data loss)
```

## Backup Strategy by RPO

For RPO > 15 minutes - RDB snapshots:

```bash
# redis.conf
save 900 1
save 300 10
save 60 10000
dbfilename dump.rdb
dir /var/lib/redis
```

For RPO < 5 minutes - AOF with periodic offsite sync:

```bash
# redis.conf
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

## Offsite Backup Replication

```bash
#!/bin/bash
# sync-redis-backups.sh
SOURCE="/var/lib/redis"
S3_BUCKET="s3://my-redis-backups"
DATE=$(date +%Y/%m/%d)

# Sync RDB file
aws s3 cp "$SOURCE/dump.rdb" "$S3_BUCKET/$DATE/dump-$(date +%H%M).rdb"

# Sync AOF directory (Redis 7.0+ uses multi-part AOF)
tar czf - -C "$SOURCE" appendonlydir | aws s3 cp - "$S3_BUCKET/$DATE/aof-$(date +%H%M).tar.gz"

echo "Backup sync complete at $(date)"
```

Schedule every 15 minutes:

```bash
*/15 * * * * /usr/local/bin/sync-redis-backups.sh >> /var/log/redis-backup.log 2>&1
```

## High Availability as DR Prevention

Redis Sentinel for automatic failover:

```text
# sentinel.conf
sentinel monitor mymaster 10.0.1.5 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

```bash
# Check sentinel status
redis-cli -p 26379 SENTINEL masters
redis-cli -p 26379 SENTINEL replicas mymaster
```

## Recovery Procedures

Recovery from RDB backup:

```bash
#!/bin/bash
BACKUP_FILE="$1"
REDIS_DIR="/var/lib/redis"

systemctl stop redis
redis-check-rdb "$BACKUP_FILE" || { echo "RDB invalid, aborting"; exit 1; }
cp "$BACKUP_FILE" "$REDIS_DIR/dump.rdb"
chown redis:redis "$REDIS_DIR/dump.rdb"
systemctl start redis
redis-cli PING && echo "Recovery successful"
```

Recovery from S3:

```bash
#!/bin/bash
DATE="${1:-$(date +%Y/%m/%d)}"
S3_BUCKET="s3://my-redis-backups"

aws s3 ls "$S3_BUCKET/$DATE/" | tail -5  # list available backups
aws s3 cp "$S3_BUCKET/$DATE/dump-latest.rdb" /tmp/restore.rdb
/usr/local/bin/redis-restore.sh /tmp/restore.rdb
```

## Recovery Testing Schedule

```text
Test                        | Frequency | Owner
----------------------------|-----------|-------
Restore from RDB backup     | Monthly   | DevOps
Sentinel failover test      | Quarterly | DevOps
Full DR simulation          | Semi-annual | DevOps + App team
Backup integrity check      | Weekly    | Automated
```

## DR Runbook Template

```text
Incident: Redis primary failure
Severity: P1

Step 1: Verify failure
  redis-cli -h primary-ip PING
  redis-cli -h sentinel-ip -p 26379 SENTINEL masters

Step 2: Check Sentinel auto-failover
  redis-cli -h sentinel-ip -p 26379 SENTINEL master mymaster
  # If "flags" shows "master", failover succeeded

Step 3: Manual failover if Sentinel stuck
  redis-cli -h sentinel-ip -p 26379 SENTINEL failover mymaster

Step 4: Update application connection strings if needed

Step 5: Monitor for 30 minutes post-failover
```

## Summary

Redis disaster recovery requires matching backup strategy to your RPO target, automating offsite backup sync, configuring Sentinel or Cluster for fast automatic failover, documenting step-by-step recovery procedures, and regularly testing restores. A DR plan that is never tested is a DR plan that will fail when you need it most.
