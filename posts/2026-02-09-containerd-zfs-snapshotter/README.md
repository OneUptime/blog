# How to Set Up containerd ZFS Snapshotter for Copy-on-Write Container Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Containerd, ZFS, Storage, Performance

Description: Learn how to configure containerd with ZFS snapshotter to leverage copy-on-write technology for efficient container storage, faster cloning, and better space utilization in Kubernetes.

---

ZFS provides advanced storage features like copy-on-write, snapshots, and data integrity verification that benefit container workloads. The containerd ZFS snapshotter leverages these features for efficient image layer management and fast container cloning. This guide shows you how to configure ZFS storage for Kubernetes containers.

## Understanding ZFS Benefits for Containers

ZFS copy-on-write means creating container snapshots from already-unpacked image layers avoids copying the parent data. Containers can start quickly when the image is already present on the node, though pulling and unpacking image layers still takes time. ZFS compression reduces storage requirements for layers. Built-in checksums detect data corruption. Snapshots enable point-in-time copies without duplicating unchanged data.

For Kubernetes, ZFS can improve pod startup time by making writable snapshot creation efficient after layers have been unpacked. Multiple pods sharing images consume minimal additional storage due to copy-on-write. ZFS compression can reduce storage requirements significantly for text-heavy images, depending on the image contents. These benefits make ZFS useful for high-density container deployments.

## Installing ZFS

Install ZFS on Ubuntu nodes.

```bash
# Install ZFS utilities

sudo apt-get update
sudo apt-get install -y zfsutils-linux

# Create ZFS pool for containers
sudo zpool create -f containerd-pool /dev/nvme1n1

# Create dataset for containerd
sudo zfs create -o mountpoint=/var/lib/containerd/io.containerd.snapshotter.v1.zfs containerd-pool/containerd

# Enable compression
sudo zfs set compression=lz4 containerd-pool/containerd

# Set recordsize for better performance
sudo zfs set recordsize=128k containerd-pool/containerd

# Verify configuration
sudo zfs list
sudo zpool status
```

## Configuring containerd ZFS Snapshotter

Enable ZFS snapshotter in containerd.

```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri"]
  [plugins."io.containerd.grpc.v1.cri".containerd]
    # Use ZFS snapshotter
    snapshotter = "zfs"
    default_runtime_name = "runc"

[plugins."io.containerd.snapshotter.v1.zfs"]
  # Optional: set this only if you use a non-default snapshotter path.
  # The path must be the mount point of a ZFS filesystem.
  root_path = "/var/lib/containerd/io.containerd.snapshotter.v1.zfs"
```

Restart containerd:

```bash
sudo systemctl restart containerd
```

## Optimizing ZFS for Containers

Tune ZFS parameters for container workloads.

```bash
# Disable access time updates
sudo zfs set atime=off containerd-pool/containerd

# NOTE: Deduplication is NOT recommended for container workloads.
# It has high memory overhead (~5GB RAM per 1TB of data) and causes
# unpredictable performance degradation. Docker/containerd's layer
# sharing already provides deduplication at the image layer level.
# sudo zfs set dedup=off containerd-pool/containerd  # keep dedup off (default)

# Set ARC cache limits
echo "options zfs zfs_arc_max=8589934592" | sudo tee -a /etc/modprobe.d/zfs.conf
# 8GB ARC cache

# Configure ARC and L2ARC caching
sudo zfs set primarycache=all containerd-pool/containerd
sudo zfs set secondarycache=all containerd-pool/containerd

# Optional: disable synchronous writes only if you understand the data-loss
# and application-consistency risks during crashes or power loss.
# sudo zfs set sync=disabled containerd-pool/containerd
```

## Monitoring ZFS Performance

Track ZFS metrics for container storage.

```bash
# Check ZFS pool status
sudo zpool status
sudo zpool iostat -v 5

# View compression ratio
sudo zfs get compressratio containerd-pool/containerd

# Check deduplication ratio
sudo zpool get dedupratio containerd-pool

# Monitor ARC cache hit rate
arc_hits=$(cat /proc/spl/kstat/zfs/arcstats | grep "^hits" | awk '{print $3}')
arc_misses=$(cat /proc/spl/kstat/zfs/arcstats | grep "^misses" | awk '{print $3}')
echo "ARC hit rate: $(echo "scale=2; $arc_hits * 100 / ($arc_hits + $arc_misses)" | bc)%"
```

ZFS snapshotter provides substantial benefits for Kubernetes container storage through copy-on-write efficiency, compression, and data integrity features. By avoiding full data copies when creating writable snapshots from existing image layers, ZFS can improve pod startup times and storage utilization. For high-density Kubernetes clusters, ZFS offers a compelling alternative to traditional overlay filesystems.
