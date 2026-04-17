# How to Back Up and Restore ClickHouse Keeper Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, Backup, Restore, Snapshot, Disaster Recovery

Description: Learn how to back up and restore ClickHouse Keeper data using snapshots and Raft logs, covering both planned maintenance and disaster recovery scenarios.

---

ClickHouse Keeper stores replication metadata, table paths, and distributed DDL task history. Losing this data without a backup can corrupt your replicated cluster. This guide covers backup and restoration of Keeper state.

## What Keeper Stores

Keeper persists two types of data:

- **Snapshots**: point-in-time captures of the entire ZooKeeper-compatible tree
- **Raft logs**: sequential log of all mutations since the last snapshot

Together, a snapshot plus subsequent logs allow full state reconstruction.

## Snapshot Storage Location

Defined in `keeper_config.xml`:

```xml
<snapshot_storage_path>/var/lib/clickhouse-keeper/coordination/snapshots</snapshot_storage_path>
<log_storage_path>/var/lib/clickhouse-keeper/coordination/log</log_storage_path>
```

## Manual Snapshot Creation

Trigger a snapshot on-demand via the four-letter command:

```bash
echo csnp | nc localhost 9181
```

Verify the new snapshot file appeared:

```bash
ls -lth /var/lib/clickhouse-keeper/coordination/snapshots/
```

## Automated Backup with rsync

Schedule regular backups of both snapshot and log directories:

```bash
#!/bin/bash
BACKUP_DIR=/mnt/backup/keeper/$(date +%Y-%m-%d)
mkdir -p "$BACKUP_DIR"

rsync -av /var/lib/clickhouse-keeper/coordination/snapshots/ "$BACKUP_DIR/snapshots/"
rsync -av /var/lib/clickhouse-keeper/coordination/log/ "$BACKUP_DIR/log/"

echo "Keeper backup completed: $BACKUP_DIR"
```

## Configure Snapshot Frequency

```xml
<coordination_settings>
  <snapshot_distance>100000</snapshot_distance>
  <snapshots_to_keep>5</snapshots_to_keep>
</coordination_settings>
```

`snapshot_distance` is the number of log entries between automatic snapshots. Lower values mean more frequent snapshots and less log replay during recovery, at the cost of slightly higher I/O.

## Restore Procedure

To restore a Keeper node from backup:

```bash
# 1. Stop Keeper
sudo systemctl stop clickhouse-keeper

# 2. Clear existing state
sudo rm -rf /var/lib/clickhouse-keeper/coordination/snapshots/*
sudo rm -rf /var/lib/clickhouse-keeper/coordination/log/*

# 3. Copy backup files
sudo rsync -av /mnt/backup/keeper/2026-03-30/snapshots/ \
  /var/lib/clickhouse-keeper/coordination/snapshots/
sudo rsync -av /mnt/backup/keeper/2026-03-30/log/ \
  /var/lib/clickhouse-keeper/coordination/log/

# 4. Fix ownership
sudo chown -R clickhouse-keeper:clickhouse-keeper \
  /var/lib/clickhouse-keeper/coordination/

# 5. Start Keeper
sudo systemctl start clickhouse-keeper

# 6. Verify
echo ruok | nc localhost 9181
```

## Restore from Snapshot Only (Without Logs)

If you only have a snapshot (no logs), Keeper will replay from the snapshot and discard any changes made after the snapshot was taken. This is safe for disaster recovery but may result in some metadata loss.

## Summary

Back up ClickHouse Keeper by regularly copying the snapshot and log directories to durable storage. Trigger on-demand snapshots before maintenance windows. To restore, stop Keeper, replace the coordination directories with backup data, and restart. Test restoration quarterly to ensure your backups are usable.
