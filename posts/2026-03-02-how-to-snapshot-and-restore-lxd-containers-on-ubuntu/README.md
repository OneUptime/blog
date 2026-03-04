# How to Snapshot and Restore LXD Containers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, Containers, Snapshots, Backups

Description: Learn how to create, manage, and restore LXD container snapshots on Ubuntu, including automated snapshot scheduling and using snapshots for container cloning.

---

Snapshots are one of the most practical features of LXD. Before installing a potentially system-breaking package, running a risky database migration, or testing a destructive script, you take a snapshot. If something goes wrong, you restore and you're back to the known-good state in seconds. With a ZFS or btrfs storage backend, snapshots are nearly instant and consume minimal additional disk space.

## How LXD Snapshots Work

LXD snapshots capture the complete state of a container at a point in time:
- Filesystem state (all files, permissions, ownership)
- Container configuration (devices, profiles, config keys)
- Optionally, running state (memory contents if stateful)

With ZFS or btrfs, snapshots use copy-on-write - only differences from the snapshot point are stored. A new snapshot of a container with 10GB of data might consume only a few megabytes if little has changed.

With the `dir` backend, snapshots are full copies (rsync-based), which are slower and use more disk.

## Creating a Snapshot

```bash
# Basic snapshot (container can be running or stopped)
lxc snapshot mycontainer

# LXD assigns an auto-generated name: snap0, snap1, snap2...
# View snapshots
lxc info mycontainer | grep -A20 "Snapshots"

# Snapshot with a descriptive name
lxc snapshot mycontainer before-nginx-install
lxc snapshot mycontainer pre-migration-2024-03
lxc snapshot mycontainer working-state

# Snapshot with an expiration time
lxc snapshot mycontainer temp-test --expiry 24H
# Automatically deleted after 24 hours
```

## Listing Snapshots

```bash
# View all snapshots for a container
lxc info mycontainer

# The Snapshots section shows:
# Snapshots:
#   +---------------------------+-----------------------+------------+----------+
#   | NAME                      | TAKEN AT              | EXPIRES AT | STATEFUL |
#   +---------------------------+-----------------------+------------+----------+
#   | before-nginx-install      | 2024/03/01 10:23 UTC  |            | NO       |
#   | pre-migration-2024-03     | 2024/03/01 14:15 UTC  |            | NO       |
#   | working-state             | 2024/03/02 09:00 UTC  |            | NO       |
#   +---------------------------+-----------------------+------------+----------+
```

## Stateful Snapshots (Memory Capture)

A stateful snapshot captures running memory contents in addition to the filesystem. When restored, the container resumes exactly where it left off - running processes continue:

```bash
# Take a stateful snapshot (container must be running)
lxc snapshot mycontainer running-checkpoint --stateful

# Note: stateful snapshots require CRIU and may not work with all workloads
# Check if CRIU is available
which criu
```

Stateful snapshots are larger and slower to create than stateless ones. Use them when you specifically need to capture process state.

## Restoring a Snapshot

```bash
# Restore to a named snapshot (container is stopped after restore)
lxc restore mycontainer before-nginx-install

# After restore, start the container
lxc start mycontainer

# Verify the state was restored
lxc exec mycontainer -- nginx -v  # should fail if snapshot was before nginx install
```

The restore replaces the current container state with the snapshot state. Any changes made after the snapshot are lost. The snapshot itself is preserved by default.

## Restoring to a New Container

Copy a snapshot to a new container without affecting the original:

```bash
# Create a new container from a snapshot
lxc copy mycontainer/working-state restored-container

# Start the new container
lxc start restored-container

# Both mycontainer and restored-container exist independently
lxc list
```

This is also useful for creating multiple identical containers:

```bash
# Create a golden container, configure it, snapshot it
lxc launch ubuntu:24.04 golden-image
lxc exec golden-image -- apt install -y nginx postgresql redis-server
lxc snapshot golden-image base-configured

# Spin up multiple containers from the snapshot
for i in {1..5}; do
  lxc copy golden-image/base-configured web-node-$i
  lxc start web-node-$i
done

lxc list
```

## Deleting Snapshots

```bash
# Delete a specific snapshot
lxc delete mycontainer/before-nginx-install

# Delete multiple snapshots
lxc delete mycontainer/snap0 mycontainer/snap1

# There is no "delete all snapshots" command - script it
for snap in $(lxc info mycontainer | grep '^\s\+snap' | awk '{print $1}'); do
  lxc delete "mycontainer/$snap"
done
```

## Automated Snapshot Scheduling

LXD can take snapshots on a schedule automatically:

```bash
# Schedule hourly snapshots
lxc config set mycontainer snapshots.schedule "0 * * * *"

# Daily at midnight
lxc config set mycontainer snapshots.schedule "0 0 * * *"

# Keep only the last 5 automatic snapshots
lxc config set mycontainer snapshots.schedule.stopped true  # snapshot even when stopped
lxc config set mycontainer snapshots.expiry 5d  # auto-delete snapshots older than 5 days

# View the schedule
lxc config get mycontainer snapshots.schedule
```

The cron format for `snapshots.schedule`:
- `0 * * * *` - every hour at minute 0
- `0 0 * * *` - daily at midnight
- `0 0 * * 0` - weekly on Sunday at midnight

## Setting Default Snapshot Retention

Apply retention policies across all containers via a profile or the server default:

```bash
# Set default snapshot expiry (all new snapshots expire after 7 days)
lxc config set core.snapshots_expiry 7d

# Check current server defaults
lxc config show | grep snapshot
```

## Using Snapshots for Pre-Maintenance Backup

A practical workflow before system maintenance:

```bash
#!/bin/bash
# pre-maintenance-snapshot.sh

CONTAINER="production-app"
TIMESTAMP=$(date +%Y%m%d-%H%M)
SNAP_NAME="pre-maint-${TIMESTAMP}"

echo "Stopping container gracefully..."
lxc stop "$CONTAINER" --timeout 30

echo "Taking snapshot: $SNAP_NAME"
lxc snapshot "$CONTAINER" "$SNAP_NAME"

echo "Starting container..."
lxc start "$CONTAINER"

echo "Snapshot complete: $CONTAINER/$SNAP_NAME"
echo "To restore: lxc restore $CONTAINER $SNAP_NAME"
```

## Exporting Snapshots

For offsite backups, export container snapshots to a tarball:

```bash
# Export entire container including snapshots
lxc export mycontainer /tmp/mycontainer-backup.tar.gz

# This includes:
# - Current filesystem state
# - All snapshots
# - Container configuration

# Export to a specific backup location
lxc export mycontainer /mnt/backups/mycontainer-$(date +%Y%m%d).tar.gz

# Import later on the same or different LXD instance
lxc import /tmp/mycontainer-backup.tar.gz
lxc start mycontainer
```

## Snapshot Space Usage

Monitor snapshot disk consumption:

```bash
# For ZFS pools, check snapshot space usage
sudo zfs list -t snapshot -r lxdpool/containers/mycontainer

# Output shows REFER (active data) and USED (space unique to snapshot):
# NAME                                      USED  AVAIL  REFER
# lxdpool/containers/mycontainer@snap0      256K  43.2G  1.85G
# lxdpool/containers/mycontainer@working-state  12.4M  43.2G  2.01G
```

Small `USED` values confirm ZFS copy-on-write is working correctly - snapshots are sharing unchanged blocks with the live container.

## Recovering When No Snapshot Exists

If you need to restore a container from an LXD export but have no snapshot:

```bash
# Last resort: copy the running container as a backup before risky operations
lxc copy mycontainer mycontainer-backup
lxc start mycontainer-backup  # optional, verify it works

# Run risky operation on original
# ...

# If something went wrong:
lxc stop mycontainer
lxc delete mycontainer
lxc move mycontainer-backup mycontainer
lxc start mycontainer
```

Snapshots are cheap with ZFS or btrfs - use them liberally. The best practice is to take a snapshot before any significant change and only delete it once you've confirmed the change worked correctly and has been stable for a few days.
