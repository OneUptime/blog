# How to Design a Redis Disaster Recovery Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Disaster Recovery, High Availability, DevOps, Infrastructure

Description: Learn how to design a comprehensive Redis disaster recovery plan covering backup strategies, failover procedures, RPO and RTO targets, and recovery testing.

---

Redis stores critical application state for millions of applications. A well-designed disaster recovery plan ensures you can restore service quickly when hardware fails, data is corrupted, or an entire region goes offline.

## Step 1: Define Your Recovery Objectives

Before designing anything, establish your targets:

- **RPO (Recovery Point Objective)**: How much data loss is acceptable? 0 seconds means no data loss; 1 hour means you can tolerate losing up to 1 hour of writes.
- **RTO (Recovery Time Objective)**: How long can the application be degraded before recovery is complete?

```text
Example targets for a session store:
  RPO: 5 minutes (lose up to 5 min of sessions is acceptable)
  RTO: 2 minutes (failover completes in under 2 minutes)

Example targets for a primary database cache:
  RPO: 0 (no data loss; cache can be rebuilt from DB)
  RTO: 30 seconds (warm replica takes over instantly)
```

## Step 2: Choose a Persistence Strategy

Match your persistence configuration to your RPO:

```bash
# For RPO of 5 minutes - use AOF with everysec fsync
redis-cli CONFIG SET appendonly yes
redis-cli CONFIG SET appendfsync everysec

# For RPO of 0 - use AOF with always fsync (significant performance cost)
redis-cli CONFIG SET appendfsync always

# For cache-only workloads (data loss acceptable) - RDB only
redis-cli CONFIG SET save "900 1 300 10 60 10000"
redis-cli CONFIG SET appendonly no
```

## Step 3: Set Up High Availability with Sentinel or Cluster

For single-region HA, use Redis Sentinel with at least 3 sentinel nodes:

```text
# sentinel.conf
sentinel monitor mymaster 10.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
sentinel parallel-syncs mymaster 1
```

For Redis Cluster, automatic failover happens when a primary loses quorum:

```bash
redis-cli --cluster create \
  10.0.0.1:6379 10.0.0.2:6379 10.0.0.3:6379 \
  10.0.0.4:6379 10.0.0.5:6379 10.0.0.6:6379 \
  --cluster-replicas 1
```

## Step 4: Configure Automated Backups

Set up scheduled RDB backups to object storage:

```bash
#!/bin/bash
# backup-redis.sh - run via cron every 15 minutes
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/redis-backup-${TIMESTAMP}.rdb"

redis-cli --rdb "$BACKUP_FILE"
aws s3 cp "$BACKUP_FILE" "s3://my-redis-backups/daily/"
rm "$BACKUP_FILE"

# Retain only the last 48 backups
aws s3 ls s3://my-redis-backups/daily/ \
  | sort | head -n -48 \
  | awk '{print $4}' \
  | xargs -I{} aws s3 rm "s3://my-redis-backups/daily/{}"
```

## Step 5: Document Your Recovery Runbook

Your runbook must be executable under pressure. Capture these procedures:

```text
SCENARIO: Primary node failure
  1. Verify Sentinel has promoted a replica: redis-cli -p 26379 SENTINEL masters
  2. Update application DNS or VIP to point to new primary
  3. Start a new replica to restore redundancy
  4. Alert: page on-call via OneUptime

SCENARIO: Total data loss
  1. Identify latest backup: aws s3 ls s3://my-redis-backups/daily/ | sort | tail -1
  2. Stop Redis: systemctl stop redis
  3. Back up existing RDB: cp /var/lib/redis/dump.rdb /var/lib/redis/dump.rdb.bak
  4. Download backup: aws s3 cp s3://my-redis-backups/daily/<file> /var/lib/redis/dump.rdb
  5. Start Redis: systemctl start redis
  6. Verify: redis-cli DBSIZE
```

## Step 6: Test Your Plan

DR plans that are never tested fail when needed. Schedule quarterly drills:

```bash
# Simulate primary failure
redis-cli -p 26379 SENTINEL failover mymaster

# Verify new primary
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

## Summary

A Redis disaster recovery plan requires clear RPO and RTO targets, matching persistence configuration, automated backups to durable storage, and a documented runbook. High availability via Sentinel or Cluster covers most single-region failure scenarios. Quarterly DR drills ensure your team can execute recovery procedures confidently under pressure.
