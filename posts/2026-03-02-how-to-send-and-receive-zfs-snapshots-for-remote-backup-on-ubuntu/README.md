# How to Send and Receive ZFS Snapshots for Remote Backup on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ZFS, Backup, Replication, SSH

Description: Use zfs send and zfs receive to replicate ZFS snapshots to remote systems for off-site backup, covering full and incremental send operations on Ubuntu.

---

ZFS's `send` and `receive` commands let you stream snapshot data from one ZFS pool to another - whether that's a local backup drive or a remote server across the network. The combination of ZFS snapshots and `zfs send | zfs receive` forms one of the most reliable backup strategies available on Linux.

## How zfs send/receive Works

`zfs send` serializes a snapshot (or an incremental difference between two snapshots) into a byte stream. `zfs receive` accepts that stream and applies it to a target dataset. The target is an exact replica of the source snapshot.

Because ZFS understands its own data format, send/receive is more efficient than generic file-copy tools:
- Only changed blocks are transferred in incremental sends
- Compressed data transfers in compressed form
- All properties, permissions, and timestamps are preserved

## Prerequisites

On both source and destination:
- ZFS installed: `sudo apt install zfsutils-linux`
- SSH configured for key-based auth if replicating remotely
- The destination pool must already exist

## Full Send: Initial Replication

The first transfer sends all data in a snapshot.

### Local backup

```bash
# Source: tank/web on this machine
# Destination: backup_pool/web on the same machine (different drive)

# 1. Create a snapshot to send
sudo zfs snapshot tank/web@2026-03-02

# 2. Send to local destination
sudo zfs send tank/web@2026-03-02 | sudo zfs receive -F backup_pool/web
```

The `-F` flag on receive forces the update, discarding any existing content in the destination dataset.

### Remote backup via SSH

```bash
# Send to a remote server
sudo zfs send tank/web@2026-03-02 | \
  ssh backup-server.example.com "sudo zfs receive -F backup_pool/web"
```

For this to work without sudo password prompts, configure sudoers on the remote to allow passwordless `zfs receive`, or run as root via SSH.

### Send with progress monitoring

```bash
# mbuffer buffers the stream and shows progress
sudo apt install mbuffer

sudo zfs send tank/web@2026-03-02 | \
  mbuffer -s 128k -m 1G | \
  ssh backup-server.example.com "sudo zfs receive backup_pool/web"
```

mbuffer shows:
```text
 8.50 GiB  [  45.2 MiB/s] [  45.2 MiB/s]  in   3:14
```

## Incremental Send: Efficient Updates

After the initial full send, use incremental sends to transfer only changed data. Incremental sends are orders of magnitude smaller than full sends.

```bash
# Scenario: source has @2026-03-01 and @2026-03-02 snapshots
# Destination already has @2026-03-01

# Send only the differences between the two snapshots
sudo zfs send -i tank/web@2026-03-01 tank/web@2026-03-02 | \
  ssh backup-server.example.com "sudo zfs receive backup_pool/web"
```

The `-i` flag takes an incremental send from the first snapshot to the second. Only blocks that changed between the two snapshots are transferred.

### Verify the destination has the base snapshot

If you're not sure what snapshots exist on the destination:

```bash
ssh backup-server.example.com "sudo zfs list -t snapshot backup_pool/web"
```

## Recursive Send/Receive

To replicate an entire dataset hierarchy with one command:

```bash
# Source has:
# tank/databases
# tank/databases/postgresql
# tank/databases/mysql

# Create recursive snapshot
sudo zfs snapshot -r tank/databases@2026-03-02

# Send recursively
sudo zfs send -R tank/databases@2026-03-02 | \
  ssh backup-server.example.com "sudo zfs receive -F backup_pool/databases"
```

The `-R` flag replicates all child datasets and their snapshots.

### Incremental recursive send

```bash
# After -R full send, send incremental updates
sudo zfs snapshot -r tank/databases@2026-03-03

sudo zfs send -R -i tank/databases@2026-03-02 tank/databases@2026-03-03 | \
  ssh backup-server.example.com "sudo zfs receive -F backup_pool/databases"
```

## Automated Replication Script

Here's a practical script for daily incremental replication:

```bash
sudo nano /usr/local/bin/zfs-replicate.sh
```

```bash
#!/bin/bash
# ZFS incremental replication to remote backup server

set -euo pipefail

SOURCE_POOL="tank"
SOURCE_DATASET="databases"
DEST_HOST="backup-server.example.com"
DEST_POOL="backup_pool"
DEST_DATASET="$SOURCE_DATASET"
DATE=$(date +%Y%m%d_%H%M%S)
NEW_SNAP="${SOURCE_POOL}/${SOURCE_DATASET}@daily_${DATE}"
KEEP_SNAPS=7  # Keep 7 daily snapshots on source

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Find the most recent snapshot on both source and destination
LATEST_SOURCE=$(zfs list -t snapshot -H -o name -s creation \
    | grep "^${SOURCE_POOL}/${SOURCE_DATASET}@" \
    | tail -1)

LATEST_DEST=$(ssh "$DEST_HOST" \
    "sudo zfs list -t snapshot -H -o name -s creation 2>/dev/null \
    | grep '^${DEST_POOL}/${DEST_DATASET}@' | tail -1" 2>/dev/null || echo "")

# Create new snapshot
log "Creating snapshot: $NEW_SNAP"
sudo zfs snapshot -r "$NEW_SNAP"

if [ -z "$LATEST_DEST" ]; then
    # No snapshots on destination - full send
    log "No existing destination snapshot. Performing full send..."
    sudo zfs send -R "$NEW_SNAP" | \
        mbuffer -s 128k -m 1G 2>/dev/null | \
        ssh "$DEST_HOST" "sudo zfs receive -F ${DEST_POOL}/${DEST_DATASET}"
else
    # Incremental send from latest common snapshot
    LATEST_DEST_SNAP="${SOURCE_POOL}/${SOURCE_DATASET}@$(echo $LATEST_DEST | cut -d@ -f2)"
    log "Performing incremental send from $LATEST_DEST_SNAP to $NEW_SNAP"
    sudo zfs send -R -i "$LATEST_DEST_SNAP" "$NEW_SNAP" | \
        mbuffer -s 128k -m 1G 2>/dev/null | \
        ssh "$DEST_HOST" "sudo zfs receive -F ${DEST_POOL}/${DEST_DATASET}"
fi

# Prune old snapshots on source
log "Pruning old snapshots (keeping $KEEP_SNAPS)..."
OLD_SNAPS=$(zfs list -t snapshot -H -o name -s creation \
    | grep "^${SOURCE_POOL}/${SOURCE_DATASET}@daily_" \
    | head -n -"$KEEP_SNAPS")

for snap in $OLD_SNAPS; do
    log "Deleting old snapshot: $snap"
    sudo zfs destroy "$snap"
done

log "Replication complete."
```

```bash
sudo chmod +x /usr/local/bin/zfs-replicate.sh

# Schedule daily replication
echo "30 1 * * * root /usr/local/bin/zfs-replicate.sh >> /var/log/zfs-replicate.log 2>&1" \
  | sudo tee /etc/cron.d/zfs-replication
```

## Using syncoid for Automated Replication

`syncoid` (part of the `sanoid` package) is a well-maintained tool that handles incremental replication logic automatically:

```bash
sudo apt install sanoid
```

```bash
# One-time setup: replicate tank/web to backup server
sudo syncoid tank/web backup-server.example.com:backup_pool/web

# Incremental updates
sudo syncoid --no-sync-snap tank/web backup-server.example.com:backup_pool/web
```

syncoid handles the common snapshot, incrementals, and recursion automatically.

Add to cron:

```bash
echo "0 2 * * * root syncoid -r tank backup-server.example.com:backup_pool >> /var/log/syncoid.log 2>&1" \
  | sudo tee /etc/cron.d/syncoid
```

## Receive Options

### Receive without making changes (dry run)

```bash
# -n flag tests the receive without actually writing
sudo zfs send tank/web@2026-03-02 | sudo zfs receive -n backup_pool/web
```

### Receive to a different dataset name

```bash
sudo zfs send tank/web@2026-03-02 | sudo zfs receive backup_pool/web_copy
```

### Override properties on receive

```bash
# Receive but set a different mount point
sudo zfs send tank/web@2026-03-02 | \
  sudo zfs receive -o mountpoint=/backup/web backup_pool/web
```

### Use receive -u (unmounted)

```bash
# Receive without mounting (useful for backup destinations)
sudo zfs receive -u backup_pool/web
```

## Restoring from Remote Backup

When you need to restore data from the backup server:

```bash
# Send from backup back to source (or a new server)
ssh backup-server.example.com \
  "sudo zfs send backup_pool/web@daily_20260302_020000" | \
  sudo zfs receive -F tank/web_restored
```

Or for a full pool disaster recovery on a new server:

```bash
# On the new server with a fresh ZFS pool
ssh backup-server.example.com \
  "sudo zfs send -R backup_pool@latest_snapshot" | \
  sudo zfs receive -F new_pool
```

## Bandwidth and Performance Considerations

### Compress the stream

```bash
# Use gzip compression for the network transfer
sudo zfs send tank/web@2026-03-02 | \
  gzip | \
  ssh backup-server.example.com "gunzip | sudo zfs receive backup_pool/web"
```

Note: If your ZFS datasets already have compression enabled, the send stream is already compressed. Adding gzip on top may not help much.

### Limit bandwidth during business hours

```bash
# Use pv to rate limit to 10MB/s
sudo zfs send tank/web@2026-03-02 | \
  pv -L 10m | \
  ssh backup-server.example.com "sudo zfs receive backup_pool/web"
```

ZFS send/receive is the backbone of a solid ZFS backup strategy. Combined with automated snapshots and off-site replication, it provides point-in-time recovery capability with efficient incremental updates.
