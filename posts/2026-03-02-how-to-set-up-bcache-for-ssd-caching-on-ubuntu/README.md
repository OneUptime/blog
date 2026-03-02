# How to Set Up Bcache for SSD Caching on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bcache, SSD Caching, Storage, Performance

Description: Configure bcache on Ubuntu to use an SSD as a cache device for slower HDD storage, transparently accelerating read and write performance for frequently accessed data.

---

Bcache is a Linux block layer cache that places an SSD in front of one or more slower disks (HDDs or SAS drives). Frequently accessed blocks are cached on the SSD, giving you SSD-like performance for hot data while keeping costs down through cheaper bulk storage. It works transparently at the block device level, so any filesystem or application benefits without modification.

Bcache supports three caching modes: writeback (write to SSD, flush to disk later - faster but more risk), writethrough (write to both simultaneously - slower but safer), and writearound (write directly to disk, cache only reads).

## Understanding the Architecture

- **Backing device** - The slow storage (HDD, SAS, RAID array). This is where data permanently lives.
- **Cache device** - The fast SSD that acts as a cache.
- **bcache device** - The virtual device (`/dev/bcacheX`) that applications and filesystems use. Reads/writes go through the cache.

## Prerequisites

Bcache support is built into the Linux kernel since 3.10. Check that your kernel includes it:

```bash
# Check for bcache kernel module
modinfo bcache

# Load the module if not already loaded
sudo modprobe bcache
lsmod | grep bcache
```

Install the userspace tools:

```bash
sudo apt update
sudo apt install bcache-tools -y
```

## Identifying Your Devices

For this guide:
- Backing device (HDD): `/dev/sdb`
- Cache device (SSD): `/dev/sdc`

Important: bcache formatting destroys existing data on both devices. Make sure you're targeting the right disks:

```bash
# List all block devices with sizes
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL

# Double-check by confirming the device models
sudo hdparm -I /dev/sdb | grep Model
sudo hdparm -I /dev/sdc | grep Model
```

## Formatting the Backing Device

```bash
# Format /dev/sdb as a bcache backing device
# This replaces or adds bcache superblock to the device
sudo make-bcache -B /dev/sdb

# For an existing partition:
# sudo make-bcache -B /dev/sdb1

# Verify the bcache superblock was created
sudo bcache-super-show /dev/sdb
```

After formatting, the bcache device appears:

```bash
# Check for the new bcache device
ls /dev/bcache*
lsblk

# The device should show as /dev/bcache0
```

## Formatting the Cache Device

```bash
# Format the SSD as a bcache cache device
sudo make-bcache -C /dev/sdc

# Show the cache device info including its UUID
sudo bcache-super-show /dev/sdc
```

Note the `cset.uuid` from the cache device output - you'll need it to attach the cache.

## Attaching the Cache to the Backing Device

```bash
# Get the cache set UUID
CSET_UUID=$(sudo bcache-super-show /dev/sdc | grep "cset.uuid" | awk '{print $2}')
echo "Cache UUID: $CSET_UUID"

# Attach the cache device to the backing device
echo "$CSET_UUID" | sudo tee /sys/block/bcache0/bcache/attach

# Verify attachment
cat /sys/block/bcache0/bcache/cache_mode
cat /sys/block/bcache0/bcache/state
```

The state should show `clean` (no dirty cache pages yet) and cache_mode shows the current mode.

## Setting the Cache Mode

```bash
# Available modes: writeback, writethrough, writearound, none
# View current mode
cat /sys/block/bcache0/bcache/cache_mode

# Set to writeback for best write performance (default is writethrough)
echo writeback | sudo tee /sys/block/bcache0/bcache/cache_mode

# For maximum data safety (slower writes but immediate persistence):
echo writethrough | sudo tee /sys/block/bcache0/bcache/cache_mode
```

**Writeback mode**: Writes go to the SSD cache immediately; data is written back to the HDD later. Risk: if the system crashes before writeback completes, you could lose recently written data (similar to a write cache on a RAID controller).

**Writethrough mode**: Every write goes to both the SSD and HDD simultaneously. Writes are as slow as the HDD, but reads benefit from caching. Much safer for important data.

## Creating a Filesystem on bcache

The `/dev/bcache0` device is used exactly like any other block device:

```bash
# Create XFS filesystem on the bcache device
sudo mkfs.xfs /dev/bcache0

# Mount it
sudo mkdir -p /mnt/cached-storage
sudo mount /dev/bcache0 /mnt/cached-storage

# Verify it's working
df -h /mnt/cached-storage
```

## Making Configuration Persistent Across Reboots

Bcache devices need to be re-registered after reboot. The bcache module does this automatically when it detects bcache signatures on devices, but you need to ensure the module loads:

```bash
# Ensure bcache module loads at boot
echo "bcache" | sudo tee /etc/modules-load.d/bcache.conf

# After reboot, the bcache devices should reappear automatically
# If they don't, manually register:
echo /dev/sdb | sudo tee /sys/fs/bcache/register
echo /dev/sdc | sudo tee /sys/fs/bcache/register
```

For fstab mounting:

```bash
# Get the bcache device UUID
sudo blkid /dev/bcache0

# Add to /etc/fstab
# UUID=xxxx-xxxx /mnt/cached-storage xfs defaults,nofail 0 0
```

## Combining with make-bcache in One Step

You can format both devices simultaneously:

```bash
# Format and associate backing and cache devices in one command
sudo make-bcache -B /dev/sdb -C /dev/sdc

# This creates /dev/bcache0 already attached to the cache
lsblk
```

## Monitoring Cache Performance

```bash
# Check cache hit rate (expressed as percentage)
cat /sys/block/bcache0/bcache/stats_day/cache_hit_ratio
cat /sys/block/bcache0/bcache/stats_hour/cache_hit_ratio

# Detailed statistics
ls /sys/block/bcache0/bcache/stats_total/
cat /sys/block/bcache0/bcache/stats_total/cache_hits
cat /sys/block/bcache0/bcache/stats_total/cache_misses
cat /sys/block/bcache0/bcache/stats_total/cache_bypass_hits

# Cache device usage
cat /sys/fs/bcache/*/bdev[0-9]*/stats_total/cache_hit_ratio 2>/dev/null

# How full the cache is
cat /sys/block/sdc/bcache/cache/cache_available_percent
```

A hit ratio below 80% in writeback mode suggests the working set is larger than the cache. Either increase cache size or accept that some I/O hits the spinning disk.

## Tuning bcache

```bash
# Set sequential I/O bypass threshold
# Large sequential reads go directly to HDD, preserving cache for random I/O
echo 0 | sudo tee /sys/block/bcache0/bcache/sequential_cutoff
# Set to 1MB to bypass cache for sequential reads > 1MB
echo 1048576 | sudo tee /sys/block/bcache0/bcache/sequential_cutoff

# Set readahead (bytes)
echo 1048576 | sudo tee /sys/block/bcache0/bcache/readahead

# Cache device write rate limit (useful to prevent SSD wear)
# cat /sys/fs/bcache/<uuid>/io_error_limit

# Writeback delay (seconds between writeback flushes)
echo 30 | sudo tee /sys/fs/bcache/*/internal/writeback_delay 2>/dev/null
```

## Detaching and Removing bcache

When you need to remove bcache (migrating to a larger SSD, decommissioning):

```bash
# Unmount the filesystem first
sudo umount /mnt/cached-storage

# Flush all dirty cache pages to the backing device (writeback mode)
echo 0 | sudo tee /sys/block/bcache0/bcache/writeback_percent
# Wait for dirty count to reach 0
watch -n 2 'cat /sys/block/bcache0/bcache/dirty_data'

# Detach the cache from the backing device
echo 1 | sudo tee /sys/block/bcache0/bcache/detach

# Stop the bcache device
echo 1 | sudo tee /sys/block/bcache0/bcache/stop

# Wipe the bcache superblock from devices if repurposing them
sudo wipefs -a /dev/sdb
sudo wipefs -a /dev/sdc
```

## Performance Benchmarking

Test the improvement bcache provides:

```bash
sudo apt install fio -y

# Test without bcache - direct to HDD
sudo fio --name=hdd-test --filename=/dev/sdb --rw=randread --bs=4k \
  --direct=1 --numjobs=4 --size=1G --time_based --runtime=30 --group_reporting

# Test with bcache (after warming the cache with reads)
sudo fio --name=bcache-test --filename=/dev/bcache0 --rw=randread --bs=4k \
  --direct=1 --numjobs=4 --size=1G --time_based --runtime=60 --group_reporting

# Compare IOPS - bcache should show dramatically higher IOPS for cached data
```

Typical results: An HDD might give 100-200 random read IOPS, while bcache backed by an SSD cache delivers thousands of IOPS for cached blocks.

Bcache is a practical middle ground between all-flash and all-spinning storage. It works best when your working set (the hot data your applications actually access frequently) fits within the SSD cache. For databases with a hot dataset that's 20-30% of total data size, bcache can deliver near-SSD performance at HDD cost per gigabyte.
