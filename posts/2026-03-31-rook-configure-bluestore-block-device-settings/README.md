# How to Configure BlueStore Block Device Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, BlueStore, Block Device, OSD, Configuration, Performance, Storage

Description: Configure BlueStore block device settings including size, cache, and allocation parameters to optimize OSD performance for your workload.

---

## Overview

The BlueStore block device is the primary storage for object data in Ceph OSDs. It is the raw block device (disk or partition) that BlueStore writes to directly, bypassing any filesystem. Configuring block device settings - particularly the allocation size and cache parameters - has significant impact on space efficiency and write performance.

## Identifying the Block Device

Each BlueStore OSD uses a `block` symlink pointing to the raw device:

```bash
# Check the block device for OSD 0
ls -la /var/lib/ceph/osd/ceph-0/block

# View block device size
lsblk $(readlink -f /var/lib/ceph/osd/ceph-0/block)
```

## Key Block Device Configuration Parameters

### bluestore_block_size

This sets the size of the block device. It is normally auto-detected, but can be overridden:

```bash
# View current setting (default is 107374182400 i.e. 100 GiB; used only for file-backed block devices)
ceph config show osd.0 bluestore_block_size

# Manually set block size (for raw block devices, the actual device size is used automatically)
ceph config set osd.0 bluestore_block_size 107374182400  # 100 GiB
```

### bluestore_min_alloc_size

The minimum allocation unit. Overwrites smaller than this are deferred through the WAL:

```bash
# View default min alloc sizes
ceph config show osd.0 bluestore_min_alloc_size_hdd
ceph config show osd.0 bluestore_min_alloc_size_ssd

# Default for HDD: 65536 (64KB)
# Default for SSD: 4096 (4KB) in Ceph Octopus+
```

### bluestore_prefer_deferred_size

Controls when writes are deferred to the WAL vs written directly:

```bash
# View current setting
ceph config show osd.0 bluestore_prefer_deferred_size_hdd

# For HDDs - higher value helps reduce random small writes
ceph config set osd bluestore_prefer_deferred_size_hdd 32768
```

## Configuring Block Device via Rook

In Rook-Ceph, set block device configurations in the CephCluster manifest:

```yaml
# rook-cluster-bluestore.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    config:
      osdsPerDevice: "1"
      encryptedDevice: "false"
      deviceClass: hdd
    nodes:
      - name: "worker1"
        devices:
          - name: "sdb"
            config:
              osdsPerDevice: "1"
```

## Checking Block Device Utilization

Monitor how much of the block device is allocated:

```bash
# View allocator stats for OSD 0
ceph daemon osd.0 bluestore allocator dump block 2>&1 | head -20

# Check space usage
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
bs = data.get('bluestore', {})
print('Allocation unit size:', bs.get('alloc_unit', 'N/A'))
"
```

Using the admin socket:

```bash
ceph-osd -i 0 --get-osd-fsid
ceph daemon osd.0 dump_mempools
```

## Enabling Spdk for NVMe Block Devices

For NVMe drives, BlueStore can use SPDK for direct I/O bypass:

```bash
# In ceph.conf
[osd]
bluestore_spdk_mem = 2048
bluestore_block_path = "spdk:trtype:PCIe traddr:0000:01:00.0"
```

## Monitoring Block Device Performance

Track block device I/O with Ceph performance counters:

```bash
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
for key in ['write_big_bytes', 'write_small_bytes', 'write_pad_bytes']:
    print(key, ':', data.get('bluestore', {}).get(key, 'N/A'))
"
```

## Summary

BlueStore block device settings control the allocation unit size, deferred write thresholds, and I/O path for object data storage. Tuning `bluestore_min_alloc_size` to match your workload's write size distribution reduces write amplification - smaller values suit small-object workloads while larger values improve sequential write efficiency on HDDs. Monitoring allocator stats and performance counters guides further tuning for production deployments.
