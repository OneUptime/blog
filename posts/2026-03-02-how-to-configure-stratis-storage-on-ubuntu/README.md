# How to Configure Stratis Storage on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, Stratis, Linux, System Administration

Description: Learn how to install and configure Stratis, a local storage management solution for Ubuntu, to create pools, filesystems, and manage snapshots with ease.

---

Stratis is a local storage management solution developed by Red Hat that simplifies working with block devices, LVM, and XFS. It wraps the complexity of volume management into a clean CLI and daemon, making it straightforward to create storage pools, provision filesystems on top of them, take snapshots, and add capacity without deep LVM knowledge. While it originated in the Red Hat ecosystem, Stratis works on Ubuntu too.

## What Stratis Provides

Before getting into setup, it helps to understand the mental model:

- **Pool** - A collection of block devices (like a RAID group or LVM volume group). The pool is where capacity comes from.
- **Filesystem** - A thin-provisioned XFS filesystem created from a pool. Multiple filesystems can share pool capacity.
- **Snapshot** - A point-in-time copy of a filesystem, also created from pool space.

Stratis uses device-mapper and XFS under the hood, so its filesystems are compatible with standard Linux tools.

## Installing Stratis on Ubuntu

Stratis is available in Ubuntu's package repositories starting from Ubuntu 20.04.

```bash
# Update package lists
sudo apt-get update

# Install stratisd (the daemon) and stratis-cli (the command-line tool)
sudo apt-get install -y stratisd stratis-cli

# Start and enable the stratisd daemon
sudo systemctl enable --now stratisd

# Verify the daemon is running
sudo systemctl status stratisd
```

Check the version to confirm installation:

```bash
# Check stratis CLI and daemon versions
stratis --version
```

## Preparing Block Devices

Stratis requires block devices that are not in use by other storage subsystems. For this guide, assume you have two unused disks: `/dev/sdb` and `/dev/sdc`.

**Important:** Stratis will destroy all existing data on block devices added to a pool. Verify the devices before proceeding.

```bash
# List available block devices and their current usage
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT,TYPE

# Verify a device has no existing filesystem or partition table
sudo wipefs /dev/sdb
sudo wipefs /dev/sdc
```

If devices have existing data, wipe them:

```bash
# Wipe all signatures from devices (DESTRUCTIVE - data will be lost)
sudo wipefs -a /dev/sdb
sudo wipefs -a /dev/sdc
```

## Creating a Storage Pool

A pool requires at least one block device. Stratis recommends devices of at least 1 GB.

```bash
# Create a pool named 'data-pool' with one device
sudo stratis pool create data-pool /dev/sdb

# Verify the pool was created
sudo stratis pool list
```

Output shows the pool name, total physical size, used space, and state.

### Adding More Devices to an Existing Pool

You can expand a pool by adding more block devices at any time:

```bash
# Add a second device to the existing pool (expands capacity)
sudo stratis pool add-data data-pool /dev/sdc

# Check updated pool capacity
sudo stratis pool list
```

## Creating Filesystems

Filesystems are thin-provisioned from pool space. You specify a name but not a size - Stratis manages space allocation dynamically.

```bash
# Create a filesystem named 'home' from the pool
sudo stratis filesystem create data-pool home

# Create another filesystem named 'projects'
sudo stratis filesystem create data-pool projects

# List all filesystems
sudo stratis filesystem list
```

Each filesystem gets a `/dev/stratis/<pool-name>/<filesystem-name>` device path that you mount like any other block device.

## Mounting Stratis Filesystems

```bash
# Create mount points
sudo mkdir -p /mnt/home
sudo mkdir -p /mnt/projects

# Mount the filesystems
sudo mount /dev/stratis/data-pool/home /mnt/home
sudo mount /dev/stratis/data-pool/projects /mnt/projects

# Verify mounts
df -h /mnt/home /mnt/projects
```

### Persistent Mounts via /etc/fstab

For mounts that survive reboots, add entries to `/etc/fstab`. Stratis filesystems need the `x-systemd.requires=stratisd.service` option to ensure the daemon starts before mounting.

```bash
# Get the UUID of the Stratis filesystem device
sudo blkid /dev/stratis/data-pool/home
```

Add to `/etc/fstab`:

```text
# /etc/fstab entry for Stratis filesystem
UUID=<uuid-from-blkid>  /mnt/home  xfs  defaults,x-systemd.requires=stratisd.service  0  0
UUID=<uuid-from-blkid>  /mnt/projects  xfs  defaults,x-systemd.requires=stratisd.service  0  0
```

Test the fstab entry:

```bash
# Test mount from fstab without rebooting
sudo mount -a

# Verify
df -h /mnt/home
```

## Working with Snapshots

Snapshots are one of Stratis's most useful features. They create a point-in-time copy of a filesystem for backup or testing purposes.

```bash
# Create a snapshot of the 'home' filesystem
sudo stratis filesystem snapshot data-pool home home-snapshot-2026-03-02

# List filesystems (snapshots appear in the same list)
sudo stratis filesystem list
```

Snapshots are themselves filesystems - you can mount them, read data from them, or roll back by copying data.

```bash
# Mount the snapshot to access its contents
sudo mkdir -p /mnt/home-snapshot
sudo mount /dev/stratis/data-pool/home-snapshot-2026-03-02 /mnt/home-snapshot

# Access files as they were at snapshot time
ls /mnt/home-snapshot

# Unmount when done
sudo umount /mnt/home-snapshot
```

### Automating Snapshots

A simple script to create daily snapshots:

```bash
#!/bin/bash
# /usr/local/bin/stratis-snapshot.sh
# Creates a daily snapshot of Stratis filesystems

POOL="data-pool"
FILESYSTEMS=("home" "projects")
DATE=$(date +%Y-%m-%d)
KEEP_DAYS=7

for FS in "${FILESYSTEMS[@]}"; do
    SNAP_NAME="${FS}-snapshot-${DATE}"

    # Create snapshot
    stratis filesystem snapshot "$POOL" "$FS" "$SNAP_NAME"
    echo "Created snapshot: $SNAP_NAME"

    # Remove snapshots older than KEEP_DAYS
    stratis filesystem list "$POOL" | grep "${FS}-snapshot-" | while read -r line; do
        SNAP=$(echo "$line" | awk '{print $1}')
        SNAP_DATE=$(echo "$SNAP" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
        if [[ -n "$SNAP_DATE" ]]; then
            AGE=$(( ( $(date +%s) - $(date -d "$SNAP_DATE" +%s) ) / 86400 ))
            if [[ $AGE -gt $KEEP_DAYS ]]; then
                stratis filesystem destroy "$POOL" "$SNAP"
                echo "Removed old snapshot: $SNAP"
            fi
        fi
    done
done
```

Add to crontab:

```bash
# Run snapshot script daily at 2 AM
sudo crontab -e
# Add:
# 0 2 * * * /usr/local/bin/stratis-snapshot.sh >> /var/log/stratis-snapshots.log 2>&1
```

## Monitoring Pool Usage

Stratis pools can run out of space if thin-provisioned filesystems consume more than the physical devices provide. Monitor usage regularly.

```bash
# Check pool usage
sudo stratis pool list

# Detailed filesystem usage
sudo stratis filesystem list

# Also check from the OS perspective
df -h /mnt/home /mnt/projects
```

When a pool approaches capacity, add a device:

```bash
# Add capacity to prevent out-of-space errors
sudo stratis pool add-data data-pool /dev/sdd
```

## Destroying Filesystems and Pools

When you no longer need a filesystem or pool, destroy it cleanly:

```bash
# Unmount the filesystem first
sudo umount /mnt/home

# Destroy the filesystem
sudo stratis filesystem destroy data-pool home

# Destroy the entire pool (removes all filesystems first)
sudo stratis pool destroy data-pool
```

## Checking Stratis Events and Logs

If something behaves unexpectedly, check the systemd journal for stratisd:

```bash
# View stratisd logs
sudo journalctl -u stratisd -f

# View recent errors only
sudo journalctl -u stratisd -p err --since "1 hour ago"
```

Stratis brings a reasonable balance between LVM's power and ZFS-style pool management without the licensing concerns. For Ubuntu servers where you want thin provisioning and snapshots without a deep LVM learning curve, it's worth evaluating as part of your storage strategy.
