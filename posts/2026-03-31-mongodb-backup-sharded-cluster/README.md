# How to Back Up a Sharded MongoDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Sharding, Disaster Recovery, Database

Description: Learn how to back up a sharded MongoDB cluster consistently using mongodump, filesystem snapshots, and balancer pausing to ensure data integrity across all shards.

---

Backing up a sharded cluster is more complex than backing up a standalone replica set because data is distributed across multiple shards and config servers. A consistent backup requires pausing the balancer and capturing all shards and the config server at the same point in time.

## Stop the Balancer Before Backup

The balancer moves chunks between shards. If it runs during backup, data may appear on different shards in different backup snapshots, resulting in inconsistency.

```javascript
// Connect to mongos and pause the balancer
sh.stopBalancer()

// Wait for all in-progress migrations to finish
while (sh.isBalancerRunning()) {
  print("Waiting for balancer to stop...")
  sleep(1000)
}

sh.getBalancerState() // Should return false
```

## Back Up the Config Server

Back up the config replica set first - it holds all the chunk metadata:

```bash
mongodump \
  --host configReplSet/cfg1.example.com:27019,cfg2.example.com:27019,cfg3.example.com:27019 \
  --db config \
  --out /backup/config-$(date +%F)
```

## Back Up Each Shard

Back up each shard's replica set independently. Use `--readPreference secondaryPreferred` to read from a secondary and avoid impacting the primary:

```bash
# Shard 1
mongodump \
  --host shard1RS/shard1a.example.com:27018,shard1b.example.com:27018 \
  --readPreference secondaryPreferred \
  --out /backup/shard1-$(date +%F)

# Shard 2
mongodump \
  --host shard2RS/shard2a.example.com:27018,shard2b.example.com:27018 \
  --readPreference secondaryPreferred \
  --out /backup/shard2-$(date +%F)
```

Repeat for all shards.

## Using Filesystem Snapshots

For large clusters, filesystem snapshots (LVM or cloud volume snapshots) are faster than `mongodump`. The process is:

1. Stop the balancer.
2. Lock the secondary on each shard for snapshot consistency.
3. Take a snapshot of the storage volume on each shard secondary.
4. Unlock the secondaries.
5. Restart the balancer.

```javascript
// Lock a secondary (connect directly to the secondary node)
db.fsyncLock()

// After snapshot completes
db.fsyncUnlock()
```

## Re-enable the Balancer

After all shards and config servers are backed up, restart the balancer:

```javascript
sh.startBalancer()
sh.getBalancerState() // Should return true
```

## Verify the Backup

Test the backup by restoring it to a separate environment:

```bash
# Restore config server backup
mongorestore \
  --host localhost:27019 \
  --dir /backup/config-$(date +%F)/config \
  --db config

# Restore a shard backup
mongorestore \
  --host localhost:27018 \
  --dir /backup/shard1-$(date +%F)
```

Run document count checks on critical collections after restore to verify completeness.

## Automate with a Shell Script

```bash
#!/bin/bash
DATE=$(date +%F)
BACKUP_DIR="/backup/$DATE"
mkdir -p "$BACKUP_DIR"

# Pause balancer
mongosh --quiet --eval "sh.stopBalancer()" mongos.example.com:27017

# Backup config
mongodump --host configReplSet/cfg1:27019,cfg2:27019 --db config --out "$BACKUP_DIR/config"

# Backup shards
for SHARD in "shard1RS/shard1a:27018" "shard2RS/shard2a:27018"; do
  NAME=$(echo "$SHARD" | cut -d/ -f1)
  mongodump --host "$SHARD" --readPreference secondaryPreferred --out "$BACKUP_DIR/$NAME"
done

# Resume balancer
mongosh --quiet --eval "sh.startBalancer()" mongos.example.com:27017

echo "Backup complete: $BACKUP_DIR"
```

## Summary

Backing up a sharded MongoDB cluster requires pausing the balancer, capturing the config server, and backing up each shard independently. Using filesystem snapshots scales better for large clusters, while `mongodump` is simpler for smaller deployments. Always test your restores regularly to confirm backup integrity.
