# How to Set Up Docker with Device Mapper Storage Driver

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Device Mapper, Storage Driver, DevOps, Linux, LVM

Description: Configure Docker to use the device mapper storage driver with direct-lvm mode for production-grade container storage.

---

Device Mapper is a Linux kernel framework that provides a generic way to map one block device to another. Docker's `devicemapper` storage driver leverages this framework to provide thin provisioning and copy-on-write capabilities for container storage. While overlay2 has become the default storage driver for most distributions, Device Mapper remains relevant for environments running older kernels or using block-level storage solutions.

This guide explains how to configure Docker with Device Mapper in both loop-lvm (for testing) and direct-lvm (for production) modes, and how to manage the setup over time.

## Understanding Device Mapper Modes

Docker's Device Mapper driver operates in two modes:

**loop-lvm mode** creates loopback devices backed by sparse files. This mode requires no additional setup but has poor performance characteristics. It should only be used for testing, never for production workloads.

**direct-lvm mode** uses a raw block device with LVM thin provisioning. This mode provides significantly better performance and is the only mode suitable for production.

The difference matters a great deal. In loop-lvm mode, Docker creates two sparse files under `/var/lib/docker/devicemapper/` to serve as the thin pool. These files grow on demand but are limited by the underlying filesystem and suffer from poor I/O performance. In direct-lvm mode, Docker writes directly to a block device, avoiding the overhead of loopback translation.

## Prerequisites

For direct-lvm mode, you need:

- A Linux system (CentOS, RHEL, Ubuntu, or Debian)
- A dedicated, unused block device (e.g., `/dev/sdb`)
- Docker Engine installed but stopped
- Root or sudo access
- LVM2 tools installed

## Step 1: Install LVM Tools

LVM tools are usually pre-installed on most Linux systems, but verify and install if needed.

```bash
# Install LVM tools on Ubuntu/Debian
sudo apt update
sudo apt install -y lvm2 thin-provisioning-tools

# Or on CentOS/RHEL
sudo yum install -y lvm2 device-mapper-persistent-data
```

## Step 2: Stop Docker

Stop Docker before changing the storage driver:

```bash
# Stop Docker and containerd
sudo systemctl stop docker
sudo systemctl stop containerd
```

If you have existing Docker data from a different storage driver, back it up:

```bash
# Back up existing Docker data
sudo cp -au /var/lib/docker /var/lib/docker.backup
```

## Step 3: Set Up Direct-LVM with a Dedicated Block Device

This is the recommended production configuration. We will create an LVM thin pool on a dedicated disk.

First, identify your block device:

```bash
# List available block devices
lsblk
```

Create a physical volume on the dedicated disk:

```bash
# Initialize the disk for use by LVM (replace /dev/sdb with your device)
sudo pvcreate /dev/sdb
```

Create a volume group:

```bash
# Create a volume group named "docker-vg" on the physical volume
sudo vgcreate docker-vg /dev/sdb
```

Create a thin pool logical volume. Allocate 95% of the volume group for data and a portion for metadata:

```bash
# Create the data logical volume using 95% of the volume group
sudo lvcreate --wipesignatures y -n thinpool docker-vg -l 95%VG

# Create the metadata logical volume using 1% of the volume group
sudo lvcreate --wipesignatures y -n thinpoolmeta docker-vg -l 1%FREE
```

Convert the volumes to a thin pool:

```bash
# Convert the logical volumes into a thin pool with metadata
sudo lvconvert -y \
  --zero n \
  -c 512K \
  --thinpool docker-vg/thinpool \
  --poolmetadata docker-vg/thinpoolmeta
```

Configure autoextension so the thin pool grows automatically when it gets full:

```bash
# Create an LVM profile for Docker's thin pool
sudo tee /etc/lvm/profile/docker-thinpool.profile <<EOF
activation {
  thin_pool_autoextend_threshold=80
  thin_pool_autoextend_percent=20
}
EOF
```

Apply the profile to the thin pool:

```bash
# Apply the autoextension profile
sudo lvchange --metadataprofile docker-thinpool docker-vg/thinpool
```

Verify the thin pool is configured correctly:

```bash
# Check the logical volume status
sudo lvs -o+seg_monitor
```

You should see the `thinpool` volume with monitoring enabled.

## Step 4: Configure Docker for Direct-LVM

Create or edit the Docker daemon configuration to use Device Mapper with the thin pool:

```bash
# Write the Docker daemon configuration for direct-lvm
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "storage-driver": "devicemapper",
  "storage-opts": [
    "dm.thinpooldev=/dev/mapper/docker--vg-thinpool",
    "dm.use_deferred_removal=true",
    "dm.use_deferred_deletion=true"
  ]
}
EOF
```

The key options here:

- `dm.thinpooldev` points to the thin pool device we created
- `dm.use_deferred_removal` prevents device busy errors during container removal
- `dm.use_deferred_deletion` defers thin device deletion if the device is busy

## Step 5: Clean Up and Start Docker

If Docker was previously using a different storage driver, clear out the old data:

```bash
# Remove old Docker data (only after backing up if needed)
sudo rm -rf /var/lib/docker/*

# Start Docker
sudo systemctl start docker
```

Verify the storage driver and configuration:

```bash
# Check the active storage driver
docker info | grep -A 20 "Storage Driver"
```

You should see output similar to:

```
 Storage Driver: devicemapper
  Pool Name: docker--vg-thinpool
  Pool Blocksize: 524.3kB
  ...
  Data Space Used: 19.92MB
  Data Space Total: ...
```

Run a test container:

```bash
# Verify everything works with a test container
docker run --rm hello-world
```

## Setting Up Loop-LVM (Testing Only)

For testing environments where you do not have a spare block device, Docker can use loop-lvm mode. This creates loopback files automatically.

```bash
# Configure Docker for loop-lvm (TESTING ONLY)
sudo tee /etc/docker/daemon.json <<EOF
{
  "storage-driver": "devicemapper"
}
EOF
```

Start Docker and it will create the loopback files automatically:

```bash
sudo systemctl start docker
```

Docker will print a warning that loop-lvm is not recommended for production. You will see this in the logs:

```bash
# Check Docker logs for the loop-lvm warning
sudo journalctl -u docker | grep "loop"
```

## Managing Thin Pool Space

Monitor thin pool usage regularly:

```bash
# Check thin pool usage
sudo lvs docker-vg/thinpool

# More detailed view
sudo lvs -a -o +devices,seg_monitor docker-vg
```

If the autoextend profile is working, the thin pool should grow automatically when it reaches 80% capacity. You can check this by viewing the current autoextend settings:

```bash
# Verify autoextend configuration
sudo lvs -o+seg_monitor docker-vg/thinpool
```

If the volume group is full and the thin pool cannot extend, add a new physical disk:

```bash
# Add a new disk to the volume group
sudo pvcreate /dev/sdc
sudo vgextend docker-vg /dev/sdc
```

## Setting Per-Container Storage Limits

Device Mapper supports per-container storage limits through the `--storage-opt` flag:

```bash
# Run a container with a 10GB storage limit
docker run -it --storage-opt size=10G ubuntu bash
```

You can also set a default size for all containers in the daemon configuration:

```bash
# Set default container size in daemon.json
{
  "storage-driver": "devicemapper",
  "storage-opts": [
    "dm.thinpooldev=/dev/mapper/docker--vg-thinpool",
    "dm.basesize=20G"
  ]
}
```

## Performance Considerations

Device Mapper performance depends on several factors:

- **Block size**: The default 512KB block size works well for most workloads. Smaller block sizes waste less space but increase metadata overhead.
- **Underlying storage**: SSDs provide much better performance than HDDs, especially for random I/O patterns common in container workloads.
- **Thin pool fragmentation**: Over time, creating and destroying many containers can fragment the thin pool. Monitor usage and consider periodic cleanup.

Clean up unused data regularly:

```bash
# Remove stopped containers, unused images, and build cache
docker system prune -af

# Check space saved
docker system df
```

## Troubleshooting

**"devmapper: Thin Pool has free data blocks" warning**: The thin pool is getting full. Verify autoextend is working, or manually extend the thin pool.

**Container creation fails with "no space left"**: Check both the thin pool data and metadata usage. Metadata can fill up separately from data.

```bash
# Check both data and metadata usage
sudo dmsetup status docker--vg-thinpool
```

**Docker start fails with "driver not supported"**: Ensure the `dm_thin_pool` kernel module is loaded.

```bash
# Load the thin provisioning module
sudo modprobe dm_thin_pool
```

**Slow I/O performance**: Verify you are using direct-lvm, not loop-lvm. Check `docker info` output for "Data loop file" entries, which indicate loop-lvm mode.

## Summary

Device Mapper with direct-lvm mode provides reliable, production-grade block-level storage for Docker. The setup requires a dedicated block device, LVM thin provisioning, and proper Docker daemon configuration. Always use direct-lvm for production and enable autoextension to prevent the thin pool from filling up. While overlay2 has largely replaced Device Mapper as the default Docker storage driver, Device Mapper remains a solid choice in environments where block-level storage management is preferred.
