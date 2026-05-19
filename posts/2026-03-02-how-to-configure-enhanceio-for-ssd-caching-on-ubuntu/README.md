# How to Configure EnhanceIO for SSD Caching on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, SSD, Performance, Caching

Description: Set up EnhanceIO on Ubuntu to transparently cache frequently accessed data from slow HDDs onto fast SSDs, improving read performance for mixed storage systems.

---

EnhanceIO is a Linux kernel module that implements SSD caching by intercepting block I/O requests and transparently serving frequently accessed data from a fast SSD rather than a slow HDD. It was originally developed at STEC (now part of Western Digital) and is available as an open-source project. Unlike lvmcache, EnhanceIO works below the filesystem level and does not require LVM.

## How EnhanceIO Works

EnhanceIO operates in the Linux block layer:

1. You specify a slow source device (HDD) and a fast cache device (SSD)
2. EnhanceIO attaches to the source device and transparently intercepts I/O to it
3. Read requests check the SSD cache first; hits are served from SSD, misses fall through to HDD and populate the cache
4. Write requests can be handled in read-only, write-through, or write-back mode

EnhanceIO supports three cache modes:
- **Read-only**: Only caches reads. Writes go directly to HDD.
- **Write-through**: Writes go to both SSD and HDD simultaneously.
- **Write-back**: Writes go to SSD cache first, then lazily written to HDD (highest write performance, some data risk).

## Checking Kernel and Ubuntu Compatibility

EnhanceIO is legacy software. The upstream project was archived in 2024, and its original documentation targets older Linux kernels rather than current Ubuntu releases. It has compatibility issues with newer kernel versions (5.x and above in some configurations). Before proceeding, check your kernel version:

```bash
uname -r
```

If you are running Ubuntu 22.04 with kernel 5.15+ or a newer Ubuntu release, consider using lvmcache or dm-writecache instead, as they are integrated into the mainline kernel and have better long-term support.

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
sudo modprobe enhanceio_rand  # Random cache policy module

# Verify the module loaded
lsmod | grep enhanceio
```

Make the module load at boot:

```bash
echo "enhanceio" | sudo tee -a /etc/modules
echo "enhanceio_lru" | sudo tee -a /etc/modules
echo "enhanceio_fifo" | sudo tee -a /etc/modules
echo "enhanceio_rand" | sudo tee -a /etc/modules
```

## Installing the EnhanceIO CLI Tool

The `eio_cli` utility manages EnhanceIO caches:

```bash
# Install eio_cli from the repository
cd ../..
sudo install -m 700 CLI/eio_cli /sbin/eio_cli
sudo install -m 644 CLI/eio_cli.8 /usr/share/man/man8/eio_cli.8
sudo mandb

# Verify
sudo eio_cli --help
```

The upstream `eio_cli` script is written for Python 2 syntax. On modern Ubuntu systems, use a distro-patched package if available or ensure `/usr/bin/python` points to a Python 2-compatible interpreter before running the upstream script.

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

# Check whether the source device is currently mounted
mount | grep sda
```

**Important**: EnhanceIO is designed to create and delete caches while a source volume is mounted. For a cautious first setup, especially on non-production data, you can unmount the filesystem before creating the cache and remount it afterward.

## Creating an EnhanceIO Cache

```bash
# Unmount the filesystem on the source device
sudo umount /mnt/data  # If currently mounted

# Create a read-only cache (safest option to start with)
sudo eio_cli create \
  -d /dev/sda \
  -s /dev/sdb \
  -c data_cache \
  -m ro

# Check the cache was created
sudo eio_cli info
```

### Cache Creation Options

```bash
# Write-through cache (safe for all workloads)
sudo eio_cli create \
  -d /dev/sda \
  -s /dev/sdb \
  -c data_cache \
  -m wt

# Write-back cache (best write performance)
sudo eio_cli create \
  -d /dev/sda \
  -s /dev/sdb \
  -c data_cache \
  -m wb

# Specify cache policy (upstream eio_cli defaults to lru; fifo and rand are alternatives)
sudo eio_cli create \
  -d /dev/sda \
  -s /dev/sdb \
  -c data_cache \
  -m wt \
  -p lru

# Specify block size (supported values are 2048, 4096, and 8192 bytes; default is 4096)
sudo eio_cli create \
  -d /dev/sda \
  -s /dev/sdb \
  -c data_cache \
  -m wt \
  -b 4096
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
sudo eio_cli info

# Sample output:
# Cache Name       : data_cache
# Source Device    : /dev/sda
# SSD Device       : /dev/sdb
# Policy           : lru
# Mode             : Write Through
# Block Size       : 4096
# Associativity    : 256
# State            : normal
```

## Monitoring Cache Performance

```bash
# Watch statistics update in real time
watch -n 2 'cat /proc/enhanceio/data_cache/stats | grep -E "hit|read|write|dirty"'

# View detailed statistics from procfs
cat /proc/enhanceio/data_cache/stats

# Read hit percentage
awk '/read_hits/ {hits=$2} /reads/ {reads=$2} END {printf "Hit rate: %.1f%%\n", (hits/reads)*100}' \
  /proc/enhanceio/data_cache/stats
```

## Benchmarking Before and After

Test the performance difference with and without caching:

```bash
# Install fio
sudo apt install -y fio

# Create the test file first
sudo dd if=/dev/urandom of=/mnt/data/testfile bs=1M count=4096

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

```

After the cache warms up (run the fio read test twice - the second run should show higher IOPS from the SSD cache), you should see significantly improved random read performance.

## Changing Cache Mode

```bash
# Switch from read-only to write-through
sudo eio_cli edit \
  -c data_cache \
  -m wt

# Verify the change
sudo eio_cli info | grep "Mode"
```

## Persisting Cache Configuration Across Reboots

EnhanceIO creates a udev rule for persistence when a cache is created. It is important that the cache is enabled before applications or filesystems write to the source volume during boot; otherwise stale cached data may be used. For write-back mode, persistence is mandatory because dirty blocks may exist only on the SSD after a crash or power failure.

```bash
# Check the generated udev rule
sudo ls /etc/udev/rules.d/94-enhanceio-data_cache.rules
sudo udevadm control --reload-rules
```

The upstream persistence documentation notes that write-back caching on the root device is not supported, and that udev rules may not be generated for some device types such as loop devices.

## Removing a Cache

```bash
# Flush the cache (write all dirty blocks back to HDD)
# For write-back mode - important for data safety
sudo eio_cli clean -c data_cache
# Wait for dirty blocks to flush
grep "nr_dirty" /proc/enhanceio/data_cache/stats

# Delete the cache
sudo eio_cli delete -c data_cache

# Verify
sudo eio_cli info
```

## Troubleshooting

If the module fails to load:

```bash
# Check kernel messages
sudo dmesg | grep -i enhanceio

# Verify the module was built for the current kernel
ls /lib/modules/$(uname -r)/extra/enhanceio/enhanceio*.ko
```

If cache creation fails with "device busy":

```bash
# Ensure the device is not mounted or in use
sudo lsof /dev/sda
sudo fuser /dev/sda
```

EnhanceIO is straightforward to set up and requires no changes to your existing storage layout or filesystems. For workloads with high read locality (databases, web server file caches, VM images), the performance improvement from SSD caching can be substantial. For kernel version compatibility, verify against your specific Ubuntu release before deploying in production.
