# How to Upgrade Redis Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Upgrade, Zero Downtime, Operation, High Availability

Description: Learn how to upgrade Redis to a new major version without downtime using rolling replica upgrades, Sentinel failover, and blue-green deployment strategies.

---

## Upgrade Strategies Overview

The right upgrade strategy depends on your deployment:

| Setup | Strategy | Downtime |
|-------|----------|----------|
| Single instance | Restart with CONFIG REWRITE or in-place upgrade | Brief (seconds) |
| Primary + replica | Rolling upgrade - replicas first, then failover | None |
| Redis Sentinel | Rolling upgrade with sentinel-managed failover | None |
| Redis Cluster | Rolling upgrade node by node | None |

## Pre-Upgrade Checklist

Before upgrading any node:

```bash
# 1. Check current version
redis-cli INFO server | grep redis_version

# 2. Verify replication status
redis-cli INFO replication

# 3. Create a backup
redis-cli BGSAVE
# Wait for save to complete
redis-cli LASTSAVE

# 4. Check for breaking changes in release notes
# https://raw.githubusercontent.com/redis/redis/7.0/00-RELEASENOTES

# 5. Test compatibility: check deprecated commands your app uses
redis-cli COMMAND DOCS DEBUG
```

## Method 1: Rolling Upgrade with Primary/Replica

Upgrade replicas first, then failover to a replica and upgrade the old primary.

Step 1 - Upgrade the replica:

```bash
# On the replica server
# Install new Redis version (example: package manager)
sudo apt-get update
sudo apt-get install redis-server=7.2.*

# Restart replica (brief interruption to replica, primary keeps serving)
sudo systemctl restart redis-server

# Verify replica is running new version and resynced
redis-cli -p 6380 INFO server | grep redis_version
redis-cli -p 6380 INFO replication | grep master_link_status
# master_link_status:up
```

Step 2 - Failover to the upgraded replica:

```bash
# On the PRIMARY, ensure it is responsive before proceeding
redis-cli -p 6379 PING  # Should return PONG

# Trigger failover: the replica will promote itself
redis-cli -p 6380 REPLICAOF NO ONE

# Reconfigure the old primary as a replica of the new primary
redis-cli -p 6379 REPLICAOF <new_primary_ip> 6380
```

Step 3 - Upgrade the old primary (now a replica):

```bash
# It is now a replica, safe to upgrade
sudo apt-get install redis-server=7.2.*
sudo systemctl restart redis-server

# Verify it reconnected as replica
redis-cli -p 6379 INFO replication | grep role
# role:slave
```

## Method 2: Sentinel-Managed Failover Upgrade

With Redis Sentinel, the failover is managed automatically.

Step 1 - Identify the current primary:

```bash
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
# Returns: primary IP and port
```

Step 2 - Upgrade replicas one at a time:

```bash
# For each replica (NOT the primary)
sudo systemctl stop redis-server
# Install new version
sudo apt-get install redis-server=7.2.*
sudo systemctl start redis-server

# Wait for replica to resync before proceeding to next
redis-cli -p 6380 INFO replication | grep master_link_status
```

Step 3 - Initiate sentinel failover to move primary to an upgraded replica:

```bash
# Force sentinel to failover to a replica that is already upgraded
redis-cli -p 26379 SENTINEL failover mymaster

# Monitor the failover
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

Step 4 - Upgrade the demoted primary (now a replica):

```bash
sudo systemctl stop redis-server
sudo apt-get install redis-server=7.2.*
sudo systemctl start redis-server

# Verify it rejoined as replica
redis-cli INFO replication
```

## Method 3: In-Place Upgrade with CONFIG REWRITE

For single-instance environments where brief downtime is acceptable:

```bash
# 1. Save current config
redis-cli CONFIG REWRITE

# 2. Backup RDB/AOF files
cp /var/lib/redis/dump.rdb /backup/dump.rdb.$(date +%Y%m%d)

# 3. Stop Redis
sudo systemctl stop redis-server

# 4. Install new version
sudo apt-get install redis-server=7.2.*

# 5. Start Redis (existing data files are compatible)
sudo systemctl start redis-server

# 6. Verify version and data
redis-cli INFO server | grep redis_version
redis-cli DBSIZE
```

## Testing Compatibility Before Upgrade

Run a canary test by connecting to the new version with a copy of your data:

```bash
# Verify the new Redis version installed correctly
redis-server --version

# Load a snapshot from the primary
redis-cli -p 6379 BGSAVE
cp /var/lib/redis/dump.rdb /tmp/canary/dump.rdb

redis-server /tmp/canary/redis.conf --port 6399 --dir /tmp/canary/

# Run your application's smoke tests against port 6399
redis-cli -p 6399 INFO server | grep redis_version
```

## Monitoring During Upgrade

Watch these metrics during and after upgrade:

```bash
# Monitor replication lag
watch -n 2 'redis-cli INFO replication | grep -E "role|master_link_status|master_repl_offset|slave_repl_offset"'

# Monitor connected clients
watch -n 2 'redis-cli INFO clients'

# Watch for errors
redis-cli MONITOR 2>&1 | head -100
```

## Rollback Plan

If the upgrade causes issues:

```bash
# Stop new version
sudo systemctl stop redis-server

# Reinstall old version
sudo apt-get install redis-server=6.2.*

# Start with existing data files (backward compatible)
sudo systemctl start redis-server

# Verify data is accessible
redis-cli DBSIZE
redis-cli PING
```

Note: Redis data files are generally forward-compatible but not always backward-compatible between major versions. Test rollback in staging first.

## Summary

Upgrading Redis without downtime requires a primary/replica setup and a rolling upgrade approach: upgrade replicas first while the primary continues serving traffic, then use Sentinel failover or manual REPLICAOF NO ONE to promote an upgraded replica, and finally upgrade the demoted primary. Always take an RDB backup before upgrading, test on a canary instance loaded with production data, and have a rollback plan ready. The entire process typically completes in under 30 minutes with zero client-visible downtime.
