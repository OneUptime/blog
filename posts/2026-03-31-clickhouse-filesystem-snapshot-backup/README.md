# How to Use Filesystem Snapshots for ClickHouse Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Snapshot, LVM, Filesystem

Description: Learn how to use LVM and filesystem snapshots for fast, consistent ClickHouse backups that minimize downtime and capture a point-in-time view.

---

Filesystem snapshots provide near-instantaneous, consistent backups of ClickHouse data by capturing the state of the underlying storage volume at a point in time. This approach is especially useful for very large datasets where BACKUP commands would take too long.

## How Filesystem Snapshots Work

LVM (Logical Volume Manager) and cloud block storage (EBS, Azure Disk) support copy-on-write snapshots. Creating a snapshot takes milliseconds - the snapshot captures the filesystem state at creation time, and writes after that point go to a new location while the snapshot retains the original blocks.

## Preparing ClickHouse for a Consistent Snapshot

For a consistent snapshot, flush buffered data to disk before capturing the volume:

```sql
-- Flush buffered log data to system log tables on disk
SYSTEM FLUSH LOGS;

-- Issue an fsync across ClickHouse's filesystem cache
SYSTEM SYNC FILE CACHE;
```

Alternatively, use FREEZE to create a consistent snapshot of table data:

```sql
-- Freeze specific table
ALTER TABLE events FREEZE WITH NAME 'snapshot_2026-03-31';

-- This creates a hardlink snapshot at:
-- /var/lib/clickhouse/shadow/snapshot_2026-03-31/
```

## LVM Snapshot Method

Create an LVM snapshot of the ClickHouse data volume:

```bash
#!/bin/bash
SNAPSHOT_NAME="ch-snapshot-$(date +%Y%m%d-%H%M%S)"
VOLUME_GROUP="data-vg"
LV_NAME="clickhouse-lv"
SNAPSHOT_SIZE="50G"

# Sync filesystem
sync

# Freeze ClickHouse writes (optional, for consistency)
clickhouse-client --query "SYSTEM SYNC FILE CACHE"

# Create LVM snapshot
lvcreate -L "$SNAPSHOT_SIZE" -s -n "$SNAPSHOT_NAME" "/dev/${VOLUME_GROUP}/${LV_NAME}"

echo "Snapshot created: /dev/${VOLUME_GROUP}/${SNAPSHOT_NAME}"
```

## Mounting and Copying the Snapshot

```bash
# Mount the snapshot read-only
MOUNT_POINT="/mnt/ch-snapshot"
mkdir -p "$MOUNT_POINT"
mount -o ro "/dev/${VOLUME_GROUP}/${SNAPSHOT_NAME}" "$MOUNT_POINT"

# Copy to backup destination
rsync -av --progress "$MOUNT_POINT/clickhouse/" "/backup/$(date +%Y-%m-%d)/"

# Unmount and remove snapshot
umount "$MOUNT_POINT"
lvremove -f "/dev/${VOLUME_GROUP}/${SNAPSHOT_NAME}"
```

## Cloud EBS Snapshot Method

For AWS EC2 instances, use EBS snapshots via the AWS CLI:

```bash
# Get the volume ID of the ClickHouse data volume
VOLUME_ID=$(aws ec2 describe-volumes \
    --filters Name=tag:Name,Values=clickhouse-data \
    --query 'Volumes[0].VolumeId' \
    --output text)

# Create EBS snapshot
aws ec2 create-snapshot \
    --volume-id "$VOLUME_ID" \
    --description "ClickHouse backup $(date +%Y-%m-%d)" \
    --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=clickhouse-backup}]'
```

## Using ALTER TABLE FREEZE

The FREEZE command creates hardlinked copies of table parts without full copies:

```sql
-- Freeze table
ALTER TABLE events FREEZE WITH NAME 'backup_20260331';

-- List parts that have a frozen backup
SELECT database, table, partition, name, rows
FROM system.parts
WHERE is_frozen = 1;
```

Copy the frozen data to backup storage:

```bash
rsync -av /var/lib/clickhouse/shadow/backup_20260331/ /backup/events_frozen/
```

Unfreeze after copying:

```sql
ALTER TABLE events UNFREEZE WITH NAME 'backup_20260331';
```

## Summary

Filesystem snapshots for ClickHouse backups work best for large datasets where BACKUP commands are too slow. Use `SYSTEM SYNC FILE CACHE` before snapshotting for consistency, `ALTER TABLE FREEZE` for table-level consistent snapshots, and LVM or EBS snapshots for full server-level snapshots. Always test snapshot restores in a staging environment before relying on them.
