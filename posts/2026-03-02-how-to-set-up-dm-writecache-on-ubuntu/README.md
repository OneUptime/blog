# How to Set Up dm-writecache on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, SSD, Performance, LVM

Description: Configure dm-writecache on Ubuntu to use persistent memory or SSD as a write-back cache for block devices, improving write performance with kernel-native technology.

---

dm-writecache is a Linux kernel device mapper target that caches writes on a fast device (SSD or persistent memory) before writing them to a slower backing device. Unlike dm-cache, which handles both read and write caching, dm-writecache is specialized for write acceleration. It is part of the mainline kernel since 4.18, making it available on Ubuntu 20.04 and 22.04 without additional modules.

## When to Use dm-writecache

dm-writecache is best suited for:

- **Write-heavy workloads**: Databases, logging systems, or any workload that writes data frequently in small chunks
- **Environments with persistent memory (NVDIMM/PMEM)**: dm-writecache was designed to take advantage of byte-addressable persistent memory, though it also works with regular SSDs
- **Situations where read caching is already handled**: If your reads are already cached by the page cache or a separate mechanism, dm-writecache focuses acceleration where it is needed

For mixed read/write workloads, dm-cache or lvmcache may be more appropriate since they also accelerate reads.

## dm-writecache vs dm-cache

| Feature | dm-writecache | dm-cache |
|---------|--------------|---------|
| Cache type | Write-only | Read and write |
| Persistent memory support | Optimized | Basic |
| Complexity | Lower | Higher |
| Kernel module | dm-writecache | dm-cache |
| Metadata overhead | Minimal | Moderate |

## Prerequisites

```bash
# Check kernel version (4.18+ required)
uname -r

# Verify dm-writecache module is available
sudo modinfo dm-writecache

# Load the module
sudo modprobe dm-writecache

# Verify it loaded
lsmod | grep dm_writecache

# Make it persistent
echo "dm-writecache" | sudo tee /etc/modules-load.d/dm-writecache.conf
```

## Identifying Your Devices

For this setup:
- `/dev/sda`: 1TB HDD (the backing device to accelerate)
- `/dev/sdb`: 100GB SSD (the write cache device)

```bash
# Check device sizes
lsblk -b /dev/sda /dev/sdb

# Ensure the HDD has the data you want to cache
# Note the exact size in sectors (512-byte sectors)
sudo blockdev --getsz /dev/sda
```

## Setting Up dm-writecache with dmsetup

dm-writecache is configured using the `dmsetup` command. The device mapper target requires the origin device size in 512-byte sectors.

### Getting the Device Size

```bash
# Get the size of the origin device in 512-byte sectors
ORIGIN_SIZE=$(sudo blockdev --getsz /dev/sda)
echo "Origin size: $ORIGIN_SIZE sectors"
```

### Creating the dm-writecache Device

```bash
# Create a dm-writecache device
# Format: <start> <length> writecache <s|p> <dev> <cacheDev> <blockSize> [#features <features>]
# s = SATA/NVMe SSD, p = Persistent memory (pmem)

sudo dmsetup create wc-data \
  --table "0 $ORIGIN_SIZE writecache s /dev/sda /dev/sdb 4096 0"
```

Parameter explanation:
- `0`: Start sector (always 0 for the whole device)
- `$ORIGIN_SIZE`: Number of sectors to map
- `writecache`: Device mapper target type
- `s`: Cache type (`s` for SSD, `p` for persistent memory)
- `/dev/sda`: Origin (backing) device
- `/dev/sdb`: Cache device
- `4096`: Write cache block size in bytes (must match filesystem block size)
- `0`: Number of optional feature arguments (0 = none)

The new device appears at `/dev/mapper/wc-data`.

### Optional Features

dm-writecache supports several optional features:

```bash
# Common optional features:
# high_watermark N - flush cache when N% full (default 50)
# low_watermark N  - stop flushing when N% full (default 45)
# writeback_jobs N - maximum concurrent writeback I/Os

sudo dmsetup create wc-data \
  --table "0 $ORIGIN_SIZE writecache s /dev/sda /dev/sdb 4096 4 high_watermark 80 low_watermark 60 writeback_jobs 64"
```

## Using dm-writecache with LVM

A cleaner approach is to integrate dm-writecache into an LVM setup. This is the recommended method for persistent configurations.

### Setting Up LVM

```bash
# Create physical volumes
sudo pvcreate /dev/sda /dev/sdb

# Create a volume group containing both devices
sudo vgcreate vg-storage /dev/sda /dev/sdb

# Create the origin logical volume on the HDD
sudo lvcreate --name lv-data \
  --size 900G \
  vg-storage /dev/sda

# Create the cache volume on the SSD
sudo lvcreate --name lv-wc \
  --size 80G \
  vg-storage /dev/sdb
```

### Creating the dm-writecache Device via LVM

```bash
# Convert the logical volume to use dm-writecache
sudo lvconvert --type writecache \
  --cachevol vg-storage/lv-wc \
  vg-storage/lv-data

# Verify the configuration
sudo lvs -o name,attr,devices vg-storage

# Check writecache status
sudo lvdisplay vg-storage/lv-data
```

## Creating a Filesystem on the dm-writecache Device

If using the raw dmsetup approach:

```bash
# Format the dm-writecache device with ext4
sudo mkfs.ext4 /dev/mapper/wc-data

# Mount it
sudo mkdir -p /mnt/cached-data
sudo mount /dev/mapper/wc-data /mnt/cached-data

# Verify
df -h /mnt/cached-data
```

For LVM-based setup:

```bash
# Format the logical volume (which now uses writecache)
sudo mkfs.ext4 /dev/vg-storage/lv-data

# Mount it
sudo mount /dev/vg-storage/lv-data /mnt/cached-data
```

## Monitoring dm-writecache Status

```bash
# Check dm-writecache status via dmsetup
sudo dmsetup status wc-data

# Or for LVM setup
sudo dmsetup status vg--storage-lv--data
```

The status output shows:

```
0 1879048192 writecache stats: reads=1234 read_cache_hits=0 writes=5678 write_cache_hits=0 committed_blocks=0
  total_blocks=20480 free_blocks=20480 uncommitted_blocks=0
```

Key fields:
- `committed_blocks`: Blocks written to the SSD cache waiting to be flushed to HDD
- `free_blocks`: Available cache blocks
- `write_cache_hits`: Writes served from cache (overwrites of cached data)

```bash
# Monitor continuously
watch -n 1 'sudo dmsetup status wc-data'
```

## Performance Testing

```bash
# Install fio for benchmarking
sudo apt install -y fio

# Test random write IOPS (primary use case for dm-writecache)
sudo fio --name=random-write \
  --filename=/mnt/cached-data/testfile \
  --size=10G \
  --rw=randwrite \
  --bs=4k \
  --numjobs=4 \
  --iodepth=32 \
  --time_based \
  --runtime=60 \
  --ioengine=libaio \
  --group_reporting

# Test sequential write
sudo fio --name=seq-write \
  --filename=/mnt/cached-data/testfile \
  --size=10G \
  --rw=write \
  --bs=1M \
  --numjobs=1 \
  --time_based \
  --runtime=30 \
  --ioengine=libaio \
  --group_reporting
```

Compare these results against the same tests run directly on `/dev/sda` to measure the caching benefit.

## Making the Configuration Persistent

For the raw dmsetup approach, create a systemd service:

```bash
sudo nano /etc/systemd/system/dm-writecache-data.service
```

```ini
[Unit]
Description=dm-writecache for data volume
DefaultDependencies=no
After=dev-sda.device dev-sdb.device
Before=local-fs.target

[Service]
Type=oneshot
RemainAfterExit=yes

# Get origin device size
ExecStartPre=/bin/bash -c 'echo $(blockdev --getsz /dev/sda) > /run/origin-size'

# Create the dm-writecache device
ExecStart=/bin/bash -c 'dmsetup create wc-data --table "0 $(cat /run/origin-size) writecache s /dev/sda /dev/sdb 4096 0"'

ExecStop=/sbin/dmsetup remove wc-data

[Install]
WantedBy=local-fs.target
```

```bash
sudo systemctl enable dm-writecache-data
```

Add to `/etc/fstab` for automatic mounting:

```bash
# Get the UUID of the dm-writecache device
sudo blkid /dev/mapper/wc-data

# Add to /etc/fstab
echo "UUID=your-uuid-here /mnt/cached-data ext4 defaults,noatime 0 2" | \
  sudo tee -a /etc/fstab
```

## Removing dm-writecache

```bash
# Unmount first
sudo umount /mnt/cached-data

# Flush all dirty writes from the cache to the backing device
# Then remove the device
sudo dmsetup suspend wc-data
sudo dmsetup resume wc-data --table "0 $ORIGIN_SIZE writecache s /dev/sda /dev/sdb 4096 1 cleaner"

# Wait for the cache to clean (dirty blocks = 0)
sudo dmsetup status wc-data

# Remove the device
sudo dmsetup remove wc-data
```

For LVM setup:

```bash
# Detach the writecache volume
sudo lvconvert --uncache vg-storage/lv-data
```

## Tuning Considerations

**Block size alignment**: The dm-writecache block size should match the filesystem block size (4096 bytes for ext4). Mismatched block sizes can reduce efficiency.

**Cache device wear**: In write-back mode, the SSD receives all writes initially. Monitor SSD health:

```bash
sudo apt install -y smartmontools
sudo smartctl -A /dev/sdb | grep -E "Media_Wearout|Total_LBAs_Written"
```

**Cache sizing**: The cache does not need to be large. Since dm-writecache only caches writes before flushing to disk, a few GB is often sufficient for most workloads. Size based on your typical write burst volume, not total data size.

dm-writecache is a clean, kernel-native solution for write acceleration. Its lower complexity compared to dm-cache makes it easier to reason about and troubleshoot, while its persistent memory support makes it the right choice if you ever add NVDIMM storage to your Ubuntu server.
