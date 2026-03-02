# How to Configure EnhanceIO for SSD Caching on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, SSD, Performance, Caching

Description: Set up EnhanceIO on Ubuntu to transparently cache frequently accessed data from slow HDDs onto fast SSDs, improving read performance for mixed storage systems.

---

EnhanceIO is a Linux kernel module that implements SSD caching by intercepting block I/O requests and transparently serving frequently accessed data from a fast SSD rather than a slow HDD. It was originally developed at STEC (now part of Western Digital) and is available as an open-source project. Unlike lvmcache, EnhanceIO works below the filesystem level and does not require LVM.

## How EnhanceIO Works

EnhanceIO operates in the Linux block layer:

1. You specify a slow source device (HDD) and a fast cache device (SSD)
2. EnhanceIO creates a virtual device that transparently intercepts I/O to the source
3. Read requests check the SSD cache first; hits are served from SSD, misses fall through to HDD and populate the cache
4. Write requests can be handled in read-only, write-through, or write-back mode

EnhanceIO supports three cache modes:
- **Read-only**: Only caches reads. Writes go directly to HDD.
- **Write-through**: Writes go to both SSD and HDD simultaneously.
- **Write-back**: Writes go to SSD cache first, then lazily written to HDD (highest write performance, some data risk).

## Checking Kernel and Ubuntu Compatibility

EnhanceIO works on Ubuntu 20.04 and older kernels. It has compatibility issues with newer kernel versions (5.x and above in some configurations). Before proceeding, check your kernel version:

```bash
uname -r
```

If you are running Ubuntu 22.04 with kernel 5.15+, consider using lvmcache or dm-writecache instead, as they are integrated into the mainline kernel and have better long-term support.

## Installing Build Dependencies

EnhanceIO is compiled from source:

```bash
# Install build dependencies
sudo apt update
sudo apt install -y \
  build-essential \
  git \
  linux-headers-$(uname -r) \
  dkms

# Clone the EnhanceIO repository
git clone https://github.com/stec-inc/EnhanceIO.git
cd EnhanceIO
```

## Building and Installing EnhanceIO

```bash
# Navigate to the driver source
cd Driver/enhanceio

# Build the kernel module
make

# Install the module
sudo make install

# Load the module
sudo modprobe enhanceio
sudo modprobe enhanceio_lru   # LRU cache policy module
sudo modprobe enhanceio_fifo  # FIFO cache policy module

# Verify the module loaded
lsmod | grep enhanceio
```

Make the module load at boot:

```bash
echo "enhanceio" | sudo tee -a /etc/modules
echo "enhanceio_lru" | sudo tee -a /etc/modules
```

## Installing the EnhanceIO CLI Tool

The `eio_cli` utility manages EnhanceIO caches:

```bash
# Install eio_cli from the repository
cd EnhanceIO/CLI
sudo python3 setup.py install

# Verify
sudo eio_cli --help
```

## Identifying Your Devices

Before creating a cache, identify your storage devices:

```bash
# List block devices
lsblk

# Example output:
# sda  - 2TB HDD (source device to cache)
# sdb  - 250GB SSD (cache device)

# Check device details
sudo fdisk -l /dev/sda
sudo fdisk -l /dev/sdb

# Ensure the HDD filesystem is unmounted before creating the cache
# (EnhanceIO works on the block device level)
mount | grep sda
```

**Important**: If you are caching an existing filesystem, unmount it before creating the EnhanceIO cache. The filesystem can be remounted after the cache is created.

## Creating an EnhanceIO Cache

```bash
# Unmount the filesystem on the source device
sudo umount /mnt/data  # If currently mounted

# Create a read-only cache (safest option to start with)
sudo eio_cli create \
  --diskname /dev/sda \
  --ssdname /dev/sdb \
  --cachename data-cache \
  --mode ro

# Check the cache was created
sudo eio_cli info --cachename data-cache
```

### Cache Creation Options

```bash
# Write-through cache (safe for all workloads)
sudo eio_cli create \
  --diskname /dev/sda \
  --ssdname /dev/sdb \
  --cachename data-cache \
  --mode wt

# Write-back cache (best write performance)
sudo eio_cli create \
  --diskname /dev/sda \
  --ssdname /dev/sdb \
  --cachename data-cache \
  --mode wb

# Specify cache policy (lru is default, fifo is alternative)
sudo eio_cli create \
  --diskname /dev/sda \
  --ssdname /dev/sdb \
  --cachename data-cache \
  --mode wt \
  --policy lru

# Specify block size (default 4096 bytes, must be power of 2)
sudo eio_cli create \
  --diskname /dev/sda \
  --ssdname /dev/sdb \
  --cachename data-cache \
  --mode wt \
  --blksize 4096
```

## Remounting the Filesystem

After creating the cache, mount the filesystem again. The mount target is still the original device - EnhanceIO intercepts at the block level:

```bash
# Mount the original device as before
# EnhanceIO transparently intercepts I/O
sudo mount /dev/sda1 /mnt/data

# Verify the mount
mount | grep /mnt/data
df -h /mnt/data
```

## Viewing Cache Statistics

```bash
# View cache status and statistics
sudo eio_cli info --cachename data-cache

# Sample output:
# Cache Name: data-cache
# Source Device: /dev/sda
# SSD Device: /dev/sdb
# Cache Mode: Write Through
# Cache State: Active
# Cache Size: 200.00 GB
# Source Size: 1862.89 GB
# Cache Block Size: 4096 bytes
# Reads: 12345
# Writes: 6789
# Read Hits: 8543
# Read Hit Pct: 69.2%
# Write Hits: 3210
```

## Monitoring Cache Performance

```bash
# Watch statistics update in real time
watch -n 2 'sudo eio_cli info --cachename data-cache | grep -E "Hit|Miss|Read|Write"'

# View detailed statistics from sysfs
cat /sys/bus/enhanceio/devices/data-cache/stats

# Read hit percentage
awk '/read_hits/ {hits=$2} /reads/ {reads=$2} END {printf "Hit rate: %.1f%%\n", (hits/reads)*100}' \
  /sys/bus/enhanceio/devices/data-cache/stats
```

## Benchmarking Before and After

Test the performance difference with and without caching:

```bash
# Install fio
sudo apt install -y fio

# Test random read IOPS (most impacted by caching)
# After cache warms up, reads should come from SSD
sudo fio --name=random-read \
  --filename=/mnt/data/testfile \
  --size=4G \
  --rw=randread \
  --bs=4k \
  --numjobs=4 \
  --iodepth=32 \
  --time_based \
  --runtime=60 \
  --ioengine=libaio \
  --group_reporting

# Write the test file first to populate the cache
sudo dd if=/dev/urandom of=/mnt/data/testfile bs=1M count=4096
```

After the cache warms up (run the fio read test twice - the second run should show higher IOPS from the SSD cache), you should see significantly improved random read performance.

## Changing Cache Mode

```bash
# Switch from read-only to write-through
sudo eio_cli edit \
  --cachename data-cache \
  --mode wt

# Verify the change
sudo eio_cli info --cachename data-cache | grep "Cache Mode"
```

## Persisting Cache Configuration Across Reboots

EnhanceIO does not automatically restore caches after reboot. You need to recreate the cache at boot time.

For write-back mode, the cache metadata is stored on the SSD. When recreating after reboot, EnhanceIO detects the existing cache:

```bash
# Create a systemd service to restore the cache at boot
sudo nano /etc/systemd/system/enhanceio-data-cache.service
```

```ini
[Unit]
Description=EnhanceIO SSD Cache for data volume
After=local-fs.target
Before=remote-fs.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/eio_cli create --diskname /dev/sda --ssdname /dev/sdb --cachename data-cache --mode wt
ExecStop=/usr/local/bin/eio_cli delete --cachename data-cache --retain

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable enhanceio-data-cache
```

## Removing a Cache

```bash
# Flush the cache (write all dirty blocks back to HDD)
# For write-back mode - important for data safety
sudo eio_cli edit --cachename data-cache --mode ro  # Switch to read-only first
# Wait for dirty blocks to flush
sudo eio_cli info --cachename data-cache | grep "dirty"

# Delete the cache
sudo eio_cli delete --cachename data-cache

# Verify
sudo eio_cli list
```

## Troubleshooting

If the module fails to load:

```bash
# Check kernel messages
sudo dmesg | grep -i enhanceio

# Verify the module was built for the current kernel
ls /lib/modules/$(uname -r)/extra/enhanceio*.ko
```

If cache creation fails with "device busy":

```bash
# Ensure the device is not mounted or in use
sudo lsof /dev/sda
sudo fuser /dev/sda
```

EnhanceIO is straightforward to set up and requires no changes to your existing storage layout or filesystems. For workloads with high read locality (databases, web server file caches, VM images), the performance improvement from SSD caching can be substantial. For kernel version compatibility, verify against your specific Ubuntu release before deploying in production.
