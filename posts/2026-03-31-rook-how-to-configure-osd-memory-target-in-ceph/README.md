# How to Configure OSD Memory Target in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Memory, Performance Tuning

Description: Configure Ceph OSD memory targets to control BlueStore cache usage, prevent OOM kills, and optimize performance for your available hardware resources.

---

## Why OSD Memory Configuration Matters

Each Ceph OSD process uses memory primarily for the BlueStore cache, which caches frequently accessed data and metadata. By default, each OSD targets 4 GiB of memory. On dense OSD nodes with many drives, the total memory consumed can easily exceed available RAM, causing OOM kills and instability.

Proper memory configuration prevents OOM events while keeping enough cache for good I/O performance.

## The osd_memory_target Parameter

The primary configuration knob is `osd_memory_target`, which tells BlueStore how much RAM the OSD should try to use:

```bash
# View current value (default 4 GiB = 4294967296 bytes)
ceph config get osd osd_memory_target
```

BlueStore dynamically adjusts its caches to stay within this target. Setting it too low reduces cache effectiveness; too high risks OOM.

## Calculating the Right Memory Target

A general formula for setting per-OSD memory:

```text
per_osd_memory = (total_node_RAM - os_overhead) / osds_per_node

Example:
  Node RAM: 128 GiB
  OS overhead: 8 GiB
  OSDs per node: 24
  Per-OSD target: (128 - 8) / 24 = 5 GiB
```

## Setting the Memory Target Globally

Apply to all OSDs in the cluster:

```bash
# Set 4 GiB (default)
ceph config set osd osd_memory_target 4294967296

# Set 2 GiB (memory-constrained nodes)
ceph config set osd osd_memory_target 2147483648

# Set 8 GiB (performance-optimized nodes)
ceph config set osd osd_memory_target 8589934592
```

Changes take effect without restarting OSDs - BlueStore adjusts caches dynamically.

## Setting Memory Target per Host

For heterogeneous nodes with different RAM amounts:

```bash
# Set lower limit for high-density nodes
ceph config set osd.5 osd_memory_target 2147483648
ceph config set osd.6 osd_memory_target 2147483648

# Or target a specific host
ceph config set "osd/host:dense-node1" osd_memory_target 2147483648
```

## Enabling Automatic Memory Management

Ceph can automatically scale OSD memory usage based on system available memory:

```bash
# Enable automatic memory target management
ceph config set osd osd_memory_target_autotune true

# Set the fraction of system memory for autotune (cephadm deployments)
ceph config set mgr mgr/cephadm/autotune_memory_target_ratio 0.7
```

With autotune enabled, each OSD dynamically adjusts its memory usage based on system memory availability. In cephadm-managed clusters, the `autotune_memory_target_ratio` (default 0.7) controls what fraction of total system memory is allocated across OSDs.

## BlueStore Cache Components

The OSD memory is split among several BlueStore caches:

```bash
# View BlueStore cache allocations
ceph daemon osd.0 perf dump | grep bluestore_cache

# Key metrics:
# bluestore_cache_bytes           - total bytes in cache
# bluestore_cache_hits_*          - cache hit rates
# bluestore_cache_misses_*        - cache misses
```

Individual cache ratios can be tuned:

```bash
# Fraction of cache for data (default 0.1)
ceph config set osd bluestore_cache_size_ssd 0
ceph config set osd bluestore_cache_meta_ratio 0.01
ceph config set osd bluestore_cache_kv_ratio 0.99
```

## Monitoring OSD Memory Usage

```bash
# Check memory usage per OSD process
ps aux | grep ceph-osd | awk '{print $1, $6/1024 " MB", $11}'

# Use the admin socket to query internal stats
ceph daemon osd.0 dump_mempools

# Check for OOM events
journalctl -k | grep -i "oom killer"
dmesg | grep -i "out of memory"
```

## Setting Memory Limits in Rook

In a Rook deployment, set OSD memory resources in the CephCluster spec:

```yaml
spec:
  resources:
    osd:
      limits:
        memory: "4Gi"
      requests:
        memory: "2Gi"
```

Also configure the Ceph-level target:

```yaml
spec:
  cephConfig:
    osd:
      osd_memory_target: "4294967296"
```

## Summary

The `osd_memory_target` parameter controls how much RAM each Ceph OSD process uses for BlueStore caches. Setting it appropriately based on available node memory prevents OOM kills while maintaining cache performance. Enabling `osd_memory_target_autotune` allows Ceph to dynamically adjust memory usage across all OSDs based on system pressure, making it the recommended approach for most deployments.
