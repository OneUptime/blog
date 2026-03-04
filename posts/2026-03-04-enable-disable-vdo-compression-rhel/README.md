# How to Enable and Disable VDO Compression on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Compression, Storage, Performance, Linux

Description: Learn how to enable and disable VDO compression on RHEL to balance between storage savings and write performance depending on your workload characteristics.

---

VDO on RHEL provides both deduplication and compression. While deduplication is almost always beneficial, compression adds CPU overhead during writes. For workloads where data is already compressed (videos, compressed archives), you may want to disable compression to save CPU cycles.

## Checking Current Compression Status

```bash
# Check if compression is enabled on a VDO volume
sudo vdo status --name=vdo0 | grep "Compression"
# Output: Compression: enabled

# Alternative: use the dmsetup approach
sudo dmsetup status vdo0
```

## Disabling Compression

```bash
# Disable compression on a running VDO volume
sudo vdo disableCompression --name=vdo0

# Verify the change
sudo vdo status --name=vdo0 | grep "Compression"
# Output: Compression: disabled
```

This takes effect for new writes immediately. Data that was already compressed on disk remains compressed until it is overwritten.

## Enabling Compression

```bash
# Enable compression on a VDO volume
sudo vdo enableCompression --name=vdo0

# Verify
sudo vdo status --name=vdo0 | grep "Compression"
# Output: Compression: enabled
```

## When to Disable Compression

Disable compression in these scenarios:

```bash
# Check space savings to determine if compression is helping
sudo vdostats --verbose /dev/mapper/vdo0 | grep "saving percent"

# If space savings are minimal (under 5%), compression overhead
# may not be worth the CPU cost
```

Common cases where disabling helps:
- Media files (JPEG, MP4, MP3) that are already compressed
- Encrypted data that appears random and does not compress
- Write-heavy workloads where CPU latency matters more than space

## Measuring the Performance Impact

```bash
# Benchmark with compression enabled
sudo fio --name=write-test --ioengine=libaio --iodepth=16 \
  --rw=write --bs=4k --size=1G --numjobs=1 \
  --filename=/mnt/vdo-mount/testfile --direct=1

# Disable compression and re-run
sudo vdo disableCompression --name=vdo0

sudo fio --name=write-test --ioengine=libaio --iodepth=16 \
  --rw=write --bs=4k --size=1G --numjobs=1 \
  --filename=/mnt/vdo-mount/testfile --direct=1

# Compare the IOPS and latency between runs
```

## Creating a VDO Volume Without Compression

```bash
# You can also create a VDO volume with compression disabled from the start
sudo vdo create --name=vdo-nocomp --device=/dev/sdc \
  --vdoLogicalSize=500G --compression=disabled
```

The decision to enable or disable compression should be driven by actual measurements on your workload. Deduplication alone often provides significant space savings with lower CPU cost than compression.
