# How to Use Btrfs Snapshots for System Recovery on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Btrfs, Snapshot, System Recovery, Linux

Description: Create, manage, and restore from Btrfs snapshots on Ubuntu for system recovery, covering manual snapshots, automated tools like Snapper, and boot-time rollback procedures.

---

Btrfs snapshots let you capture the state of a subvolume at a specific moment. They're cheap to create (no copying), space-efficient (CoW means they only store differences), and can serve as recovery points for everything from accidentally deleted files to botched system upgrades.

## How Btrfs Snapshots Work

Btrfs snapshots use copy-on-write. When you snapshot a subvolume:

1. A new subvolume is created that shares all existing blocks with the origin
2. No data is copied - the snapshot immediately uses near-zero additional space
3. As either the origin or the snapshot changes data, new blocks are written while original blocks remain shared

The snapshot always represents the data as it was at creation time. You can read from it, restore individual files, or roll back the entire subvolume to the snapshot state.

## Creating Snapshots

### Read-only snapshot (recommended for backups)

```bash
# Snapshot the root subvolume '@' to a snapshots directory
sudo btrfs subvolume snapshot -r / /.snapshots/root_$(date +%Y%m%d_%H%M%S)
```

The `-r` flag creates a read-only snapshot. This is preferred for backups because:
- It cannot be accidentally modified
- It can be sent with `btrfs send` for replication
- It provides a true immutable point-in-time record

### Read-write snapshot (for testing or cloning)

```bash
# Snapshot without -r creates a writable copy
sudo btrfs subvolume snapshot /data/web /data/web_snapshot
```

A writable snapshot can be mounted and worked with as a full filesystem copy.

### Snapshot the home subvolume

```bash
sudo mkdir -p /mnt/btrfs_root/.snapshots
sudo btrfs subvolume snapshot -r /home /mnt/btrfs_root/.snapshots/home_$(date +%Y%m%d)
```

Note: to create snapshots of subvolumes, you need to be working at the top-level Btrfs volume or have the parent subvolume accessible.

## Organizing Snapshots

A common layout separates snapshots from the live data:

```text
Btrfs volume
  @               (live root, mounted at /)
  @home           (live home, mounted at /home)
  @snapshots      (snapshot storage)
    root_20260302_020000    (snapshot of @)
    root_20260301_020000    (snapshot of @)
    home_20260302_020000    (snapshot of @home)
```

```bash
# Mount the top-level Btrfs volume
sudo mount -o subvolid=5 /dev/sda1 /mnt/btrfs_root

# Create snapshots directory as a subvolume
sudo btrfs subvolume create /mnt/btrfs_root/@snapshots

# Take snapshots into the dedicated location
sudo btrfs subvolume snapshot -r /mnt/btrfs_root/@ /mnt/btrfs_root/@snapshots/root_$(date +%Y%m%d)
```

## Listing Snapshots

```bash
# List all subvolumes (includes snapshots)
sudo btrfs subvolume list /

# Filter for snapshots only (read-only subvolumes)
sudo btrfs subvolume list -r /
```

```text
ID 259 gen 1456 top level 5 path @snapshots/root_20260302_020000
ID 260 gen 1457 top level 5 path @snapshots/root_20260301_020000
ID 261 gen 1458 top level 5 path @snapshots/home_20260302_020000
```

## Browsing Snapshot Contents

Snapshots are accessible as directories. You can browse them and copy files:

```bash
# Access the snapshot directly
ls /mnt/btrfs_root/@snapshots/root_20260302_020000/

# Copy a specific file from the snapshot
sudo cp /mnt/btrfs_root/@snapshots/root_20260302_020000/etc/nginx/nginx.conf /etc/nginx/nginx.conf.restored
```

## Rolling Back a Subvolume

Rolling back replaces the current subvolume state with the snapshot state. There are two approaches:

### Method 1: Rename/replace approach (recommended)

This is the safest method because it doesn't destroy the current state until you're sure the rollback works:

```bash
# Mount top-level Btrfs
sudo mount -o subvolid=5 /dev/sda1 /mnt/btrfs_root

# Step 1: Move current subvolume aside (keep it as a backup)
sudo mv /mnt/btrfs_root/@ /mnt/btrfs_root/@_backup_$(date +%Y%m%d)

# Step 2: Create a writable snapshot of the target recovery snapshot
sudo btrfs subvolume snapshot \
  /mnt/btrfs_root/@snapshots/root_20260302_020000 \
  /mnt/btrfs_root/@

# Reboot - the system will boot from the restored @
sudo reboot
```

After verifying the rollback:

```bash
# Delete the backup of the previous state
sudo btrfs subvolume delete /mnt/btrfs_root/@_backup_20260302
```

### Method 2: For non-root subvolumes (simpler)

For data subvolumes that aren't the running root:

```bash
# Example: roll back /data/web to yesterday's snapshot
sudo umount /var/www

# Rename current to backup
sudo mv /mnt/btrfs_root/@web /mnt/btrfs_root/@web_before_rollback

# Create writable snapshot from read-only recovery snapshot
sudo btrfs subvolume snapshot \
  /mnt/btrfs_root/@snapshots/web_20260301_020000 \
  /mnt/btrfs_root/@web

# Remount
sudo mount -o subvol=@web /dev/sdb /var/www
```

## Automated Snapshot Management with Snapper

`snapper` is the standard tool for automated Btrfs snapshot management on Linux. It handles creation, cleanup, and diff visualization.

### Install snapper

```bash
sudo apt install snapper
```

### Create a snapper configuration for root

```bash
# Create a configuration for / (Btrfs with @ layout)
sudo snapper -c root create-config /
```

Snapper creates a config at `/etc/snapper/configs/root`.

### Edit the configuration

```bash
sudo nano /etc/snapper/configs/root
```

```bash
# Snapshot retention
TIMELINE_CREATE="yes"
TIMELINE_CLEANUP="yes"

# Keep limits
TIMELINE_LIMIT_HOURLY="24"
TIMELINE_LIMIT_DAILY="7"
TIMELINE_LIMIT_WEEKLY="4"
TIMELINE_LIMIT_MONTHLY="6"
TIMELINE_LIMIT_YEARLY="0"

# Space limits
FREE_LIMIT="0.2"    # Keep at least 20% free
NUMBER_LIMIT="50"   # Maximum number of snapshots
NUMBER_LIMIT_IMPORTANT="10"
```

### Enable automatic snapshots

```bash
sudo systemctl enable --now snapper-timeline.timer
sudo systemctl enable --now snapper-cleanup.timer
```

### Manual snapper operations

```bash
# Create a manual snapshot with description
sudo snapper -c root create --description "before nginx upgrade" --cleanup-algorithm=number

# List all snapshots
sudo snapper -c root list
```

```text
 # | Type   | Pre # | Date                     | User | Cleanup | Description
---+--------+-------+--------------------------+------+---------+------------------
0  | single |       |                          | root |         | current
1  | single |       | Mon Mar  2 02:00:00 2026 | root | timeline | timeline
2  | pre    |       | Mon Mar  2 10:15:23 2026 | root | number  | before nginx upgrade
3  | post   |     2 | Mon Mar  2 10:18:44 2026 | root | number  |
```

### Compare snapshots

```bash
# Show what files changed between two snapshots
sudo snapper -c root diff 1 3
```

```text
+..... /etc/nginx/nginx.conf
c..... /etc/nginx/sites-enabled/default
-c.... /var/log/nginx/access.log
```

### Undo changes (rollback to snapshot)

```bash
# Restore to snapshot number 1
sudo snapper -c root undochange 1..3
```

### Rollback the system to a previous snapshot

For full system rollback using snapper on Ubuntu with the `@` layout:

```bash
# Roll back to snapshot 5
sudo snapper -c root rollback 5
sudo reboot
```

## Pre/Post Snapshots Around Package Installs

Snapper can automatically create before/after snapshots around package operations:

```bash
# Manually create pre/post pair
sudo snapper -c root create --type pre --description "apt upgrade"
sudo apt upgrade -y
sudo snapper -c root create --type post --pre-num 4 --description "apt upgrade"

# Now you can see exactly what changed
sudo snapper -c root diff 4..5
```

For automatic pre/post snapshots with apt, install `snapper-zypp-plugin` equivalent for Debian/Ubuntu - or use a wrapper script:

```bash
# /etc/apt/apt.conf.d/80snapper
DPkg::Pre-Install-Pkgs {
    "snapper -c root create --type pre --cleanup-algorithm number --print-number --description 'apt'";
};
DPkg::Post-Invoke {
    "snapper -c root create --type post --cleanup-algorithm number --pre-number $(cat /run/snapper_pre_num) --description 'apt'";
};
```

## Deleting Snapshots

```bash
# Delete a specific snapshot
sudo btrfs subvolume delete /mnt/btrfs_root/@snapshots/root_20260101

# Delete with snapper
sudo snapper -c root delete 5

# Delete a range of snapshots
sudo snapper -c root delete 5-10
```

## Checking Snapshot Space Usage

```bash
# See how much space snapshots are using
sudo btrfs filesystem usage /

# List subvolumes with size info
sudo btrfs subvolume list -s /
```

Over time, many snapshots accumulate. Set up automatic cleanup via snapper's timeline to prevent the filesystem from filling with old snapshots.

## Boot-Time Rollback

If a system update breaks boot, roll back from GRUB:

1. At GRUB, select "Advanced options for Ubuntu"
2. Look for options that reference specific Btrfs snapshots (requires grub-btrfs package)
3. Boot into the snapshot environment
4. Make the rollback permanent using snapper or the manual rename approach

Install `grub-btrfs` for this functionality:

```bash
sudo apt install grub-btrfs
sudo update-grub
```

This adds GRUB menu entries for each Btrfs snapshot, enabling boot-time rollback without needing a live USB.

Btrfs snapshots combined with snapper provide a practical, automated recovery system that makes Ubuntu systems on Btrfs significantly easier to maintain and recover from failures.
