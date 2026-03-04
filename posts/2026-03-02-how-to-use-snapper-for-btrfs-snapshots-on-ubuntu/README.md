# How to Use Snapper for Btrfs Snapshots on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Btrfs, Snapshots, Storage, Backups

Description: Set up Snapper on Ubuntu with a Btrfs filesystem to automatically take snapshots before package updates and system changes, enabling quick rollback when things go wrong.

---

Snapper is a snapshot management tool originally developed by SUSE that works with Btrfs and LVM thin provisioning. Combined with Btrfs, it enables filesystem-level snapshots that can be taken instantly without copying data. This makes it practical to snapshot your system before every package upgrade, giving you a reliable rollback path when an update breaks something.

## How Btrfs Snapshots Work

Btrfs uses copy-on-write (COW) semantics. When you create a snapshot, Btrfs does not copy any data - it just creates a new subvolume that shares all the same data blocks as the original. As the original subvolume changes (files modified, packages installed), new blocks are allocated only for the changed data. The snapshot retains the original blocks.

This makes snapshots:
- **Instant**: Taking a snapshot takes milliseconds regardless of filesystem size
- **Space-efficient**: Only changed blocks consume additional space
- **Read/write**: You can mount and boot from snapshots

## Setting Up Btrfs on Ubuntu

Ubuntu supports Btrfs, but it is not the default filesystem. If you are installing Ubuntu fresh and want snapshot capability, select "Advanced features" in the installer and choose Btrfs as the filesystem type with recommended subvolume layout.

For an existing installation, you would need to migrate to Btrfs, which is beyond the scope of this guide. Check if your root filesystem is already Btrfs:

```bash
# Check current filesystem types
df -T /

# Or check with lsblk
lsblk -f

# If Btrfs, you'll see something like:
# /dev/sda2  btrfs  ...  /
```

### Recommended Btrfs Subvolume Layout

A clean Btrfs layout for Ubuntu uses separate subvolumes:

```text
@       -> mounted at /
@home   -> mounted at /home
@var    -> mounted at /var (optional, for containers or heavy package use)
```

Snapshots are stored in a dedicated subvolume so they are not included in other snapshots:

```bash
# Check current subvolume layout
sudo btrfs subvolume list /

# Check mount options in fstab
cat /etc/fstab | grep btrfs
```

## Installing Snapper

```bash
sudo apt update
sudo apt install -y snapper snapper-gui btrfs-progs

# Verify installation
snapper --version
```

## Creating a Snapper Configuration

Snapper uses configurations to define what to snapshot and how many snapshots to keep:

```bash
# Create a configuration for the root filesystem
sudo snapper -c root create-config /

# For the home directory (separate subvolume)
sudo snapper -c home create-config /home

# List existing configurations
sudo snapper list-configs
```

If you get an error like "the config's subvolume is not snapper compatible", check the subvolume layout:

```bash
# The root subvolume must be named '@' or mounted with correct options
# Check current subvolumes
sudo btrfs subvolume list /

# Snapper creates a .snapshots subvolume
ls -la /.snapshots
```

## Viewing and Creating Snapshots

```bash
# List current snapshots
sudo snapper -c root list

# Create a manual snapshot with a description
sudo snapper -c root create --description "Before nginx upgrade"

# Create a pre/post pair (common for package operations)
sudo snapper -c root create --type pre --description "Before major update"
sudo apt upgrade -y
sudo snapper -c root create --type post --description "After major update"

# View the snapshots created
sudo snapper -c root list
```

The snapshot list shows:

```text
Type   | # | Pre # | Date                     | User | Used Space | Cleanup | Description
-------+---+-------+--------------------------+------+------------+---------+-------------------
pre    | 1 |       | Sun 2026-03-01 14:00:00   | root |  16.00 KiB |         | Before major update
post   | 2 | 1     | Sun 2026-03-01 14:05:00   | root |  45.00 MiB |         | After major update
```

## Automating Snapshots with apt

The most valuable feature is automatic snapshots before package operations. Install the apt plugin:

```bash
sudo apt install -y snapper-dbg

# Or for the apt integration specifically
sudo apt install -y btrfs-apt-snapshot
```

For manual integration, create wrapper scripts:

```bash
# Create apt pre-hook
sudo nano /etc/apt/apt.conf.d/80snapper
```

```text
DPkg::Pre-Invoke {"snapper -c root create --type pre --cleanup-algorithm number --description 'apt pre-invoke'";};
DPkg::Post-Invoke {"snapper -c root create --type post --cleanup-algorithm number --description 'apt post-invoke'";};
```

Now every apt operation that modifies packages automatically creates before/after snapshots.

Test it:

```bash
# Install something minor to trigger the hooks
sudo apt install -y tree

# Check that snapshots were created
sudo snapper -c root list | tail -5
```

## Comparing Snapshots

Snapper can show you exactly what changed between two snapshots:

```bash
# Compare two snapshots (list changed files)
sudo snapper -c root diff 1 2

# Show the actual diff content
sudo snapper -c root sdiff 1 2

# Show status summary (similar to git status)
sudo snapper -c root status 1..2
```

Output shows:

```text
c..... /etc/nginx/nginx.conf
+..... /etc/nginx/sites-available/newsite
-..... /etc/nginx/sites-available/oldsite
```

Where `c` = changed, `+` = added, `-` = deleted.

## Rolling Back to a Snapshot

If an update or configuration change broke your system, roll back:

```bash
# View available snapshots
sudo snapper -c root list

# Rollback to snapshot number 5
sudo snapper -c root undochange 5..0

# The "0" means "current state"
# "5..0" means "undo changes from snapshot 5 to current"
```

For a complete system rollback (including booting from the snapshot), the process involves the bootloader:

```bash
# Mount the snapshot temporarily
sudo mkdir -p /mnt/snapshot5
sudo mount -o subvol=@/.snapshots/5/snapshot /dev/sda2 /mnt/snapshot5

# Examine the state
ls /mnt/snapshot5/etc/

# For a full rollback, you would boot from the snapshot subvolume
# This typically requires editing GRUB to change the rootflags subvol parameter
```

## Configuring Snapshot Retention

Snapper can automatically clean up old snapshots to prevent disk fill-up:

```bash
sudo nano /etc/snapper/configs/root
```

```bash
# Snapshot cleanup settings

# Timeline cleanup: automatically create hourly/daily/weekly/monthly snapshots
TIMELINE_CREATE="yes"
TIMELINE_CLEANUP="yes"

# Retention policy
TIMELINE_LIMIT_HOURLY="24"     # Keep 24 hourly snapshots
TIMELINE_LIMIT_DAILY="7"       # Keep 7 daily snapshots
TIMELINE_LIMIT_WEEKLY="4"      # Keep 4 weekly snapshots
TIMELINE_LIMIT_MONTHLY="6"     # Keep 6 monthly snapshots
TIMELINE_LIMIT_YEARLY="2"      # Keep 2 yearly snapshots

# Number cleanup: keep N pre/post snapshot pairs
NUMBER_CLEANUP="yes"
NUMBER_LIMIT="50"               # Keep at most 50 numbered snapshots
NUMBER_LIMIT_IMPORTANT="10"     # Keep at most 10 "important" snapshots

# Allow non-root users to list/access their own snapshots
ALLOW_USERS=""
ALLOW_GROUPS=""

# Sync snapshots to a remote machine (optional)
# SYNC_ACL="yes"
```

Enable the timeline service:

```bash
sudo systemctl enable snapper-timeline.timer
sudo systemctl start snapper-timeline.timer

# Enable the cleanup service
sudo systemctl enable snapper-cleanup.timer
sudo systemctl start snapper-cleanup.timer

# Check timer status
sudo systemctl list-timers | grep snapper
```

## Checking Disk Space Used by Snapshots

Snapshots consume disk space proportional to how much the filesystem has changed since each snapshot was taken:

```bash
# View space used by each snapshot
sudo snapper -c root list -a

# Check overall Btrfs disk usage
sudo btrfs filesystem df /

# More detailed space breakdown
sudo btrfs filesystem usage /

# Check unshared data (what would be freed by deleting a snapshot)
sudo btrfs subvolume show /.snapshots/10/snapshot | grep "Exclusive referenced"
```

## Deleting Snapshots

```bash
# Delete a single snapshot
sudo snapper -c root delete 10

# Delete a range of snapshots
sudo snapper -c root delete 10-20

# Delete all snapshots of a specific type
sudo snapper -c root delete --type pre

# Run manual cleanup according to the configured retention policy
sudo snapper -c root cleanup number
sudo snapper -c root cleanup timeline
```

## Booting from a Snapshot (Recovery)

If a system update makes the system unbootable, you can boot from a snapshot via GRUB:

```bash
# At the GRUB menu, select "Advanced options for Ubuntu"
# Then "Ubuntu, with Linux X.X.X (recovery mode)"
# OR manually edit the boot entry (press 'e' at GRUB menu)
# Change the 'rootflags=subvol=@' to 'rootflags=subvol=@/.snapshots/5/snapshot'
```

After booting from the snapshot, you can either continue using the snapshot as the running system or restore it back to the main @ subvolume:

```bash
# From a live system booted from snapshot, restore it
sudo btrfs subvolume delete /@
sudo btrfs subvolume snapshot /.snapshots/5/snapshot /@

# Reboot into the restored system
sudo reboot
```

Snapper with Btrfs transforms system maintenance from a nerve-wracking operation into a routine activity. Knowing you can roll back any package change in seconds makes it much easier to keep systems patched and up to date.
