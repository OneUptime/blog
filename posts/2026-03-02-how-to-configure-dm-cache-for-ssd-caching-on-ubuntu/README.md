# How to Configure dm-cache for SSD Caching on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, LVM, SSD, Performance

Description: Set up dm-cache on Ubuntu to use an SSD as a cache for a slower spinning disk, improving read and write performance using LVM cache logical volumes.

---

dm-cache is a Linux kernel device mapper target that places a fast SSD in front of a slower storage device (typically a spinning disk) to cache frequently accessed data. Hot data lives on the SSD; cold data stays on the HDD. This gives you the capacity of a large spinning disk with performance approaching SSD speeds for frequently accessed files.

dm-cache integrates with LVM through the `lvmcache` functionality, making it manageable through standard LVM commands.

## How dm-cache Works

A dm-cache setup involves three components:

1. **Origin device:** The slow storage device (HDD) holding the actual data
2. **Cache device:** The fast storage device (SSD) that holds cached blocks
3. **Cache metadata device:** Stores the metadata mapping which SSD blocks correspond to which HDD blocks

When a read request comes in, dm-cache checks if the block is in the SSD cache. If it is (cache hit), the data comes from the SSD. If not (cache miss), it reads from the HDD and optionally copies the block to the SSD for future requests.

Write policy options:
- **Writethrough:** Writes go to both HDD and SSD simultaneously. Slower writes, but no data loss if the SSD fails
- **Writeback:** Writes go to SSD first, then to HDD in background. Faster writes, but data may be lost if SSD fails before it is flushed

## Setting Up dm-cache with LVM

### Identify Your Devices

```bash
# List all block devices
lsblk -o NAME,SIZE,TYPE,ROTA,MODEL
# ROTA=1 means spinning disk, ROTA=0 means SSD

# Example output:
# sda  2TB  disk  1  WD Blue 2TB HDD    <- origin
# sdb  500GB disk 0  Samsung 870 SSD    <- cache

# Verify device paths
sudo hdparm -I /dev/sda | grep "Nominal Media Rotation Rate"
sudo hdparm -I /dev/sdb | grep "Nominal Media Rotation Rate"
```

### Create the Volume Group

If the devices are not yet in a volume group, create one:

```bash
# Initialize physical volumes
sudo pvcreate /dev/sda
sudo pvcreate /dev/sdb

# Create a volume group containing both devices
sudo vgcreate data_vg /dev/sda /dev/sdb

# Verify
sudo pvs
sudo vgs
```

### Create the Origin Logical Volume (HDD)

```bash
# Create the main data LV on the HDD
# Use -l to specify extents or -L for size
# Constrain it to the HDD device using --alloc
sudo lvcreate -n data_lv -L 1.8T data_vg /dev/sda

# Verify
sudo lvs data_vg
```

### Create the Cache Pool

The cache pool is created on the SSD. It needs two components: the cache data LV and the cache metadata LV. LVM can create them together with `lvconvert`:

```bash
# Create a cache data LV on the SSD
# Leave some SSD space for other uses if needed
sudo lvcreate -n cache_lv -L 400G data_vg /dev/sdb

# Create a metadata LV on the SSD
# Metadata needs about 8MB per 1GB of cache, plus some headroom
# 400GB cache = ~3200MB metadata, round up to 4GB
sudo lvcreate -n cache_meta_lv -L 4G data_vg /dev/sdb

# Convert the two LVs into a cache pool
sudo lvconvert --type cache-pool \
    --cachemode writethrough \
    --poolmetadata data_vg/cache_meta_lv \
    data_vg/cache_lv

# Verify the cache pool was created
sudo lvs -a data_vg
```

### Attach the Cache Pool to the Origin LV

```bash
# Attach the cache pool to the data LV
sudo lvconvert --type cache \
    --cachepool data_vg/cache_lv \
    data_vg/data_lv

# Verify - the data_lv now shows as type "cache"
sudo lvs -a data_vg
```

### Format and Mount

```bash
# Create a filesystem on the cached LV
sudo mkfs.ext4 /dev/data_vg/data_lv

# Create mount point
sudo mkdir -p /srv/data

# Mount it
sudo mount /dev/data_vg/data_lv /srv/data

# Add to fstab for persistent mounting
echo "/dev/data_vg/data_lv  /srv/data  ext4  defaults  0  2" | sudo tee -a /etc/fstab
```

## Monitoring Cache Performance

```bash
# Show cache statistics
sudo lvs -o +cache_read_hits,cache_read_misses,cache_write_hits,cache_write_misses data_vg/data_lv

# Extended stats with percentages
sudo lvdisplay data_vg/data_lv | grep -A 20 "Cache"

# Continuous monitoring (refresh every 5 seconds)
watch -n 5 'sudo lvs -o name,cache_read_hits,cache_read_misses,cache_write_hits,cache_write_misses data_vg'
```

The output shows hit/miss ratios. A high read hit ratio (>70%) indicates the cache is effective for your workload. Low hit ratios suggest the cache is too small or the workload accesses data too randomly to benefit from caching.

## Calculating Hit Ratio

```bash
# Script to calculate and display cache hit ratio
sudo lvs -o name,cache_read_hits,cache_read_misses,cache_write_hits,cache_write_misses \
    --units b --nosuffix --noheadings data_vg/data_lv | \
    awk '{
        hits=$2; misses=$3; whits=$4; wmisses=$5;
        total_reads=hits+misses;
        total_writes=whits+wmisses;
        if(total_reads>0) read_ratio=hits/total_reads*100; else read_ratio=0;
        if(total_writes>0) write_ratio=whits/total_writes*100; else write_ratio=0;
        printf "Read hit ratio: %.1f%% (%d/%d)\n", read_ratio, hits, total_reads;
        printf "Write hit ratio: %.1f%% (%d/%d)\n", write_ratio, whits, total_writes;
    }'
```

## Changing the Cache Mode

Switch between writethrough and writeback:

```bash
# Switch to writeback mode (better write performance, some risk)
sudo lvchange --cachemode writeback data_vg/data_lv

# Switch back to writethrough (safer)
sudo lvchange --cachemode writethrough data_vg/data_lv

# Verify
sudo lvs -o name,cache_mode data_vg/data_lv
```

**Note:** Switching from writeback to writethrough flushes dirty cache blocks to the HDD first. This may take time.

## Resizing the Cache

Add more SSD space to the cache pool if the hit ratio is low:

```bash
# Extend the cache pool (must have free space on the SSD)
sudo lvresize -L +100G data_vg/cache_lv

# If no free space, add another PV
sudo pvcreate /dev/sdc
sudo vgextend data_vg /dev/sdc
sudo lvresize -L +100G --alloc cling data_vg/cache_lv
```

## Removing the Cache

To detach the cache from the origin volume (keeping data intact on the HDD):

```bash
# Flush the cache to HDD first (important for writeback mode)
# Then detach the cache
sudo lvconvert --uncache data_vg/data_lv

# This removes the cache pool and leaves data_lv as a plain LV on the HDD
sudo lvs data_vg
```

## Alternative: LVM Thin Provisioning with Cache

A more flexible setup uses thin provisioning with a cache:

```bash
# Create a thin pool on the HDD
sudo lvcreate --type thin-pool -n thin_pool -L 1.5T data_vg /dev/sda

# Create a thin LV from the pool
sudo lvcreate --type thin -n thin_lv --thinpool thin_pool -V 1.5T data_vg

# Create cache pool on SSD and attach to thin pool
sudo lvcreate -n cache_lv -L 350G data_vg /dev/sdb
sudo lvcreate -n cache_meta -L 4G data_vg /dev/sdb
sudo lvconvert --type cache-pool --poolmetadata data_vg/cache_meta data_vg/cache_lv
sudo lvconvert --type cache --cachepool data_vg/cache_lv data_vg/thin_pool
```

## Troubleshooting

**Poor cache performance:** Check that blocks are actually being cached. A completely cold cache shows all misses initially. Give it time to warm up. If the working set exceeds cache size, performance will be poor.

**Cache full quickly:** Monitor with `sudo lvdisplay data_vg/data_lv | grep "Cache usage"`. If cache fills to 100%, consider increasing its size or using smc (sequential IO bypass) to skip caching large sequential reads.

**System cannot boot after configuration:** If the LV is in the root filesystem, ensure initramfs is configured for LVM caching. Run `sudo update-initramfs -u` after configuration changes.

**Performance worse than expected:** Check for SSD write amplification. In writeback mode, the SSD handles many small writes. Ensure the SSD has good random write performance. Check `iostat -xd 1` during workload.

```bash
# Check iostat for both devices
sudo apt install sysstat -y
iostat -xd 1 sda sdb
```

dm-cache is most effective for workloads with a hot dataset smaller than the SSD capacity - database servers, frequently accessed file shares, and virtual machine storage are good candidates.
