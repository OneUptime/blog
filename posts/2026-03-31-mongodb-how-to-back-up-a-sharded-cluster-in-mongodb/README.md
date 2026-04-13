# How to Back Up a Sharded Cluster in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Backup, Database Administration

Description: Learn how to back up a MongoDB sharded cluster by stopping the balancer, snapshotting each shard and config server, ensuring data consistency across shards.

---

## Overview

Backing up a sharded MongoDB cluster is more complex than backing up a standalone or replica set because data is distributed across multiple shards and a config server. The key challenge is ensuring a consistent point-in-time snapshot across all shards. Unlike replica sets, you cannot simply run mongodump against a sharded cluster and expect a perfectly consistent backup.

## Two Approaches

There are two main approaches to backing up a sharded cluster:

1. **Stop the balancer + mongodump each shard** - simpler but requires stopping chunk migration
2. **Filesystem snapshots** - more complex but can be done with minimal downtime

This guide covers the first approach. For filesystem snapshots, see the dedicated post.

## Step 1 - Stop the Balancer

Stopping the balancer prevents chunk migrations during backup, which would cause inconsistency:

```javascript
// Connect to mongos
use config
sh.stopBalancer()

// Verify balancer is stopped
sh.getBalancerState()
// Returns: false

// Also confirm no balancer round is running
sh.isBalancerRunning()
// Should return: false
```

Wait for any in-progress migrations to complete:

```javascript
// Wait until no migration is in progress
while (sh.isBalancerRunning()) {
  print("Waiting for balancer to stop...")
  sleep(1000)
}
```

## Step 2 - Stop All Writes (Recommended)

For a fully consistent backup, stop application writes. This is the safest approach:

```bash
# Option: Put application in maintenance mode
# Or: Temporarily block writes at the load balancer level
```

If you cannot stop writes, the backup will still be usable but may have some cross-shard inconsistencies for operations spanning multiple shards.

## Step 3 - Back Up the Config Server

The config server contains sharding metadata. Back it up first:

```bash
# The config server is typically a replica set (CSRS)
mongodump --uri "mongodb://admin:secret@configsvr1:27019,configsvr2:27019,configsvr3:27019/config?replicaSet=csReplSet"   --db config   --out /backup/sharded/config-$(date +%Y%m%d)
```

## Step 4 - Back Up Each Shard

Connect directly to each shard's primary (or a secondary) and run mongodump:

```bash
# Back up shard 1 (connect directly to shard, not through mongos)
mongodump --uri "mongodb://admin:secret@shard1-primary:27017/?replicaSet=shard1rs"   --out /backup/sharded/shard1-$(date +%Y%m%d)   --readPreference secondaryPreferred

# Back up shard 2
mongodump --uri "mongodb://admin:secret@shard2-primary:27017/?replicaSet=shard2rs"   --out /backup/sharded/shard2-$(date +%Y%m%d)   --readPreference secondaryPreferred

# Back up shard 3
mongodump --uri "mongodb://admin:secret@shard3-primary:27017/?replicaSet=shard3rs"   --out /backup/sharded/shard3-$(date +%Y%m%d)   --readPreference secondaryPreferred
```

Important: Always connect directly to each shard, never through the mongos router, when taking backups.

## Step 5 - Resume the Balancer

After all shards are backed up, re-enable the balancer:

```javascript
// Connect to mongos
sh.startBalancer()

// Verify
sh.getBalancerState()
// Returns: true
```

## Automating the Entire Process

```bash
#!/bin/bash
# backup-sharded-cluster.sh

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_BASE="/backup/sharded/${DATE}"
MONGOS_URI="mongodb://admin:secret@mongos1:27017"

mkdir -p "${BACKUP_BASE}"

# 1. Stop balancer
echo "Stopping balancer..."
mongosh "${MONGOS_URI}" --eval 'sh.stopBalancer(); print("Balancer stopped:", !sh.getBalancerState())'

# 2. Back up config server
echo "Backing up config server..."
mongodump --uri "mongodb://admin:secret@configsvr1:27019/?replicaSet=csReplSet"   --db config   --out "${BACKUP_BASE}/config"

# 3. Back up each shard
for i in 1 2 3; do
  echo "Backing up shard${i}..."
  mongodump --uri "mongodb://admin:secret@shard${i}-primary:27017/?replicaSet=shard${i}rs"     --out "${BACKUP_BASE}/shard${i}"     --readPreference secondaryPreferred
done

# 4. Re-enable balancer
echo "Re-enabling balancer..."
mongosh "${MONGOS_URI}" --eval 'sh.startBalancer(); print("Balancer started:", sh.getBalancerState())'

echo "Backup complete: ${BACKUP_BASE}"
```

## Verifying the Backup

```bash
# Check the backup directory structure
ls -la /backup/sharded/20260331-100000/

# Expected structure:
# config/    <- config server backup
# shard1/    <- shard 1 data
# shard2/    <- shard 2 data
# shard3/    <- shard 3 data

# Verify backup files can be restored (dry run)
mongorestore --dryRun --dir /backup/sharded/20260331-100000/shard1/
```

## Summary

Backing up a sharded MongoDB cluster requires stopping the balancer to prevent chunk migrations during the backup window, then backing up the config server and each shard individually. Always connect directly to each shard replica set rather than going through a mongos router. Resume the balancer after all backups complete. For production environments, consider MongoDB Ops Manager or Atlas automated backups, which handle cluster-level consistency automatically.
