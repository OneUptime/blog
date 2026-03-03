# How to Set Up lvmcache for SSD Caching on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Storage, SSD, Performance

Description: Configure LVM cache on Ubuntu to use an SSD as a fast caching layer for a slower HDD volume, improving I/O performance without changing your storage layout.

---

If you have a mix of fast SSD storage and slower spinning disks, lvmcache lets you use the SSD as a transparent caching layer for the HDD. Frequently accessed data is cached on the SSD, while the HDD handles bulk storage. From the filesystem's perspective, it looks like a single volume - no application changes are needed.

## How lvmcache Works

lvmcache uses the Linux kernel's dm-cache device mapper target. It sits between the logical volume and the storage devices:

- **Origin volume**: The slow backing store (HDD)
- **Cache pool**: The fast caching layer (SSD), consisting of:
  - **Cache data LV**: Stores the actual cached blocks
  - **Cache metadata LV**: Tracks which blocks are cached

The cache operates in two policies:
- **writeback**: Writes go to the SSD cache first, then are written to the HDD later (faster writes, some risk on power loss)
- **writethrough**: Writes go to both SSD and HDD simultaneously (safer, slightly lower write performance)

## Prerequisites

- Ubuntu 20.04 or 22.04
- LVM2 installed and configured
- An HDD with an existing volume group and logical volumes
- An SSD (or SSD partition) to use as cache
- The `dm-cache` kernel module (included in standard Ubuntu kernels)

```bash
# Verify LVM2 is installed
sudo apt install -y lvm2

# Check dm-cache module is available
sudo modinfo dm-cache | head -5

# List your current volume groups and logical volumes
sudo pvs
sudo vgs
sudo lvs
```

## Scenario Setup

This example uses:
- `/dev/sdb`: A 1TB HDD with existing volume group `vg-data` containing `lv-data`
- `/dev/sdc`: A 250GB SSD to use as cache

```bash
# Verify the current setup
sudo pvdisplay
sudo vgdisplay vg-data
sudo lvdisplay /dev/vg-data/lv-data
```

## Step 1: Add the SSD as a Physical Volume

```bash
# Initialize the SSD as an LVM physical volume
sudo pvcreate /dev/sdc

# Verify
sudo pvs
```

If the SSD has existing partitions you want to remove:

```bash
# Wipe the SSD (destructive - ensure it has no needed data)
sudo wipefs -a /dev/sdc
sudo pvcreate /dev/sdc
```

## Step 2: Extend the Volume Group

```bash
# Add the SSD physical volume to the existing volume group
sudo vgextend vg-data /dev/sdc

# Verify the VG now includes both drives
sudo vgdisplay vg-data
```

## Step 3: Create the Cache Pool

The cache pool consists of two logical volumes: one for cache data and one for cache metadata. LVM requires the metadata volume to be a specific minimum size.

```bash
# Create the cache metadata LV
# Metadata should be ~1% of the cache data size, minimum 8MB
# For a 50GB cache: 512MB metadata is generous
sudo lvcreate --name lv-cache-meta \
  --size 512M \
  vg-data /dev/sdc

# Create the cache data LV on the SSD
# Use most of the remaining SSD space
sudo lvcreate --name lv-cache \
  --size 200G \
  vg-data /dev/sdc

# Combine them into a cache pool
sudo lvconvert --type cache-pool \
  --poolmetadata vg-data/lv-cache-meta \
  vg-data/lv-cache

# Verify the cache pool was created
sudo lvs --all vg-data
```

## Step 4: Attach the Cache Pool to the Origin Volume

```bash
# Convert the origin LV to use the cache pool
# This is the step that enables caching
sudo lvconvert --type cache \
  --cachepool vg-data/lv-cache \
  vg-data/lv-data

# Verify the configuration
sudo lvs --all vg-data
```

The output should show `lv-data` with type `Cache` and a cache pool reference.

## Step 5: Verifying Cache Operation

```bash
# Check detailed cache status
sudo lvs -o +cache_read_hits,cache_read_misses,cache_write_hits,cache_write_misses \
  vg-data/lv-data

# More detailed cache display
sudo lvdisplay vg-data/lv-data

# Check dm-cache status via dmsetup
sudo dmsetup status vg-data-lv--data
```

The dm-cache status output shows:

```text
0 2097152000 cache 8 928/65536 512 29/4096 0 0 0 0 - rw writeback 2 migration_threshold 2048 mq 10 random_threshold 4 sequential_threshold 512 discard_promote_adjustment 1 read_promote_adjustment 4 write_promote_adjustment 8
```

Key fields:
- `928/65536`: 928 of 65536 cache blocks are used
- `29/4096`: 29 of 4096 metadata blocks used
- `writeback`: Current cache mode

## Monitoring Cache Hit Rate

```bash
# Watch cache statistics in real time
watch -n 2 'sudo lvs -o +cache_read_hits,cache_read_misses,cache_write_hits,cache_write_misses vg-data/lv-data'
```

After the cache warms up (frequently accessed data is populated), you should see read hits increasing. A good hit rate for typical workloads is 70-90%.

## Changing Cache Mode

The default mode is writeback. To change to writethrough for better data safety:

```bash
# Switch to writethrough mode
sudo lvchange --cachemode writethrough vg-data/lv-data

# Verify the mode changed
sudo lvs --all -o+cache_mode vg-data/lv-data
```

## Adjusting Cache Policy

The default cache policy is `smq` (stochastic multiqueue). You can also use `mq` or `cleaner` (which cleans the cache by writing dirty blocks back to the origin):

```bash
# Change cache policy
sudo lvchange --cachepolicy mq vg-data/lv-data

# Set policy parameters (varies by policy)
sudo lvchange --cachesettings "migration_threshold=2048" vg-data/lv-data
```

## Benchmarking Before and After

Measure the performance impact:

```bash
# Install fio for testing
sudo apt install -y fio

# Test sequential read speed (unmount the filesystem first for accurate results)
sudo fio --name=seq-read \
  --filename=/dev/vg-data/lv-data \
  --rw=read \
  --bs=1M \
  --size=10G \
  --numjobs=1 \
  --time_based \
  --runtime=30 \
  --ioengine=libaio \
  --direct=1 \
  --group_reporting

# Test random read speed (this is where caching helps most)
sudo fio --name=rand-read \
  --filename=/dev/vg-data/lv-data \
  --rw=randread \
  --bs=4K \
  --size=10G \
  --numjobs=4 \
  --time_based \
  --runtime=30 \
  --ioengine=libaio \
  --direct=1 \
  --group_reporting
```

Run these tests before adding the cache (against the origin volume directly) and after to measure improvement.

## Removing the Cache

If you need to remove the cache pool (for example, to repurpose the SSD):

```bash
# First, flush the cache (write all dirty blocks to HDD)
# In writethrough mode, this is instant since writes are synchronous
# In writeback mode, this may take time

# Detach the cache pool - this flushes and removes it
sudo lvconvert --uncache vg-data/lv-data

# After uncaching, lv-data is backed by HDD only again
sudo lvs vg-data

# Remove the now-standalone cache LVs
sudo lvremove vg-data/lv-cache
sudo lvremove vg-data/lv-cache-meta

# Remove the SSD from the volume group (if desired)
sudo vgreduce vg-data /dev/sdc
sudo pvremove /dev/sdc
```

## Tips for Optimal Performance

**Cache block size**: The default 64KB block size works for most workloads. For workloads with smaller I/O patterns (databases with 4KB/8KB pages), a smaller block size may improve hit rate, but can only be set at cache creation:

```bash
# Set custom block size during cache pool creation (before converting)
sudo lvcreate --name lv-cache \
  --size 200G \
  --chunksize 32k \
  vg-data /dev/sdc
```

**Choose writeback carefully**: Writeback mode improves write performance but data written to the cache and not yet flushed to the HDD could be lost if the SSD fails or power is cut suddenly. For databases or other applications where data durability matters, use writethrough.

**Monitor SSD wear**: SSD endurance is finite. Monitor write amplification and SSD wear indicators using:

```bash
sudo apt install -y smartmontools
sudo smartctl -A /dev/sdc | grep -E "Wear|Written|Host"
```

lvmcache is an effective and straightforward way to improve I/O performance on Ubuntu servers with mixed storage. The transparent nature of the caching means existing filesystems and applications benefit without any changes.
