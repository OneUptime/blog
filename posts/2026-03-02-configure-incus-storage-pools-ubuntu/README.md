# How to Configure Incus Storage Pools on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Incus, Storage, Container, System Administration

Description: Configure and manage Incus storage pools on Ubuntu using different backends like Btrfs, ZFS, LVM, and Ceph to optimize container storage performance and flexibility.

---

Incus storage pools are the backing storage for container and VM disk images, volumes, and snapshots. Choosing and configuring the right storage backend significantly impacts container performance, snapshot efficiency, and disk space utilization. Incus supports multiple backends including directory, Btrfs, ZFS, LVM, and Ceph, each with different trade-offs.

## Storage Backend Comparison

| Backend | Copy-on-Write | Snapshots | Pool Size | Notes |
|---------|---------------|-----------|-----------|-------|
| dir | No | Slow (rsync) | OS filesystem | Simplest, least efficient |
| Btrfs | Yes | Fast | Loop file or partition | Good balance, no extra setup |
| ZFS | Yes | Fast | Loop file or partition | Best features, higher RAM usage |
| LVM | No | LVM snapshots | Block device | Good for raw performance |
| Ceph | Yes | Fast | Ceph cluster | Distributed, cluster use |

For single-server setups on Ubuntu, Btrfs or ZFS provide the best combination of features and performance. ZFS is preferred if your hardware has enough RAM (at least 1GB per 1TB of storage, ideally more).

## List Existing Storage Pools

```bash
# List storage pools
incus storage list

# Show detailed information about a pool
incus storage info default

# Show volumes in a pool
incus storage volume list default
```

## Create a Btrfs Storage Pool

Btrfs is the recommended backend for most use cases. It supports copy-on-write, fast snapshots, and does not require additional configuration on Ubuntu.

```bash
# Create a Btrfs pool using a loop file (for testing)
incus storage create btfs-pool btrfs

# Create a Btrfs pool on a specific block device
# This is more performant and appropriate for production
sudo parted /dev/sdb --script mklabel gpt mkpart primary btrfs 0% 100%
incus storage create btfs-pool btrfs source=/dev/sdb1

# Create a Btrfs pool with a specific size (loop file)
incus storage create btfs-pool btrfs size=100GiB
```

## Create a ZFS Storage Pool

ZFS requires more setup but offers better features including deduplication, data integrity checks, and compression.

```bash
# Install ZFS utilities first
sudo apt-get install -y zfsutils-linux

# Create a ZFS pool using a loop file
incus storage create zfs-pool zfs size=100GiB

# Create a ZFS pool on a dedicated block device
incus storage create zfs-pool zfs source=/dev/sdb

# Create with specific ZFS options
incus storage create zfs-pool zfs \
    source=/dev/sdb \
    zfs.pool_name=incus \
    volume.zfs.use_refquota=true \
    volume.block.filesystem=ext4
```

## Create an LVM Storage Pool

LVM provides raw block devices to containers, which is useful for I/O-intensive workloads:

```bash
# Create an LVM pool on a dedicated volume group
sudo pvcreate /dev/sdc
sudo vgcreate incus-vg /dev/sdc

incus storage create lvm-pool lvm \
    source=incus-vg \
    lvm.thinpool_name=IncusThinPool \
    volume.block.filesystem=ext4 \
    volume.size=20GiB
```

## Configure Storage Pool Properties

After creating a pool, configure its properties for performance and space management:

```bash
# Set the default volume size for new containers
incus storage set default volume.size 20GiB

# Enable compression (Btrfs and ZFS)
incus storage set btrfs-pool btrfs.mount_options "compress=zstd:3"

# For ZFS: enable compression
incus storage set zfs-pool volume.zfs.use_refquota true
incus storage set zfs-pool rsync.bwlimit 100MB/s

# Set volume block filesystem (for LVM and Ceph)
incus storage set lvm-pool volume.block.filesystem ext4

# Show current pool configuration
incus storage show default
```

## Manage Storage Volumes

Volumes are the actual storage units inside pools. Containers and VMs have their own volumes, and you can create custom volumes for shared data:

```bash
# List volumes in a pool
incus storage volume list default

# Create a custom volume (for shared data)
incus storage volume create default shared-data size=10GiB

# Attach the volume to a container
incus config device add my-container shared-data disk \
    pool=default \
    source=shared-data \
    path=/shared

# Verify the mount
incus exec my-container -- df -h /shared

# Detach the volume
incus config device remove my-container shared-data

# Delete the volume (only when not attached)
incus storage volume delete default shared-data
```

## Copy and Move Volumes Between Pools

```bash
# Copy a volume to a different pool (creates an independent copy)
incus storage volume copy default/shared-data zfs-pool/shared-data-copy

# Move a container's storage to a different pool (offline)
incus stop my-container
incus move my-container --storage zfs-pool
incus start my-container
```

## Create and Manage Snapshots

Copy-on-write backends (Btrfs, ZFS, Ceph) create snapshots nearly instantly:

```bash
# Create a volume snapshot
incus storage volume snapshot create default shared-data backup-snapshot

# List snapshots
incus storage volume snapshot list default shared-data

# Restore from a snapshot
incus storage volume snapshot restore default shared-data backup-snapshot

# Delete a snapshot
incus storage volume snapshot delete default shared-data backup-snapshot

# Configure automatic snapshots
incus storage volume set default shared-data \
    snapshots.schedule "0 2 * * *" \
    snapshots.expiry 7d
```

## Monitor Storage Usage

```bash
# Overall storage pool usage
incus storage info default

# Per-volume usage
incus storage volume list default -c n,U

# Detailed stats
incus storage volume show default my-container

# Check for disk space across all pools
for pool in $(incus storage list --format csv -c n); do
    echo "=== Pool: $pool ==="
    incus storage info "$pool" | grep -E "Used|Free|Total"
done
```

## Migrate Data Between Backends

When you need to move from one backend to another (for example, migrating from dir to ZFS after growing your setup):

```bash
# Create the new pool
incus storage create new-zfs-pool zfs source=/dev/sdb

# Move each container to the new pool one at a time
# List containers to migrate
incus list --format csv -c n,L | grep "node-name"

# Migrate a container (requires downtime)
incus stop my-container
incus move my-container my-container --storage new-zfs-pool
incus start my-container

# Verify the container is on the new pool
incus info my-container | grep "Storage pool"

# After migrating all containers, check the old pool is empty
incus storage volume list old-pool
```

## ZFS-Specific Tuning

ZFS benefits from tuning the ARC (Adaptive Replacement Cache):

```bash
# Check current ZFS ARC usage
arc_summary 2>/dev/null || cat /proc/spl/kstat/zfs/arcstats | head -20

# Limit ZFS ARC size to prevent it consuming all RAM
# Set to 4GB maximum (value in bytes)
echo "options zfs zfs_arc_max=4294967296" | sudo tee /etc/modprobe.d/zfs.conf

# Apply without reboot
echo 4294967296 | sudo tee /sys/module/zfs/parameters/zfs_arc_max

# Enable ZFS compression globally
sudo zfs set compression=zstd incus/containers

# Check pool health
sudo zpool status
```

## Btrfs-Specific Maintenance

```bash
# Check Btrfs pool usage (including snapshot storage)
# The pool is a loop file under /var/lib/incus/storage-pools/
POOL_PATH=$(incus storage show btrfs-pool | grep source | awk '{print $2}')
sudo btrfs filesystem usage "$POOL_PATH"

# Run balance to reclaim space after deleting snapshots
sudo btrfs balance start -dusage=50 "$POOL_PATH"

# Scrub to check data integrity
sudo btrfs scrub start "$POOL_PATH"
sudo btrfs scrub status "$POOL_PATH"
```

## Set a Default Storage Pool

When creating containers without specifying a pool, Incus uses the default:

```bash
# Check which pool is the default in the default profile
incus profile show default | grep -A 5 "root:"

# Edit the default profile to change the pool
incus profile edit default
```

```yaml
# In the editor, update the root device
devices:
  root:
    path: /
    pool: zfs-pool  # Change this to your preferred pool
    type: disk
```

Picking the right storage backend at the start saves significant migration work later. For most production Ubuntu systems running Incus, ZFS provides the most complete feature set, while Btrfs is an excellent choice for systems where ZFS's RAM requirements are a concern.
