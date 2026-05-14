# How to Tune VDO Memory and CPU Usage for Performance on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Performance Tuning, Storage, Linux

Description: Learn how to tune VDO memory allocation, CPU thread counts, and block map cache settings on RHEL 9 to optimize performance for your specific workload and hardware.

---

VDO's deduplication and compression features consume memory and CPU resources. Tuning these resources properly ensures that VDO delivers optimal performance without starving other applications. This guide covers the key tuning parameters and how to adjust them on RHEL 9.

## Prerequisites

- A RHEL 9 system with root or sudo access
- Existing LVM-VDO volumes
- Understanding of your workload requirements
- The `lvm2` and `kmod-kvdo` packages installed

## Understanding VDO Resource Usage

VDO uses resources for three main subsystems:

1. **UDS Index**: The deduplication index that tracks block fingerprints. This is the largest memory consumer.
2. **Block Map**: Maps virtual block addresses to physical block addresses. Cached in memory.
3. **Processing Threads**: Handle I/O, hashing, compression, and other operations.

## Step 1: Check Current Resource Configuration

```bash
sudo lvs -o name,vdo_index_state,vdo_compression_state,vdo_operating_mode vg_vdo
```

For detailed settings:

```bash
sudo lvs --all -o +vdo_block_map_cache_size,vdo_index_memory_size vg_vdo
```

## Step 2: Choose UDS Index Memory

The UDS index stores fingerprints of all data blocks for deduplication lookup. Index type and index memory are set when the LVM-VDO volume is created and cannot be changed later.

### Dense Index (Default)

Uses approximately 1 GB of memory per 1 TB deduplication window:

```bash
sudo lvcreate --type vdo --name lv_vdo --size 1T --virtualsize 2T \
  --vdosettings 'vdo_index_memory_size_mb=1024' vg_vdo
```

The value is in mebibytes. For a 2 TB deduplication window, 2048 MB is appropriate.

### Sparse Index

Uses approximately 1 GB per 10 TB deduplication window:

```bash
sudo lvcreate --type vdo --name lv_sparse --size 500G --virtualsize 2T \
  --vdosettings 'vdo_use_sparse_index=1 vdo_index_memory_size_mb=256' vg_vdo
```

The sparse index uses less memory but relies on data locality for effective deduplication. It works best when duplicate data arrives in temporal proximity.

### Choosing Between Dense and Sparse

| Factor | Dense Index | Sparse Index |
|--------|------------|--------------|
| Memory per deduplication window | ~1 GB per 1 TB | ~1 GB per 10 TB |
| Deduplication accuracy | Very high | Good (locality dependent) |
| Best for | General workloads | Very large volumes |
| Physical size limit | Depends on RAM | Supports multi-TB with low RAM |

## Step 3: Tune Block Map Cache

The block map cache stores virtual-to-physical address mappings in memory. A larger cache improves random I/O performance.

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'block_map_cache_size_mb=256' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

Default is 128 MB. The cache size must be at least 128 MB, a multiple of 4096, and at least 16 MB per logical thread. Recommendations:

| Workload | Cache Size |
|----------|-----------|
| Sequential I/O | 128 MB (default) |
| Mixed workload | 256 MB |
| Heavy random I/O | 512 MB to 1024 MB |
| Database | 512 MB to 2048 MB |

More cache reduces the need to read block map pages from disk, improving random read and write performance.

## Step 4: Tune Thread Counts

VDO uses several types of threads for processing:

Deactivate the LVM-VDO volume before changing thread counts, and activate it again after the change.

### Bio Threads

Handle incoming and outgoing block I/O:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'bio_threads=4' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

Default is 4. Increase for high-throughput workloads. Maximum is limited by available CPU cores.

### CPU Threads

Handle hashing and compression:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'cpu_threads=4' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

Default is 2. Increase if you have available CPU cores and compression is enabled.

### Hash Zone Threads

Handle deduplication index lookups:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'hash_zone_threads=2' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

Default is 1. A single hash zone thread is usually sufficient; increase only if benchmarking shows it is a bottleneck.

### Logical Threads

Handle logical block address mapping:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'logical_threads=2' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

### Physical Threads

Handle physical block allocation:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'physical_threads=2' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

### Combined Thread Tuning

Set multiple thread parameters at once:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'bio_threads=4 cpu_threads=4 hash_zone_threads=2 logical_threads=2 physical_threads=2' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

## Step 5: Tune Write Policy

The write policy affects both performance and data safety:

### Synchronous Mode

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'write_policy=sync' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

Data is confirmed written only after it reaches persistent storage. Safest but slowest.

### Asynchronous Mode

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'write_policy=async' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

Writes are acknowledged before reaching persistent storage. Faster but risks data loss on power failure. Suitable for:
- Development/test environments
- Data that can be regenerated
- Systems with battery-backed storage controllers

### Auto Mode

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'write_policy=auto' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

Auto is the default. VDO automatically chooses based on the underlying device's flush support.

## Step 6: Benchmark After Tuning

Test the impact of your changes:

```bash
sudo dnf install fio -y

# Sequential write throughput

sudo fio --name=seq_write --directory=/vdo-data --rw=write --bs=1M \
  --size=4G --numjobs=1 --runtime=60 --time_based --group_reporting

# Random 4K read IOPS
sudo fio --name=rand_read --directory=/vdo-data --rw=randread --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting

# Random 4K write IOPS
sudo fio --name=rand_write --directory=/vdo-data --rw=randwrite --bs=4K \
  --size=2G --numjobs=4 --runtime=60 --time_based --group_reporting
```

## Step 7: Monitor Resource Usage

### Memory Usage

```bash
# Total system memory
free -h

# VDO-specific memory (approximate)
sudo vdostats --verbose /dev/mapper/vg_vdo-vpool | grep -i "memory"
```

### CPU Usage

Monitor during I/O operations:

```bash
top -H
```

Or use:

```bash
sudo pidstat -C kvdo 1
```

## Tuning Profiles

### High-Throughput Profile

For backup targets and large file storage:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'bio_threads=4 cpu_threads=4 block_map_cache_size_mb=256 write_policy=async' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

### Low-Latency Profile

For database storage:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'bio_threads=2 cpu_threads=2 block_map_cache_size_mb=1024 write_policy=sync' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

### Memory-Constrained Profile

For systems with limited RAM:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'block_map_cache_size_mb=128 bio_threads=1 cpu_threads=1' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

### Maximum Deduplication Profile

For VM storage with maximum deduplication:

```bash
sudo lvchange -an vg_vdo/lv_vdo
sudo lvchange --vdosettings 'block_map_cache_size_mb=512 hash_zone_threads=2' vg_vdo/lv_vdo
sudo lvchange -ay vg_vdo/lv_vdo
```

## Conclusion

Tuning VDO memory and CPU usage on RHEL 9 allows you to balance storage efficiency with system resource consumption and I/O performance. The UDS index memory and block map cache are the most impactful settings for most workloads. Thread counts should be adjusted based on available CPU cores and I/O concurrency requirements. Always benchmark before and after tuning changes to verify that your adjustments produce the desired results.
