# How to Implement Hot Backup for MongoDB Enterprise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Enterprise, Snapshot, Recovery

Description: Learn how to take hot (online) backups of MongoDB Enterprise using filesystem snapshots and the fsyncLock mechanism without downtime.

---

## What Is a Hot Backup

A hot backup is taken while the database is fully operational and serving traffic. MongoDB Enterprise supports hot backups through two mechanisms: using `db.fsyncLock()` to briefly pause writes and flush to disk before snapping a filesystem or LVM snapshot, or using MongoDB Ops Manager/Cloud Manager which coordinate consistent snapshots across replica sets without any application-visible pause.

Hot backups are essential for production systems where maintenance windows are impractical.

## Method 1: fsyncLock with LVM Snapshot

This approach briefly locks writes (milliseconds for the flush), takes an LVM snapshot, then unlocks:

```bash
#!/bin/bash
# hot-backup-lvm.sh

MONGO_URI="mongodb://admin:pass@localhost:27017"
VG_NAME="vg_data"
LV_NAME="lv_mongodb"
SNAP_NAME="lv_mongodb_snap"
SNAP_SIZE="10G"
MOUNT_POINT="/mnt/mongodb-snap"
BACKUP_DEST="/backups/hot/$(date +%Y%m%d-%H%M%S)"

echo "Flushing writes and locking MongoDB..."
mongosh "$MONGO_URI" --eval "db.fsyncLock()"

echo "Creating LVM snapshot..."
lvcreate -L "$SNAP_SIZE" -s -n "$SNAP_NAME" "/dev/$VG_NAME/$LV_NAME"

echo "Unlocking MongoDB..."
mongosh "$MONGO_URI" --eval "db.fsyncUnlock()"

echo "Mounting snapshot..."
mkdir -p "$MOUNT_POINT"
mount -o ro "/dev/$VG_NAME/$SNAP_NAME" "$MOUNT_POINT"

echo "Copying data files..."
mkdir -p "$BACKUP_DEST"
rsync -a "$MOUNT_POINT/" "$BACKUP_DEST/"

echo "Unmounting and removing snapshot..."
umount "$MOUNT_POINT"
lvremove -f "/dev/$VG_NAME/$SNAP_NAME"

echo "Hot backup complete: $BACKUP_DEST"
```

The lock window (between `fsyncLock` and `fsyncUnlock`) is typically under a second on modern systems. Applications queuing writes during this window are not affected - they simply wait.

## Method 2: MongoDB Ops Manager Backup

MongoDB Ops Manager provides automated hot backups for Enterprise deployments with no locking required. Configure the automation agent in `automation-agent.config`:

```text
mmsGroupId=your-group-id
mmsApiKey=your-api-key
mmsBaseUrl=https://your-ops-manager-host:8080
```

Start backup for a replica set via the Ops Manager API:

```bash
curl -u "publicKey:privateKey" \
  --digest \
  -H "Content-Type: application/json" \
  -X POST \
  "https://your-ops-manager-host:8080/api/public/v1.0/groups/{groupId}/backupConfigs/{clusterId}" \
  -d '{
    "statusName": "STARTED",
    "storageEngineName": "WIRED_TIGER",
    "snapshotIntervalHours": 6,
    "snapshotRetentionDays": 7
  }'
```

## Verifying the Hot Backup

After taking a hot backup, verify the data files are consistent:

```bash
# Start a separate mongod instance pointing at backup directory
mongod --dbpath "$BACKUP_DEST" \
  --port 27018 \
  --logpath /tmp/verify-mongod.log \
  --fork

# Verify collections are accessible
mongosh --port 27018 --eval "
  db.adminCommand({listDatabases:1}).databases.forEach(d => {
    db.getSiblingDB(d.name).getCollectionNames().forEach(c => {
      const count = db.getSiblingDB(d.name).getCollection(c).countDocuments();
      print(d.name + '.' + c + ': ' + count + ' docs');
    });
  });
"

# Shut down verify instance
mongosh --port 27018 --eval "db.adminCommand({shutdown:1})"
```

## Hot Backup on Replica Set Secondary

For replica sets, a best practice is to take hot backups from a secondary to avoid any impact on primary write throughput:

```bash
# Connect to secondary and verify it's not primary
mongosh "$SECONDARY_URI" --eval "db.hello().isWritablePrimary"
# Should return false

# Take backup from secondary
mongosh "$SECONDARY_URI" --eval "db.fsyncLock()"
lvcreate -L 10G -s -n mongodb_snap /dev/vg_data/lv_mongodb
mongosh "$SECONDARY_URI" --eval "db.fsyncUnlock()"
```

Monitor the secondary's replication lag before and after the backup to ensure it catches up quickly.

## Summary

MongoDB Enterprise hot backups allow you to capture consistent snapshots while the database remains online. Use `fsyncLock` combined with LVM snapshots for self-hosted deployments, or Ops Manager for automated, coordinated backups across replica sets. Always take hot backups from secondaries to minimize primary impact, and validate every backup by spinning up a test instance against the backup files.
