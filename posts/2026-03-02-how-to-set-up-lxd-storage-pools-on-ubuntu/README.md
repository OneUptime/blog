# How to Set Up LXD Storage Pools on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, Storage, ZFS, Containers

Description: Configure LXD storage pools on Ubuntu using ZFS, btrfs, LVM, and directory backends. Covers creating pools, setting quotas, and managing container disk usage.

---

LXD's storage pools are where container and VM disk images live. Choosing the right backend and configuring pools correctly affects performance, snapshot speed, and disk efficiency. This guide covers the main storage backends available in LXD and how to set them up.

## Storage Backends Comparison

| Backend | Copy-on-Write | Snapshots | Deduplication | Best For |
|---------|-------------|-----------|---------------|----------|
| ZFS | Yes | Instant | Yes | Production, most features |
| btrfs | Yes | Instant | No | Good alternative to ZFS |
| LVM | No | Fast (LVM snapshots) | No | Block storage environments |
| dir | No | Slow (rsync) | No | Simplicity, testing |
| Ceph | Yes | Instant | Yes | Multi-host clustering |

ZFS is the recommended backend for most setups on Ubuntu.

## Setting Up a ZFS Storage Pool

### Using a Loop File (Testing/Development)

For development where you don't have a dedicated disk:

```bash
# Create a ZFS pool using a loop file
lxc storage create default zfs size=50GiB

# LXD creates a file at /var/snap/multipass/... and sets up ZFS automatically
lxc storage show default
```

### Using a Dedicated Disk (Production)

For production, use a dedicated disk or partition:

```bash
# Check available disks
lsblk

# Identify the disk to use (e.g., /dev/sdb - must be empty)
# Create the storage pool using the disk
lxc storage create production-pool zfs source=/dev/sdb

# Verify
lxc storage show production-pool
```

### Using an Existing ZFS Pool

If you already have a ZFS pool (e.g., `tank`):

```bash
# Use an existing ZFS pool, LXD will use a dataset within it
lxc storage create lxd-pool zfs source=tank/lxd

# This creates a dataset at tank/lxd for LXD to use
zfs list tank/lxd
```

## Setting Up a btrfs Storage Pool

```bash
# Using a loop file
lxc storage create btrfs-pool btrfs size=50GiB

# Using a dedicated disk
lxc storage create btrfs-pool btrfs source=/dev/sdb

# Using an existing btrfs filesystem
# Mount the btrfs filesystem first
mount /dev/sdb /mnt/btrfs-data
lxc storage create btrfs-pool btrfs source=/mnt/btrfs-data
```

## Setting Up an LVM Storage Pool

```bash
# Using a dedicated disk (creates an LVM volume group)
lxc storage create lvm-pool lvm source=/dev/sdb

# Using an existing volume group
lxc storage create lvm-pool lvm source=existing-vg

# View LVM pool details
lxc storage show lvm-pool
```

LVM pools create a logical volume per container, which allows for efficient snapshots using LVM's snapshot mechanism.

## Setting Up a Directory (dir) Storage Pool

The simplest backend - just stores files in directories. No copy-on-write or instant snapshots:

```bash
# Create a dir pool using a specific path
lxc storage create dir-pool dir source=/mnt/storage

# Or let LXD choose the path
lxc storage create dir-pool dir
```

## Listing and Inspecting Pools

```bash
# List all storage pools
lxc storage list

# Detailed pool info
lxc storage info default

# Output shows used/total space:
# info:
#   description: ""
#   driver: zfs
#   name: default
#   space used: 8.76GiB
#   total space: 49.81GiB

# Show full configuration
lxc storage show default
```

## Assigning Containers to Specific Pools

By default, containers use the pool from the `default` profile. To use a different pool:

```bash
# Override root disk device at launch time
lxc launch ubuntu:24.04 mycontainer \
  -s production-pool

# Or manually specify the root device
lxc init ubuntu:24.04 mycontainer
lxc config device override mycontainer root pool=production-pool
lxc start mycontainer
```

## Setting Disk Quotas

Limit how much disk space individual containers can use:

```bash
# Set a 20GB quota on a container's root disk
lxc config device set mycontainer root size=20GiB

# Check current configuration
lxc config device show mycontainer

# Verify inside the container
lxc exec mycontainer -- df -h /
```

For ZFS and btrfs backends, this uses native quotas for efficient enforcement. For dir and LVM, enforcement is less granular.

## Volume-Level Operations

Storage volumes in LXD are the individual disk images for containers and VMs:

```bash
# List all volumes in a pool
lxc storage volume list default

# Output shows:
# TYPE        NAME         CONTENT TYPE  USED BY
# container   mycontainer  filesystem    1
# container   testbox      filesystem    0
# image       ubuntu-24.04 block         2

# Get detailed info on a volume
lxc storage volume show default container/mycontainer

# Resize a container's root volume
lxc storage volume set default container/mycontainer size 50GiB
```

## Creating and Managing Custom Volumes

Create volumes for shared data or additional disk attachments:

```bash
# Create a custom volume
lxc storage volume create default mydata

# Attach it to a container
lxc config device add mycontainer data-vol disk \
  pool=default \
  source=mydata \
  path=/mnt/data

# The volume persists even if the container is deleted
lxc delete mycontainer

# Attach the same volume to a new container
lxc config device add newcontainer data-vol disk \
  pool=default \
  source=mydata \
  path=/mnt/data
```

## Snapshots with ZFS

ZFS makes container snapshots nearly instant because it only records the diff:

```bash
# Take a snapshot
lxc snapshot mycontainer clean-state

# List snapshots
lxc info mycontainer | grep -A10 Snapshots

# Restore to snapshot
lxc restore mycontainer clean-state

# Copy a snapshot to a new container
lxc copy mycontainer/clean-state newcontainer
```

Because ZFS snapshots are copy-on-write, they consume very little disk space initially and only grow as the container diverges from the snapshot.

## Monitoring Pool Usage

```bash
# Check pool space usage
lxc storage info default

# For ZFS pools, get more detail
sudo zpool status
sudo zfs list -r $(lxc storage show default | grep zfs.pool_name | awk '{print $2}')

# Check per-volume usage
lxc storage volume list default --format csv | while IFS=',' read type name rest; do
  echo -n "$type/$name: "
  lxc storage volume info default "$type/$name" 2>/dev/null | grep "space used" || echo "N/A"
done
```

## Moving Volumes Between Pools

```bash
# Copy a container to a different pool
lxc copy mycontainer newcontainer --storage new-pool

# Move (copy then delete original)
lxc move mycontainer --storage new-pool

# This is how you migrate containers when changing storage backends
```

## Deleting Storage Pools

```bash
# A pool must have no volumes before deletion
lxc storage volume list default

# Delete all containers using this pool first
# Then delete the pool
lxc storage delete old-pool
```

## Optimizing ZFS Performance

For ZFS-backed LXD pools, a few tuning options improve performance:

```bash
# Get the ZFS pool name used by LXD
ZFSPOOL=$(lxc storage show default | grep zfs.pool_name | awk '{print $NF}')

# Disable access time tracking (reduces write amplification)
sudo zfs set atime=off $ZFSPOOL

# Enable compression (reduces disk usage, often improves speed)
sudo zfs set compression=lz4 $ZFSPOOL

# Tune ARC max size (ZFS in-memory cache, default is 50% of RAM)
echo "options zfs zfs_arc_max=$((4 * 1024 * 1024 * 1024))" | \
  sudo tee /etc/modprobe.d/zfs.conf
# Sets ARC max to 4GB
```

Proper storage pool configuration is foundational to LXD performance. ZFS with a dedicated disk, compressed volumes, and appropriate quotas gives you a production-ready storage layer that supports instant snapshots and efficient space usage across many containers.
