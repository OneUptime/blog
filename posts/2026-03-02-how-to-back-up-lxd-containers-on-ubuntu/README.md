# How to Back Up LXD Containers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, Container, Backup, Snapshot

Description: A complete guide to backing up LXD containers on Ubuntu using snapshots, exports, and automated backup strategies to protect containerized workloads.

---

LXD containers on Ubuntu need a backup strategy just like traditional VMs or bare-metal servers. LXD has built-in snapshot and export capabilities that make this straightforward, but there are several approaches depending on your recovery time objectives and available storage. This guide covers LXD's native snapshot mechanism, full container exports, and automated backup scripts.

## LXD Backup Approaches

There are three main approaches:

1. **LXD snapshots** - point-in-time copies stored in the same storage pool, fast to create, fast to restore, but vulnerable to pool failure
2. **Container export** - creates a portable image file that can be imported on any LXD host
3. **Storage volume snapshots/sync** - ZFS or Btrfs snapshots of the underlying storage can be replicated off-site

A comprehensive backup strategy uses all three at different frequencies.

## Creating Container Snapshots

Snapshots are the fastest way to capture container state:

```bash
# Create a snapshot of a running container
lxc snapshot mycontainer snap-$(date +%Y%m%d-%H%M%S)

# Create a snapshot with a descriptive name
lxc snapshot mycontainer before-nginx-update

# List snapshots for a container
lxc info mycontainer

# Create a snapshot including the container's memory state (stateful)
# This pauses the container momentarily to capture RAM
lxc snapshot --stateful mycontainer

# Snapshot all running containers at once
for container in $(lxc list --format csv --columns n); do
    echo "Snapshotting $container..."
    lxc snapshot "$container" "auto-$(date +%Y%m%d)"
done
```

## Restoring from Snapshots

```bash
# Restore a container to a specific snapshot
# This stops the container, restores, and starts it again
lxc restore mycontainer snap-20260302-120000

# Restore to snapshot without starting
lxc restore mycontainer snap-20260302-120000 --stateful

# Create a new container from a snapshot (non-destructive recovery)
lxc copy mycontainer/snap-20260302-120000 mycontainer-restored

# Start and test the restored copy before decommissioning the broken one
lxc start mycontainer-restored
lxc exec mycontainer-restored -- systemctl status
```

## Managing Snapshot Retention

Old snapshots consume storage space. Set expiry times and clean up manually:

```bash
# Set an expiry on a snapshot (it will auto-delete after 7 days)
lxc config set mycontainer/snap-20260302 expires_at "2026-03-09T00:00:00Z"

# Delete a specific snapshot
lxc delete mycontainer/old-snapshot

# Delete all snapshots older than 7 days (script approach)
#!/bin/bash
RETENTION_DAYS=7
CUTOFF=$(date -d "$RETENTION_DAYS days ago" +%s)

for container in $(lxc list --format csv --columns n); do
    lxc info "$container" | grep -A1 "Snapshots:" | grep "snap-" | while read snap_name rest; do
        # Extract date from snapshot name
        snap_date=$(echo "$snap_name" | grep -oP '\d{8}')
        if [ -n "$snap_date" ]; then
            snap_epoch=$(date -d "$snap_date" +%s 2>/dev/null || echo 0)
            if [ "$snap_epoch" -lt "$CUTOFF" ]; then
                echo "Deleting old snapshot: $container/$snap_name"
                lxc delete "$container/$snap_name"
            fi
        fi
    done
done
```

## Full Container Export

Exports create a self-contained image file that can be transferred to another host:

```bash
# Export a stopped container to a compressed tarball
lxc stop mycontainer
lxc export mycontainer /backups/mycontainer-$(date +%Y%m%d).tar.gz
lxc start mycontainer

# Export a running container (LXD handles the consistency)
lxc export --instance-only mycontainer /backups/mycontainer-$(date +%Y%m%d).tar.gz

# Export including all snapshots
lxc export mycontainer /backups/mycontainer-with-snaps-$(date +%Y%m%d).tar.gz

# Check the export was created
ls -lh /backups/mycontainer-*.tar.gz
```

The export file is a standard LXD image tarball. Import it on any LXD host:

```bash
# Import the image to the local image store
lxc image import /backups/mycontainer-20260302.tar.gz --alias mycontainer-backup

# Create a new container from the imported image
lxc init mycontainer-backup mycontainer-restored

# Or import directly as a container
lxc import /backups/mycontainer-20260302.tar.gz
```

## Automated Backup Script

Create a comprehensive backup script:

```bash
#!/bin/bash
# /usr/local/bin/lxd-backup.sh

BACKUP_DIR="/backups/lxd"
RETENTION_DAYS=7
LOG="/var/log/lxd-backup.log"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"
}

log "Starting LXD backup"

# Get all container names
containers=$(lxc list --format csv --columns n,s | grep -v STOPPED | awk -F, '{print $1}')

for container in $containers; do
    log "Processing container: $container"

    # Take a snapshot first
    snap_name="auto-$TIMESTAMP"
    if lxc snapshot "$container" "$snap_name"; then
        log "Snapshot created: $container/$snap_name"
    else
        log "ERROR: Failed to snapshot $container"
        continue
    fi

    # Export the container to a backup file
    export_file="$BACKUP_DIR/${container}-${TIMESTAMP}.tar.gz"
    if lxc export "$container" "$export_file" --optimized-storage; then
        log "Exported: $export_file ($(du -sh "$export_file" | cut -f1))"
    else
        log "ERROR: Export failed for $container"
    fi

    # Clean up old snapshots (keep last 3)
    lxc info "$container" | grep "auto-" | sort | head -n -3 | awk '{print $1}' | while read old_snap; do
        log "Removing old snapshot: $container/$old_snap"
        lxc delete "$container/$old_snap"
    done
done

# Remove exports older than retention period
find "$BACKUP_DIR" -name "*.tar.gz" -mtime "+$RETENTION_DAYS" -exec rm -v {} \; | tee -a "$LOG"

log "LXD backup completed"
```

```bash
sudo chmod +x /usr/local/bin/lxd-backup.sh
```

## Backing Up with ZFS Snapshots

If your LXD storage pool uses ZFS, you get an additional level of backup capability through ZFS snapshots and replication:

```bash
# Check which ZFS pool LXD uses
lxc storage list
lxc storage info default

# Take a ZFS snapshot of the entire LXD pool
sudo zfs snapshot -r lxd-pool@$(date +%Y%m%d)

# List ZFS snapshots
sudo zfs list -t snapshot | grep lxd-pool

# Send a ZFS snapshot to a remote server for offsite backup
sudo zfs send lxd-pool@20260302 | \
    ssh backup@remote-server.com "zfs receive backup-pool/lxd-replica"

# Incremental send (after first full send)
sudo zfs send -i lxd-pool@20260301 lxd-pool@20260302 | \
    ssh backup@remote-server.com "zfs receive backup-pool/lxd-replica"
```

## Copying Containers Between LXD Hosts

For migration or recovery, copy a running container to another LXD host:

```bash
# First, set up trust between LXD instances
lxc remote add secondary-host https://secondary.example.com:8443

# Copy a container to the remote host
lxc copy mycontainer secondary-host:mycontainer

# Copy with live migration (container stays running during transfer)
lxc move --live mycontainer secondary-host:mycontainer

# Copy a snapshot to a new container on the remote
lxc copy mycontainer/snap-20260302 secondary-host:mycontainer-dr
```

## Scheduling Automated Backups

Set up a systemd timer to run backups nightly:

```bash
sudo nano /etc/systemd/system/lxd-backup.service
```

```ini
[Unit]
Description=LXD Container Backup
After=local-fs.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/lxd-backup.sh
StandardOutput=journal
StandardError=journal
```

```bash
sudo nano /etc/systemd/system/lxd-backup.timer
```

```ini
[Unit]
Description=Run LXD backup nightly

[Timer]
OnCalendar=02:30
RandomizedDelaySec=15min
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable lxd-backup.timer
sudo systemctl start lxd-backup.timer

# Monitor the timer
systemctl list-timers lxd-backup.timer
```

LXD snapshots are fast enough that you can run them hourly on production containers with minimal overhead, while daily exports provide the portability needed for offsite replication and DR scenarios.
