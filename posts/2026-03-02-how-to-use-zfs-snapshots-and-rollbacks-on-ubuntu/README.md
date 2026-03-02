# How to Use ZFS Snapshots and Rollbacks on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ZFS, Snapshots, Backup, Recovery

Description: Create, manage, and roll back ZFS snapshots on Ubuntu for instant backups and recovery points, covering automated snapshot schedules and browsing snapshot contents.

---

ZFS snapshots are one of the technology's most compelling features. Unlike LVM snapshots which use copy-on-write with a separate storage pool, ZFS snapshots are instantaneous, space-efficient, and organized within the dataset itself. They're genuinely practical for daily backups, pre-upgrade recovery points, and data archaeology (finding files as they existed at a past point in time).

## How ZFS Snapshots Work

When you take a ZFS snapshot, ZFS records the current state of the dataset's data blocks. No data is copied. The snapshot simply holds references to the existing blocks.

As new data is written to the dataset, ZFS writes to new blocks and updates the dataset's block pointers. The snapshot's block pointers remain unchanged, still pointing to the original data.

This means:
- Snapshot creation is instant (microseconds)
- Snapshots initially consume zero additional space
- Space is used only as blocks in the live dataset change
- Multiple snapshots are efficient - they share unchanged blocks

## Creating Snapshots

### Single dataset snapshot

```bash
# Format: zfs snapshot <dataset>@<snapshot-name>
sudo zfs snapshot datapool/web@before-upgrade

# With a timestamp name (common pattern)
sudo zfs snapshot datapool/web@$(date +%Y%m%d_%H%M%S)
```

### Recursive snapshot (all child datasets)

```bash
# Snapshot datapool/databases and all children simultaneously
sudo zfs snapshot -r datapool/databases@daily_backup

# This creates:
# datapool/databases@daily_backup
# datapool/databases/postgresql@daily_backup
# datapool/databases/mysql@daily_backup
```

The `-r` flag creates snapshots atomically across all child datasets - they all get the same timestamp, giving you a consistent point-in-time backup.

## Listing Snapshots

```bash
# List all snapshots
sudo zfs list -t snapshot

# List snapshots for a specific dataset
sudo zfs list -t snapshot datapool/web

# List snapshots with usage information
sudo zfs list -t snapshot -o name,used,refer,creation
```

```
NAME                            USED  REFER  CREATION
datapool/web@before-upgrade     234M  12.4G  2026-03-01 10:23
datapool/web@20260302_020000   1.12G  13.6G  2026-03-02 02:00
datapool/web@20260303_020000    892M  14.1G  2026-03-03 02:00
```

The `USED` column shows how much space is used exclusively by this snapshot (data changed since the snapshot was taken). `REFER` shows the size of the dataset at the time of the snapshot.

## Accessing Snapshot Contents

ZFS mounts snapshots in a hidden `.zfs/snapshot` directory within each dataset's mount point:

```bash
# Navigate to the snapshot directory
ls /var/www/.zfs/snapshot/

# You'll see directories for each snapshot
ls /var/www/.zfs/snapshot/before-upgrade/

# Browse and copy files from the snapshot
cp /var/www/.zfs/snapshot/before-upgrade/index.html /var/www/index.html
```

The `.zfs` directory is hidden from normal `ls` output but accessible. You can recover individual files without any special commands.

### Mount a snapshot explicitly

```bash
# Mount a snapshot at a specific location for easier access
sudo mount -t zfs datapool/web@before-upgrade /mnt/recovery
ls /mnt/recovery/

sudo umount /mnt/recovery
```

## Rolling Back to a Snapshot

A rollback reverts the dataset to the exact state at snapshot creation. All changes made after the snapshot are discarded.

### Basic rollback

```bash
# Rollback web dataset to the before-upgrade snapshot
sudo zfs rollback datapool/web@before-upgrade
```

If there are newer snapshots than the one you're rolling back to, ZFS will refuse and show an error. You must either delete the newer snapshots or use the `-r` flag.

### Force rollback (deletes newer snapshots)

```bash
# -r deletes all snapshots newer than the target snapshot
sudo zfs rollback -r datapool/web@before-upgrade
```

```
will destroy the following snapshots:
  datapool/web@20260302_020000
  datapool/web@20260303_020000

continue? [y/n]: y
```

After confirmation, the rollback proceeds and all newer snapshots are removed.

### Rollback with confirmation of results

```bash
# After rollback, verify the dataset state
sudo zfs list datapool/web
ls /var/www/

# Check which snapshot is now the most recent
sudo zfs list -t snapshot datapool/web
```

## Deleting Snapshots

```bash
# Delete a specific snapshot
sudo zfs destroy datapool/web@before-upgrade

# Delete all snapshots matching a pattern
sudo zfs destroy datapool/web@daily_backup

# Delete a range of snapshots (first%last syntax)
sudo zfs destroy "datapool/web@20260101_020000%20260201_020000"
```

### Delete recursively

```bash
# Delete the recursive snapshot across all child datasets
sudo zfs destroy -r datapool/databases@old_backup
```

## Automating Snapshots

### Simple cron-based snapshot schedule

```bash
sudo nano /etc/cron.d/zfs-snapshots
```

```
# ZFS Snapshot Schedule
# Take hourly snapshots, keep 24
0 * * * * root /usr/local/bin/zfs-snapshot.sh hourly 24 datapool/web datapool/databases

# Take daily snapshots, keep 30
5 0 * * * root /usr/local/bin/zfs-snapshot.sh daily 30 datapool/web datapool/databases

# Take weekly snapshots, keep 8
10 0 * * 0 root /usr/local/bin/zfs-snapshot.sh weekly 8 datapool
```

### Snapshot management script

```bash
sudo nano /usr/local/bin/zfs-snapshot.sh
```

```bash
#!/bin/bash
# ZFS snapshot creation and rotation
# Usage: zfs-snapshot.sh <label> <keep-count> <dataset> [<dataset>...]

set -euo pipefail

LABEL="$1"
KEEP="$2"
shift 2
DATASETS=("$@")
DATE=$(date +%Y%m%d_%H%M%S)

for dataset in "${DATASETS[@]}"; do
    SNAP_NAME="${dataset}@${LABEL}_${DATE}"

    # Create the snapshot
    zfs snapshot "$SNAP_NAME"
    echo "Created: $SNAP_NAME"

    # Delete old snapshots beyond the retention count
    # List snapshots with this label, sorted by creation time
    OLD_SNAPS=$(zfs list -t snapshot -o name -s creation -H \
        | grep "^${dataset}@${LABEL}_" \
        | head -n -"$KEEP")

    for old_snap in $OLD_SNAPS; do
        zfs destroy "$old_snap"
        echo "Deleted: $old_snap"
    done
done
```

```bash
sudo chmod +x /usr/local/bin/zfs-snapshot.sh
```

### Using sanoid for automated snapshot management

`sanoid` is a widely used ZFS snapshot management tool:

```bash
sudo apt install sanoid
```

Configure it:

```bash
sudo nano /etc/sanoid/sanoid.conf
```

```ini
[datapool/web]
    use_template = production

[datapool/databases]
    use_template = production
    recursive = yes

[template_production]
    frequently = 0
    hourly = 24
    daily = 30
    monthly = 3
    yearly = 0
    autosnap = yes
    autoprune = yes
```

Enable the timer:

```bash
sudo systemctl enable --now sanoid.timer
```

## Snapshot Space Usage Analysis

Understanding what's consuming space in your snapshots:

```bash
# How much space would be freed by deleting a snapshot
sudo zfs destroy -nv datapool/web@old_snapshot
```

The `-n` flag shows what would be deleted without actually doing it, and `-v` shows space that would be freed.

```bash
# View snapshot size breakdown
sudo zfs list -t all -o name,used,refer,creation -r datapool/web
```

When a snapshot's `USED` column is large, it means lots of data has changed since that snapshot was taken.

## Clone a Dataset from a Snapshot

Clones create a writable copy of a snapshot. Initially they share all blocks with the snapshot:

```bash
# Create a clone of the web dataset at a specific snapshot
sudo zfs clone datapool/web@before-upgrade datapool/web_clone

# Mount point defaults to /datapool/web_clone
ls /datapool/web_clone/

# Promote the clone (make it independent of the original)
# This reverses the parent/child relationship
sudo zfs promote datapool/web_clone
```

Clones are useful for spinning up test environments from production snapshots without copying data.

## Snapshot Best Practices

**Name snapshots meaningfully**: Use labels like `before-upgrade-nginx-2.0`, `daily_2026-03-02`, or `pre-migration` rather than random numbers.

**Keep a tiered retention schedule**: Hourly snapshots for 24 hours, daily for 30 days, weekly for 8 weeks.

**Monitor snapshot space usage**: Run `zfs list -t snapshot` weekly to catch datasets where snapshots are accumulating significant space.

**Test rollbacks in non-production first**: Know how rollback behaves before you need it under pressure.

**Use recursive snapshots for related datasets**: If your web app uses `datapool/web` and `datapool/databases`, snapshot them recursively so you get a consistent point in time across both.

ZFS snapshots change how you think about backups. Instead of scheduled full backups, you have continuous recovery points with instant creation and granular restoration capability.
