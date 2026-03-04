# How to Tune VDO Memory and CPU Usage for Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Performance Tuning, Memory, Storage, Linux

Description: Learn how to tune VDO memory allocation and CPU usage on RHEL for optimal deduplication and compression performance based on your workload requirements.

---

VDO uses memory for its deduplication index (UDS index) and block map cache. Proper tuning ensures you get good deduplication rates without consuming too much system memory. The default settings work for many cases, but large volumes or high-throughput workloads benefit from tuning.

## Understanding VDO Memory Components

VDO memory usage has two main parts:
- **UDS index**: Stores deduplication fingerprints (the largest consumer)
- **Block map cache**: Caches logical-to-physical block mappings

## Checking Current Memory Usage

```bash
# View current VDO configuration
sudo vdo status --name=vdo0 | grep -E "index|memory|thread"

# Check actual memory consumption
sudo vdostats --verbose /dev/mapper/vdo0 | grep "memory"
```

## Tuning the UDS Index

The index memory setting controls how many blocks VDO can track for deduplication:

```bash
# Create a VDO volume with a sparse index and more memory
# The indexMem parameter is in gigabytes
sudo vdo create --name=vdo-tuned \
  --device=/dev/sdb \
  --vdoLogicalSize=1T \
  --indexMem=1 \
  --sparseIndex=enabled \
  --vdoSlabSize=2G

# Dense index: better dedup for smaller datasets, uses more memory per TB
# Sparse index: good dedup for large datasets, uses less memory per TB
```

Memory guidelines for the UDS index:
- Dense index: ~1 GB per 1 TB of physical storage
- Sparse index: ~1 GB per 10 TB of physical storage

## Tuning Thread Counts

VDO uses multiple threads for different operations. Adjust them based on your CPU count:

```bash
# Create VDO with tuned thread counts for high-throughput workloads
sudo vdo create --name=vdo-highperf \
  --device=/dev/sdc \
  --vdoLogicalSize=500G \
  --vdoAckThreads=2 \
  --vdoBioThreads=4 \
  --vdoCpuThreads=4 \
  --vdoHashZoneThreads=2 \
  --vdoLogicalThreads=2 \
  --vdoPhysicalThreads=2
```

## Tuning the Block Map Cache

```bash
# Increase block map cache for workloads with high random I/O
sudo vdo create --name=vdo-cached \
  --device=/dev/sdd \
  --vdoLogicalSize=500G \
  --blockMapCacheSize=256M
```

## Monitoring Performance After Tuning

```bash
# Monitor I/O latency on the VDO device
iostat -x /dev/mapper/vdo-tuned 5

# Watch CPU usage of VDO kernel threads
top -p $(pgrep -d, -f kvdo)

# Check deduplication efficiency
sudo vdostats --verbose /dev/mapper/vdo-tuned | grep -E "dedupe|compress"
```

Start with defaults and only tune if you observe high latency, low deduplication rates, or excessive memory usage. Increasing thread counts on systems with few CPU cores can actually hurt performance, so match thread counts to your available cores.
