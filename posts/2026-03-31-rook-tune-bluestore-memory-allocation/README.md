# How to Tune BlueStore Memory Allocation in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, Performance, Memory, Storage

Description: Learn how to tune BlueStore memory allocation in Ceph to maximize cache hit rates, reduce I/O latency, and properly size OSD memory per node capacity.

---

## Understanding BlueStore Memory Usage

BlueStore is the default object store for Ceph OSDs and uses memory in two primary ways: the RocksDB block cache (for metadata lookups) and the BlueStore cache (for data and metadata objects). Proper memory allocation significantly impacts read performance and write amplification.

## Key Memory Parameters

The main tunable is `osd_memory_target`, which sets the total memory each OSD should consume:

```bash
# View current setting
ceph config get osd osd_memory_target
ceph config get osd bluestore_cache_size
```

By default, Ceph uses autotuning based on `osd_memory_target`. The default is 4 GiB per OSD.

## Calculating Optimal Memory

A common formula for sizing OSD memory:

- **Minimum**: 2 GiB per OSD for basic operation
- **Recommended**: 4-6 GiB per OSD for production
- **High-performance**: 8+ GiB per OSD for NVMe with large datasets

For a node with 128 GiB RAM and 12 OSDs, leave ~20 GiB for the OS and other services:

```bash
# Available per OSD = (128 - 20) / 12 = ~9 GiB
ceph config set osd osd_memory_target 9663676416  # 9 GiB in bytes
```

## Setting Memory Targets

Set globally for all OSDs:

```bash
ceph config set osd osd_memory_target 8589934592  # 8 GiB
```

Set per-OSD for nodes with different hardware:

```bash
ceph config set osd.0 osd_memory_target 4294967296  # 4 GiB for OSD 0
ceph config set osd.1 osd_memory_target 8589934592  # 8 GiB for OSD 1
```

## Disabling Autotuning for Manual Control

Disable autotuning to set cache sizes explicitly:

```bash
ceph config set osd osd_memory_autotune false
ceph config set osd bluestore_cache_size 6442450944   # 6 GiB
```

Split the cache manually between HDD and SSD paths:

```bash
# For HDD OSDs (more data cache, less metadata)
ceph config set osd bluestore_cache_size_hdd 1073741824   # 1 GiB
ceph config set osd bluestore_cache_kv_ratio 0.2          # 20% for RocksDB

# For SSD OSDs (balance data and metadata)
ceph config set osd bluestore_cache_size_ssd 3221225472   # 3 GiB
ceph config set osd bluestore_cache_kv_ratio 0.4          # 40% for RocksDB
```

## Configuring in Rook CephCluster

Set memory limits and requests in the Rook CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  resources:
    osd:
      requests:
        memory: "4Gi"
        cpu: "1000m"
      limits:
        memory: "8Gi"
        cpu: "2000m"
  storage:
    config:
      osdsPerDevice: "1"
```

Also set Ceph config via the `rook-config-override` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    osd_memory_target = 8589934592
    osd_memory_autotune = true
```

## Monitoring Memory Usage

Watch OSD memory consumption:

```bash
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -i cache
ceph daemon osd.0 dump_mempools
ceph daemon osd.0 bluestore allocator score block
```

Check memory using standard Linux tools:

```bash
kubectl top pods -n rook-ceph | grep osd
ps aux --sort=-%mem | grep ceph-osd | head -10
```

## Summary

BlueStore memory tuning directly controls how much data and metadata Ceph caches in RAM. Setting `osd_memory_target` appropriately based on available node RAM and OSD count significantly improves read hit rates. In Rook environments, combine Kubernetes resource limits with Ceph config overrides to enforce consistent memory allocation across all OSD pods.
