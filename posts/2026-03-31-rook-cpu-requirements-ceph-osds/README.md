# How to Plan CPU Requirements for Ceph OSDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CPU, Hardware, OSD, Performance, Capacity Planning

Description: Plan CPU requirements for Ceph OSD nodes by understanding workload patterns, media type differences, and how BlueStore's CPU usage scales with OSD count and I/O load.

---

## Overview

CPU planning for Ceph OSDs depends heavily on media type, workload pattern, and whether you use BlueStore compression or encryption. Underprovisioning CPU leads to OSD slowdowns and latency spikes, especially during recovery operations.

## CPU Consumption by OSD Type

| Media Type | CPU per OSD (idle) | CPU per OSD (load) |
|------------|-------------------|-------------------|
| 7200 RPM HDD | 0.1 core | 0.5-1 core |
| SATA SSD | 0.5 core | 2 cores |
| NVMe SSD | 1-2 cores | 4-8 cores |

## BlueStore CPU Factors

BlueStore (default Ceph storage engine) uses CPU for:
- RocksDB compaction (WAL/DB metadata)
- CRC32c checksums on all I/O
- Optional inline compression
- Optional at-rest encryption

## Step 1 - Baseline CPU Calculation

```bash
# For a node with 12 SATA HDDs
HDD_CPU=$((12 * 1))  # 1 core per HDD at load

# Add BlueStore overhead (~20% extra)
BLUESTORE_OVERHEAD=$(echo "$HDD_CPU * 0.2" | bc)

# Add system overhead
SYSTEM_OVERHEAD=4

echo "OSD CPU: ${HDD_CPU} cores"
echo "BlueStore overhead: ${BLUESTORE_OVERHEAD} cores"
echo "System overhead: ${SYSTEM_OVERHEAD} cores"
```

## Step 2 - Recovery CPU Budget

During OSD recovery, CPU usage can spike significantly:

```bash
# Check max backfill threads
ceph config get osd osd_max_backfills
# Default: 1

# Check recovery max active (device-type aware, since Octopus)
ceph config get osd osd_recovery_max_active_hdd
# Default: 3
ceph config get osd osd_recovery_max_active_ssd
# Default: 10
```

Budget for recovery to run simultaneously with normal I/O:

```text
Recovery adds ~50% CPU overhead during active recovery
Total CPU = (Normal load CPU) x 1.5
```

## Step 3 - Compression CPU Overhead

If you enable inline compression:

```bash
# Check compression mode
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config get osd bluestore_compression_mode
```

Compression adds roughly:
- snappy: 0.3 core per OSD
- zlib: 1 core per OSD (much more CPU-intensive)
- zstd: 0.7 core per OSD

## Step 4 - Encryption CPU Overhead

Hardware AES-NI eliminates most encryption CPU overhead:

```bash
# Verify AES-NI support on OSD nodes
grep -m1 aes /proc/cpuinfo

# With AES-NI: ~5-10% overhead
# Without AES-NI: ~50-100% overhead
```

## Step 5 - Practical CPU Recommendations

For a 12-disk HDD node:

```yaml
recommended_cpu:
  physical_cores: 12
  hyperthreading: enabled
  logical_cpus: 24

breakdown:
  osd_normal_io: 6 cores
  recovery_burst: 6 cores
  monitors_mgr: 4 cores
  os_system: 4 cores
  headroom: 4 cores
```

For a 4-NVMe node:

```yaml
recommended_cpu:
  physical_cores: 24
  hyperthreading: enabled
  logical_cpus: 48

breakdown:
  osd_normal_io: 16 cores (4 NVMe x 4 cores)
  recovery_burst: 16 cores
  monitors_mgr: 4 cores
  os_system: 4 cores
  headroom: 8 cores
```

## Step 6 - Monitor CPU Utilization

Check OSD latency (high latency can indicate CPU bottlenecks):

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd perf | sort -k2 -n -r | head -10
```

Check per-OSD CPU usage from the host:

```bash
top -b -n1 | grep ceph-osd | awk '{print $1, $9, $11}' | sort -k2 -rn
```

## Step 7 - Tune CPU Usage

Limit recovery to preserve foreground I/O performance:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_max_active_hdd 3
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_max_active_ssd 10
```

## Summary

CPU planning for Ceph OSDs requires accounting for media type, BlueStore overhead, and recovery bursts. NVMe OSDs demand significantly more CPU per OSD than HDDs due to their higher throughput potential. Always reserve 20-30% headroom beyond baseline calculations to handle recovery operations without impacting client I/O performance.
