# How to Enable and Disable VDO Compression on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Compression, Storage, Linux

Description: Learn how to enable and disable VDO compression on RHEL 9, understand when compression helps or hurts performance, and monitor compression effectiveness.

---

VDO on RHEL 9 provides both deduplication and compression as separate, independently controllable features. While both are enabled by default, there are scenarios where you may want to disable compression to improve performance or reduce CPU usage. This guide covers managing VDO compression settings on RHEL 9.

## Prerequisites

- A RHEL 9 system with root or sudo access
- An existing LVM-VDO volume
- The `lvm2` and `kmod-kvdo` packages installed

## Understanding VDO Compression

VDO compression works after deduplication:

1. A data block arrives
2. VDO checks if the block is a duplicate (deduplication)
3. If the block is unique, VDO attempts to compress it
4. Compressed blocks are packed together into physical blocks
5. If a block does not compress well, it is stored uncompressed

VDO uses the LZ4 compression algorithm, which is designed for:
- Fast compression and decompression speeds
- Reasonable compression ratios
- Low CPU overhead

## Step 1: Check Current Compression Status

```bash
sudo lvs -o name,vdo_compression vg_vdo/lv_vdo
```

Or check the compression state:

```bash
sudo lvs -o name,vdo_compression_state vg_vdo/lv_vdo
```

States:
- **online**: Compression is active
- **offline**: Compression is disabled

## Step 2: Disable Compression

To disable compression on an existing VDO volume:

```bash
sudo lvchange --compression n vg_vdo/lv_vdo
```

Verify:

```bash
sudo lvs -o name,vdo_compression vg_vdo/lv_vdo
```

The change takes effect immediately. Existing compressed data remains compressed, but new data will not be compressed.

## Step 3: Enable Compression

To re-enable compression:

```bash
sudo lvchange --compression y vg_vdo/lv_vdo
```

Verify:

```bash
sudo lvs -o name,vdo_compression vg_vdo/lv_vdo
```

## Step 4: Create a VDO Volume Without Compression

If you know from the start that compression is not needed:

```bash
sudo lvcreate --type vdo --name lv_nocomp --size 100G --virtualsize 200G \
  --compression n vg_vdo
```

## Step 5: Create a VDO Volume Without Deduplication

You can also disable deduplication independently:

```bash
sudo lvcreate --type vdo --name lv_nodedup --size 100G --virtualsize 150G \
  --deduplication n vg_vdo
```

Or disable deduplication on an existing volume:

```bash
sudo lvchange --deduplication n vg_vdo/lv_vdo
```

## When to Disable Compression

### Already Compressed Data

If your data is already compressed (ZIP, GZIP, JPEG, MP4, encrypted), VDO compression adds CPU overhead without reducing size:

```bash
sudo lvchange --compression n vg_vdo/lv_media
```

### CPU-Constrained Systems

On systems where CPU resources are limited and storage I/O is not the bottleneck:

```bash
sudo lvchange --compression n vg_vdo/lv_vdo
```

### Latency-Sensitive Workloads

For workloads that require the lowest possible write latency, disabling compression removes the compression step from the write path.

### Pre-compressed or Encrypted Data

Encrypted data appears random and does not compress. Compression adds overhead with no benefit:

```bash
sudo lvchange --compression n vg_vdo/lv_encrypted_data
```

## When to Keep Compression Enabled

### Text-Heavy Data

Log files, source code, configuration files, and documents compress very well:

- Text files: 3:1 to 5:1 compression
- JSON/XML: 3:1 to 8:1 compression
- Log files: 3:1 to 10:1 compression

### Database Storage

Database files often contain padding and repetitive structures that compress well.

### Virtual Machine Images

VM disk images contain OS files (text configurations, binaries) that compress well, in addition to being deduplicated.

### General-Purpose Storage

When the data mix is varied, keeping compression enabled typically provides net benefit.

## Step 6: Monitor Compression Effectiveness

### Check Savings Breakdown

```bash
sudo vdostats --verbose /dev/mapper/vg_vdo-vpool | grep -i compress
```

Key metrics:
- **compressed fragments written**: Blocks that were compressed
- **compressed blocks in use**: Current compressed block count

### Compare With and Without Compression

To evaluate if compression is beneficial:

1. Record current savings:

```bash
sudo vdostats --human-readable
```

2. Disable compression and write new data:

```bash
sudo lvchange --compression n vg_vdo/lv_vdo
# Write data, then check
sudo vdostats --human-readable
```

3. Re-enable and compare:

```bash
sudo lvchange --compression y vg_vdo/lv_vdo
```

### Benchmark Impact

Test I/O performance with and without compression:

```bash
# With compression
sudo fio --name=write_test --directory=/vdo-data --rw=write --bs=64K \
  --size=2G --numjobs=1 --runtime=30 --time_based --group_reporting

# Disable compression
sudo lvchange --compression n vg_vdo/lv_vdo

# Without compression
sudo fio --name=write_test --directory=/vdo-data --rw=write --bs=64K \
  --size=2G --numjobs=1 --runtime=30 --time_based --group_reporting

# Re-enable
sudo lvchange --compression y vg_vdo/lv_vdo
```

## Configuration Combinations

| Deduplication | Compression | Use Case |
|--------------|-------------|----------|
| On | On | Default, best for most workloads |
| On | Off | Pre-compressed data with duplicates |
| Off | On | Unique but compressible data |
| Off | Off | Maximum performance, no data reduction |

## Conclusion

VDO compression on RHEL 9 is a flexible feature that can be enabled or disabled independently of deduplication. The decision depends on your data type and performance requirements. For most workloads, keeping compression enabled provides worthwhile space savings with minimal CPU overhead thanks to the LZ4 algorithm. However, for already-compressed data, encrypted data, or latency-sensitive workloads, disabling compression eliminates unnecessary overhead. Monitor compression effectiveness with `vdostats` to make data-driven decisions about your configuration.
