# How to Set Up Docker with ZFS Storage Driver

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, ZFS, Storage Driver, DevOps, Linux, Containers

Description: A practical guide to configuring Docker to use the ZFS storage driver for better snapshot management and data integrity.

---

Docker supports multiple storage drivers to manage the filesystem layers that make up container images and writable container layers. ZFS is one of the more powerful options available. It brings copy-on-write semantics, built-in compression, data checksumming, and snapshot capabilities directly to your Docker storage layer.

This guide covers how to set up ZFS on your system, configure Docker to use the ZFS storage driver, and tune the setup for production workloads.

## Why Use ZFS with Docker?

ZFS was originally developed by Sun Microsystems and has been ported to Linux through the OpenZFS project. It combines a filesystem and volume manager into a single tool. When paired with Docker, ZFS offers several advantages:

- **Data integrity**: ZFS checksums all data and metadata, detecting and correcting silent corruption
- **Snapshots**: ZFS snapshots are instantaneous and space-efficient, which aligns well with Docker's layered approach
- **Compression**: Built-in transparent compression reduces disk usage without application changes
- **Copy-on-write**: ZFS clones share data blocks with their parent snapshots, making Docker image layers efficient
- **Quotas**: Per-dataset quotas let you limit how much space individual containers can consume

The Docker ZFS storage driver creates a new ZFS dataset for each image layer and writable container layer. This maps naturally to ZFS's architecture.

## Prerequisites

Before starting, make sure you have:

- A Linux system running Ubuntu 20.04+, Debian 11+, or a similar distribution
- A dedicated disk or partition for the ZFS pool (do not share it with your root filesystem)
- Root or sudo access
- Docker Engine installed (but stopped)

## Step 1: Install ZFS

On Ubuntu and Debian, ZFS is available through the standard package repositories.

Install the ZFS kernel module and utilities:

```bash
# Install ZFS packages on Ubuntu/Debian
sudo apt update
sudo apt install -y zfsutils-linux
```

On Fedora or CentOS, the process requires enabling a third-party repository:

```bash
# Install ZFS on Fedora/CentOS (requires the ZFS repo)
sudo dnf install -y https://zfsonlinux.org/fedora/zfs-release-2-4.fc$(rpm -E %fedora).noarch.rpm
sudo dnf install -y kernel-devel zfs
sudo modprobe zfs
```

Verify that ZFS is loaded:

```bash
# Confirm the ZFS kernel module is active
lsmod | grep zfs
```

You should see `zfs` listed along with its dependencies like `spl` and `zavl`.

## Step 2: Create a ZFS Pool

Docker needs a ZFS pool to store its datasets. Create a pool on a dedicated disk. In this example, we use `/dev/sdb`, but replace this with your actual device.

Create a new ZFS pool named "docker-pool":

```bash
# Create a ZFS pool on a dedicated disk
sudo zpool create -f docker-pool /dev/sdb
```

For production systems, you should consider using a mirror or RAID-Z configuration:

```bash
# Create a mirrored pool for redundancy (requires two disks)
sudo zpool create -f docker-pool mirror /dev/sdb /dev/sdc
```

Verify the pool was created successfully:

```bash
# Check pool status
sudo zpool status docker-pool

# Check available space
sudo zpool list docker-pool
```

## Step 3: Create a ZFS Dataset for Docker

Create a dedicated dataset within the pool for Docker's data:

```bash
# Create a dataset specifically for Docker
sudo zfs create -o mountpoint=/var/lib/docker docker-pool/docker
```

Enable compression on the dataset to save disk space. LZ4 compression is fast and provides good compression ratios:

```bash
# Enable LZ4 compression for better space efficiency
sudo zfs set compression=lz4 docker-pool/docker
```

You can verify the dataset properties:

```bash
# List all ZFS dataset properties
sudo zfs get all docker-pool/docker | head -20
```

## Step 4: Stop Docker and Clear Old Data

If Docker was previously using a different storage driver, you need to stop it and clear the old data.

```bash
# Stop Docker and containerd
sudo systemctl stop docker
sudo systemctl stop containerd

# Back up existing Docker data if needed
sudo cp -au /var/lib/docker /var/lib/docker.bak

# Remove old Docker data (the ZFS dataset is mounted at /var/lib/docker now)
# If the ZFS mount replaced the directory, this step may not be needed
```

## Step 5: Configure Docker to Use ZFS

Edit or create the Docker daemon configuration file to specify the ZFS storage driver:

```json
// /etc/docker/daemon.json
// This tells Docker to use ZFS for all image and container storage
{
  "storage-driver": "zfs"
}
```

Write the configuration:

```bash
# Write the Docker daemon configuration
sudo tee /etc/docker/daemon.json <<EOF
{
  "storage-driver": "zfs"
}
EOF
```

## Step 6: Start Docker and Verify

Start Docker and confirm it is using the ZFS storage driver:

```bash
# Start Docker with ZFS configuration
sudo systemctl start docker

# Check the storage driver in use
docker info | grep -i "storage driver"
```

The output should show:

```
 Storage Driver: zfs
```

You can also see ZFS-specific details:

```bash
# Display full Docker storage information
docker info | grep -A 10 "Storage Driver"
```

Run a test container to verify everything works:

```bash
# Pull and run a test container
docker run --rm hello-world
```

Check that Docker created ZFS datasets for the image layers:

```bash
# List all ZFS datasets under the Docker pool
sudo zfs list -r docker-pool/docker
```

You should see datasets for each image layer Docker pulled.

## Tuning ZFS for Docker Performance

### Record Size

ZFS uses a default record size of 128KB. For Docker workloads, which tend to involve many small files, reducing this can improve performance:

```bash
# Set record size to 64KB for better small-file performance
sudo zfs set recordsize=64k docker-pool/docker
```

### ARC Cache

ZFS uses the ARC (Adaptive Replacement Cache) to cache frequently accessed data in memory. By default, ZFS can consume up to half of your system's RAM. On systems running many containers, you may want to limit this.

Set a maximum ARC size in bytes (this example limits it to 4GB):

```bash
# Limit ZFS ARC cache to 4GB
echo 4294967296 | sudo tee /sys/module/zfs/parameters/zfs_arc_max
```

To make this persistent across reboots:

```bash
# Persist the ARC limit
echo "options zfs zfs_arc_max=4294967296" | sudo tee /etc/modprobe.d/zfs.conf
```

### Deduplication Warning

ZFS supports deduplication, but enabling it for Docker workloads is generally a bad idea. Deduplication requires enormous amounts of RAM (roughly 5GB per 1TB of data) and can severely degrade performance. Docker's layer-based architecture already provides a form of deduplication through shared image layers.

## Setting Container Storage Quotas

One useful ZFS feature is the ability to set storage quotas on individual containers. While Docker does not expose this directly, you can set a quota on the Docker dataset to limit total Docker storage:

```bash
# Limit Docker to 100GB of storage
sudo zfs set quota=100G docker-pool/docker
```

## Monitoring ZFS Health

Regular monitoring is important for production systems. Check pool health periodically:

```bash
# Check pool status and health
sudo zpool status docker-pool

# Check for I/O statistics
sudo zpool iostat docker-pool 5
```

Set up a scrub schedule to detect and repair data corruption. A monthly scrub is standard practice:

```bash
# Run a scrub manually
sudo zpool scrub docker-pool

# Check scrub progress
sudo zpool status docker-pool | grep scan
```

## Backing Up Docker Data with ZFS Snapshots

ZFS snapshots give you a powerful backup mechanism. You can snapshot the entire Docker dataset before major changes:

```bash
# Create a snapshot of the Docker dataset
sudo zfs snapshot docker-pool/docker@before-upgrade

# List all snapshots
sudo zfs list -t snapshot

# Roll back to a snapshot if something goes wrong
sudo zfs rollback docker-pool/docker@before-upgrade
```

You can also send snapshots to a remote system for offsite backup:

```bash
# Send a snapshot to a remote ZFS system
sudo zfs send docker-pool/docker@before-upgrade | ssh remote-host sudo zfs recv backup-pool/docker-backup
```

## Troubleshooting

**Docker fails to start with "driver not supported"**: Verify ZFS is loaded with `lsmod | grep zfs`. If not, run `sudo modprobe zfs`.

**No space left errors**: Check the pool and dataset usage with `sudo zfs list`. If the pool is full, add a new disk with `sudo zpool add docker-pool /dev/sdc`.

**Slow container startup**: Check if deduplication is accidentally enabled with `sudo zfs get dedup docker-pool/docker`. Disable it with `sudo zfs set dedup=off docker-pool/docker`.

## Summary

ZFS is a solid storage driver choice for Docker when you need data integrity, compression, and snapshot capabilities. The setup process involves creating a ZFS pool, mounting a dataset at Docker's data directory, and configuring the daemon to use the ZFS driver. For production environments, tune the record size and ARC cache, set up regular scrubs, and use snapshots as part of your backup strategy.
