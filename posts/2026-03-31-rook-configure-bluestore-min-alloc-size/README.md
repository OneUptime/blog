# How to Configure bluestore_min_alloc_size in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, BlueStore, Allocation, Performance, OSD, Fragmentation, Tuning

Description: Understand and configure bluestore_min_alloc_size to reduce space amplification and improve write efficiency for your Ceph workload.

---

## Overview

`bluestore_min_alloc_size` is a critical BlueStore parameter that determines the minimum unit of space allocated on the block device. Writes smaller than this size are first written to the WAL and later merged before being written to the block device. The setting significantly affects space efficiency, fragmentation, and write amplification.

## What bluestore_min_alloc_size Controls

When BlueStore receives a write:

- If write size >= `bluestore_min_alloc_size`: Written directly to the block device
- If write size < `bluestore_min_alloc_size`: Staged in WAL, then written as a full allocation unit

This means if `min_alloc_size` is 64KB but you write 4KB objects, each 4KB object still consumes 64KB on disk - resulting in 16x space amplification.

## Default Values

```bash
# View defaults
ceph config show osd.0 bluestore_min_alloc_size_hdd
# Default HDD: 65536 (64 KB) in older releases, 4096 in newer ones

ceph config show osd.0 bluestore_min_alloc_size_ssd
# Default SSD: 4096 (4 KB) in Ceph Quincy+
```

## Choosing the Right Value

| Workload | Object Size | Recommended min_alloc_size |
|---|---|---|
| RGW small objects | 4-64 KB | 4096 - 16384 |
| RBD (VM disks) | 4 MB blocks | 65536 |
| CephFS large files | 1+ MB | 65536 |
| RGW large objects | 1+ MB | 65536 |

## Setting bluestore_min_alloc_size

The `min_alloc_size` must be set **before** OSD creation. It cannot be changed on existing OSDs without destroying and recreating them.

```bash
# Set before creating OSDs
ceph config set osd bluestore_min_alloc_size_hdd 4096
ceph config set osd bluestore_min_alloc_size_ssd 4096
```

For Rook-Ceph, set in the config override:

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
    bluestore_min_alloc_size_hdd = 4096
    bluestore_min_alloc_size_ssd = 4096
```

```bash
kubectl apply -f rook-config-override.yaml
# Then delete and re-create OSD pods to pick up new settings
```

## Verifying the Current Setting on an Existing OSD

```bash
# Check min_alloc_size baked into the OSD at creation
ceph-bluestore-tool show-label --path /var/lib/ceph/osd/ceph-0/

# Or from admin socket
ceph daemon osd.0 config get bluestore_min_alloc_size
```

## Space Amplification Analysis

Calculate potential space waste:

```bash
# If min_alloc_size is 64KB and your objects are 4KB:
# Space amplification = 64 / 4 = 16x
# 1 TB of actual data = 16 TB allocated space

# Monitor actual space efficiency
ceph df
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
bs = data.get('bluestore', {})
alloc = bs.get('bluestore_allocated', 0)
stored = bs.get('bluestore_stored', 0)
if stored > 0:
    print(f'Space amplification: {alloc/stored:.2f}x')
"
```

## Impact on WAL Usage

Smaller `min_alloc_size` values reduce space amplification but increase WAL write volume, since more writes qualify as "small" and go through the WAL path:

```bash
# Check deferred write volume
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
bs = data.get('bluestore', {})
deferred = bs.get('bluestore_write_deferred', 0)
big = bs.get('bluestore_write_big', 0)
print(f'Deferred writes: {deferred}, Direct writes: {big}')
"
```

## Summary

`bluestore_min_alloc_size` must be configured before OSD creation and cannot be changed on live OSDs without recreation. Smaller values (4096-16384) reduce space amplification for small-object workloads like RGW, while larger values (65536) optimize sequential write efficiency for RBD or large file workloads. Measure your workload's typical object size and set `min_alloc_size` accordingly to avoid excessive space waste.
