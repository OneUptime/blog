# How to Back Up ClickHouse Keeper Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, Backup, Snapshot, Operation

Description: Learn how to back up ClickHouse Keeper snapshots and Raft logs to protect your coordination metadata and ensure you can recover from a complete Keeper cluster failure.

ClickHouse Keeper stores critical metadata for your entire replicated setup: replica registrations, replication log pointers, block deduplication checksums, and mutation state. If this data is lost, your replicated tables enter an inconsistent state that can require significant manual recovery work. Backing up Keeper snapshots protects against this scenario and makes disaster recovery much faster.

## What to Back Up

Keeper persists data in two locations:

```text
/var/lib/clickhouse-keeper/snapshots/   -- Point-in-time state files
/var/lib/clickhouse-keeper/log/         -- Raft log segments
```

A backup of the latest snapshot plus all subsequent log files is sufficient to restore Keeper to its exact state at the time the backup was taken.

## Understanding Snapshot Files

Keeper creates a new snapshot every `snapshot_distance` log entries. Snapshot files are named by the Raft log index at which they were taken:

```bash
ls -lh /var/lib/clickhouse-keeper/snapshots/
# -rw-r--r-- 1 clickhouse clickhouse  45M Mar 31 06:00 snapshot_1000000.bin.zstd
# -rw-r--r-- 1 clickhouse clickhouse  52M Mar 31 12:00 snapshot_2000000.bin.zstd
# -rw-r--r-- 1 clickhouse clickhouse  58M Mar 31 18:00 snapshot_3000000.bin.zstd
```

The newest snapshot is the most complete. To restore to the current state you need the newest snapshot plus all log segments that came after it.

## Method 1: Simple File Copy

The simplest backup strategy copies the snapshot and log files directly. This is safe to run while Keeper is running - the files are immutable once written:

```bash
#!/bin/bash
# /usr/local/bin/backup-keeper.sh

BACKUP_DIR="/backup/clickhouse-keeper"
KEEPER_SNAPSHOTS="/var/lib/clickhouse-keeper/snapshots"
KEEPER_LOG="/var/lib/clickhouse-keeper/log"
DATE=$(date +%Y%m%d-%H%M%S)
DEST="${BACKUP_DIR}/${DATE}"

mkdir -p "$DEST/snapshots" "$DEST/log"

# Copy snapshot files (immutable, safe to copy live)
cp -p "${KEEPER_SNAPSHOTS}/"*.bin.zstd "${DEST}/snapshots/" 2>/dev/null || true
cp -p "${KEEPER_SNAPSHOTS}/"*.bin "${DEST}/snapshots/" 2>/dev/null || true

# Copy all log segments (older segments are immutable; current one is being written)
# Copying a partially-written segment is safe - it is replayed from the last
# valid entry during recovery
cp -p "${KEEPER_LOG}/"*.bin.zstd "${DEST}/log/" 2>/dev/null || true
cp -p "${KEEPER_LOG}/"*.bin "${DEST}/log/" 2>/dev/null || true

# Record size and verify
du -sh "$DEST"
echo "Backup completed: $DEST"

# Remove backups older than 7 days
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

Schedule with cron:

```bash
# Back up Keeper every 4 hours
0 */4 * * * clickhouse /usr/local/bin/backup-keeper.sh >> /var/log/keeper-backup.log 2>&1
```

## Method 2: Trigger a Snapshot Before Backup

For a cleaner backup, trigger a fresh snapshot before copying. This minimizes the amount of log you need to include:

```bash
#!/bin/bash

# Trigger a snapshot (csnp is the ClickHouse Keeper 4lw for scheduling a snapshot)
echo "csnp" | nc keeper1.internal 2181

# Wait for the snapshot to complete
sleep 5

# Find the newest snapshot
NEWEST_SNAPSHOT=$(ls -t /var/lib/clickhouse-keeper/snapshots/*.bin.zstd 2>/dev/null | head -1)
if [ -z "$NEWEST_SNAPSHOT" ]; then
    NEWEST_SNAPSHOT=$(ls -t /var/lib/clickhouse-keeper/snapshots/*.bin 2>/dev/null | head -1)
fi

echo "Latest snapshot: $NEWEST_SNAPSHOT"

# Copy just the newest snapshot to backup storage
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
cp "$NEWEST_SNAPSHOT" "/backup/clickhouse-keeper/snapshot_${BACKUP_DATE}.bin.zstd"

echo "Backup complete"
```

## Method 3: Remote Backup with rsync

For backups to a remote storage server:

```bash
#!/bin/bash
REMOTE_HOST="backup.internal"
REMOTE_PATH="/data/backups/clickhouse-keeper/$(hostname)"
LOCAL_PATH="/var/lib/clickhouse-keeper"

# rsync snapshots and logs to remote backup server
# --checksum avoids re-copying files that haven't changed
rsync -av --checksum \
    "${LOCAL_PATH}/snapshots/" \
    "${REMOTE_HOST}:${REMOTE_PATH}/snapshots/"

rsync -av --checksum \
    "${LOCAL_PATH}/log/" \
    "${REMOTE_HOST}:${REMOTE_PATH}/log/"

echo "Rsync backup completed at $(date)"
```

## Method 4: Backup Using clickhouse-keeper-client

```bash
# Connect to Keeper
clickhouse-keeper-client \
    --host keeper1.internal \
    --port 2181

# Inside the client, send the csnp four-letter word to schedule a snapshot
> flwc csnp
# Output: the last committed log index of the scheduled snapshot

# Then back up the file that was just created
```

## Restoring from Backup

To restore a Keeper cluster from backup:

```bash
# Step 1: Stop Keeper on all nodes
systemctl stop clickhouse-keeper

# Step 2: Remove corrupted or missing data
rm -rf /var/lib/clickhouse-keeper/snapshots/*
rm -rf /var/lib/clickhouse-keeper/log/*

# Step 3: Copy the backup files back
cp /backup/clickhouse-keeper/latest/snapshots/* \
    /var/lib/clickhouse-keeper/snapshots/

cp /backup/clickhouse-keeper/latest/log/* \
    /var/lib/clickhouse-keeper/log/

# Step 4: Fix ownership
chown -R clickhouse:clickhouse /var/lib/clickhouse-keeper/

# Step 5: Start Keeper (it will replay the log from the snapshot)
systemctl start clickhouse-keeper

# Step 6: Verify
echo "ruok" | nc keeper1.internal 2181
echo "stat" | nc keeper1.internal 2181 | grep Mode
```

## What Happens if Keeper Metadata is Lost

If Keeper loses all data (no backup available), ClickHouse replicated tables cannot reconnect to their ZooKeeper paths. You need to re-initialize the replication from scratch:

```sql
-- For each replicated table, on each node:
-- 1. Drop the table (keeps data on disk in detached form)
DETACH TABLE events;

-- 2. Remove ZooKeeper registration (already gone if Keeper was wiped)
-- 3. Re-create the table with the same DDL
-- ClickHouse will register a fresh ZooKeeper path and start syncing

CREATE TABLE events (...)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
) ...;

-- 4. Re-attach the data from the detached directory
ALTER TABLE events ATTACH PARTITION ALL;
```

This is why backing up Keeper snapshots matters: it avoids having to manually re-initialize dozens of tables after a complete Keeper failure.

## Verifying Backup Integrity

Before relying on a backup, test that it can restore:

```bash
#!/bin/bash
# Test restore to a temporary directory

BACKUP_DIR="/backup/clickhouse-keeper/latest"
TEST_DIR="/tmp/keeper-restore-test"

mkdir -p "${TEST_DIR}/snapshots" "${TEST_DIR}/log"

cp "${BACKUP_DIR}/snapshots/"* "${TEST_DIR}/snapshots/"
cp "${BACKUP_DIR}/log/"* "${TEST_DIR}/log/"

# Start a temporary Keeper on a different port to validate the backup
clickhouse-keeper \
    --config /dev/stdin \
    --daemon \
    << 'EOF'
<clickhouse>
    <keeper_server>
        <tcp_port>2182</tcp_port>
        <server_id>1</server_id>
        <log_storage_path>/tmp/keeper-restore-test/log</log_storage_path>
        <snapshot_storage_path>/tmp/keeper-restore-test/snapshots</snapshot_storage_path>
        <coordination_settings>
            <raft_logs_level>information</raft_logs_level>
        </coordination_settings>
        <raft_configuration>
            <server><id>1</id><hostname>127.0.0.1</hostname><port>9445</port></server>
        </raft_configuration>
    </keeper_server>
</clickhouse>
EOF

sleep 3

# Test the restored Keeper
echo "ruok" | nc 127.0.0.1 2182
echo "stat" | nc 127.0.0.1 2182

# Clean up
pkill -f "clickhouse-keeper.*9445" 2>/dev/null
rm -rf "$TEST_DIR"
```

Run this test monthly to confirm your backups are valid.
