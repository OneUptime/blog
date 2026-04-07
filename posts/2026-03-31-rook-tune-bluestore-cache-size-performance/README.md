# How to Tune bluestore_cache_size for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, BlueStore, Cache, Performance, Tuning, OSD, Memory

Description: Tune BlueStore's in-memory cache size to improve read performance and reduce I/O latency in Ceph OSD deployments.

---

## Overview

BlueStore maintains an in-memory cache for frequently accessed data and metadata. This cache reduces block device reads for hot data and RocksDB metadata. Properly tuning `bluestore_cache_size` based on available RAM per OSD is one of the most impactful BlueStore performance optimizations.

## How BlueStore Cache Works

BlueStore's memory cache has two main components:

- **Data cache** - Caches recently read object data blocks
- **RocksDB cache** - Caches RocksDB metadata and index blocks (via the block cache)

These are managed by BlueStore's internal memory allocator, which adjusts dynamically based on the configured total cache size.

## Checking Current Cache Size

```bash
# View current cache size setting
ceph config show osd.0 bluestore_cache_size_ssd
ceph config show osd.0 bluestore_cache_size_hdd

# Get current live cache stats
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
bs = data.get('bluestore', {})
print('Cache bytes:', bs.get('bluestore_cache_bytes', 0))
h = bs.get('bluestore_cache_hit', 0)
m = bs.get('bluestore_cache_miss', 0)
total = h + m
print(f'Cache hit ratio: {h/total:.3f}' if total > 0 else 'Cache hit ratio: N/A')
"
```

## Cache Size Guidelines

BlueStore cache size should be based on available RAM per OSD:

| RAM per OSD | Recommended bluestore_cache_size |
|---|---|
| 2 GB | 512 MB |
| 4 GB | 1-2 GB |
| 8 GB | 3-4 GB |
| 16 GB | 6-8 GB |

Default values are: 3 GB for SSD OSDs, 1 GB for HDD OSDs.

## Setting Cache Size

```bash
# Set cache size globally for all OSD types
ceph config set osd bluestore_cache_size_ssd 3221225472   # 3 GB
ceph config set osd bluestore_cache_size_hdd 1073741824   # 1 GB

# Per-OSD override
ceph config set osd.0 bluestore_cache_size 4294967296     # 4 GB
```

For Rook-Ceph via the config override ConfigMap:

```yaml
# rook-config-override.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    bluestore_cache_size_ssd = 3221225472
    bluestore_cache_size_hdd = 1073741824
```

```bash
kubectl apply -f rook-config-override.yaml
```

## Tuning Cache Ratio Between Data and Metadata

Adjust the ratio of cache used for data vs RocksDB metadata:

```bash
# Default ratio: 0.4 for meta (onode metadata), 0.4 for kv (RocksDB), remainder for data
ceph config get osd.0 bluestore_cache_meta_ratio

# For workloads with many objects (high metadata pressure):
ceph config set osd bluestore_cache_meta_ratio 0.5

# For bulk storage with large objects (high data read pressure):
ceph config set osd bluestore_cache_meta_ratio 0.2
```

## Monitoring Cache Effectiveness

Track cache hit ratio to evaluate tuning effectiveness:

```bash
#!/bin/bash
for OSD in $(ceph osd ls); do
  HITS=$(ceph daemon osd.$OSD perf dump 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
bs = data.get('bluestore', {})
h = bs.get('bluestore_cache_hit', 0)
m = bs.get('bluestore_cache_miss', 0)
total = h + m
print(f'OSD $OSD: hits={h}, misses={m}, ratio={h/total:.3f}' if total > 0 else 'N/A')
  ")
  echo $HITS
done
```

## Cache Pressure Indicators

Signs the cache is too small:

```bash
# Check cache miss rate as an indicator of pressure
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
bs = data.get('bluestore', {})
h = bs.get('bluestore_cache_hit', 0)
m = bs.get('bluestore_cache_miss', 0)
total = h + m
ratio = h / total if total > 0 else 0
print(f'Hit ratio: {ratio:.3f} (hits={h}, misses={m})')
if ratio < 0.5:
    print('Warning: Low hit ratio - consider increasing cache size')
"
```

A consistently low cache hit ratio indicates the cache is too small for the working set and should be increased.

## Summary

Tuning `bluestore_cache_size` to allocate 25-50% of available OSD RAM dramatically improves cache hit rates and reduces disk I/O for read-intensive workloads. Adjust the meta-to-data cache ratio based on your workload: favor metadata for many-object workloads (RGW, CephFS), and favor data cache for large-object sequential reads. Monitor cache hit ratios to verify tuning effectiveness and adjust as workloads evolve.
