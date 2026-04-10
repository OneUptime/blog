# How to Configure Ceph for NVMe WAL/DB with HDD Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe, HDD, BlueStore, WAL, Configuration

Description: Configure Rook-Ceph to place BlueStore WAL and RocksDB on NVMe devices while storing bulk data on HDDs to maximize performance at minimum cost.

---

## Why NVMe for WAL/DB with HDD Data

BlueStore's write-ahead log (WAL) and RocksDB metadata require low-latency random I/O. By offloading these to NVMe while keeping object data on cheap HDDs, you get near-NVMe metadata performance with HDD-class storage costs per TB.

## Device Roles in BlueStore

```bash
# BlueStore uses up to 3 device roles per OSD:
# 1. Main block device - stores object data (HDD)
# 2. DB device       - stores RocksDB metadata (NVMe preferred)
# 3. WAL device      - stores write-ahead log (NVMe preferred)

# When DB is on faster device, metadata lookups are faster
# When WAL is on faster device, write latency is reduced
```

## Rook Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    nodes:
      - name: "worker-01"
        devices:
          - name: "sdb"   # 4 TB HDD - object data
            config:
              metadataDevice: "nvme0n1"  # NVMe for both DB and WAL
          - name: "sdc"   # 4 TB HDD
            config:
              metadataDevice: "nvme0n1"  # NVMe shared across HDDs
          - name: "sdd"   # 4 TB HDD
            config:
              metadataDevice: "nvme1n1"  # Second NVMe for remaining HDDs
```

## Sizing the NVMe DB Device

```bash
# Recommended DB device sizing:
# 4% of HDD OSD capacity is a safe minimum
# 4 TB HDD -> 160 GB DB allocation
# 8 TB HDD -> 320 GB DB allocation

# One 1 TB NVMe can support:
# 1 TB / 160 GB = ~6 x 4 TB HDDs per NVMe
# 1 TB / 320 GB = ~3 x 8 TB HDDs per NVMe

# Monitor actual DB usage - if spilling to HDD, add NVMe
ceph daemon osd.0 perf dump bluefs | grep bytes
```

## Verify Device Assignment

```bash
# Check that WAL and DB are on the expected devices
ceph osd metadata 0 | python3 -c "
import json, sys
d = json.load(sys.stdin)
for k, v in d.items():
    if 'device' in k.lower() or 'rotational' in k.lower():
        print(f'{k}: {v}')
"
```

## BlueStore Tuning for This Configuration

```bash
# WAL size on NVMe (larger WAL = better write coalescing)
ceph config set osd bluestore_block_wal_size 10737418240  # 10 GB

# DB size suggestion (Ceph auto-manages, but can hint)
ceph config set osd bluestore_block_db_size 107374182400  # 100 GB

# RocksDB options optimized for NVMe metadata store
ceph config set osd bluestore_rocksdb_options \
  "compression=kNoCompression,max_write_buffer_number=8,min_write_buffer_number_to_merge=2,max_background_compactions=4"
```

## Handle DB Overflow to HDD

```bash
# If DB overflows to HDD, Ceph logs warnings
# Monitor for bluefs spill events
ceph daemon osd.0 perf dump | python3 -c "
import json, sys
d = json.load(sys.stdin)
spills = d.get('bluefs', {}).get('bytes_written_slow', 0)
if spills > 0:
    print(f'DB spill to slow device: {spills/(1024**3):.2f} GB - add more NVMe')
"
```

## Performance Comparison

```bash
# Benchmark write latency with and without NVMe WAL/DB
# Test 1: All HDD (no metadata offload)
rados bench -p hdd-pool 60 write -b 4096

# Test 2: HDD data + NVMe WAL/DB
rados bench -p nvme-db-pool 60 write -b 4096
# Expected: 30-60% latency improvement for small writes
```

## Summary

Placing BlueStore WAL and RocksDB on NVMe while storing object data on HDDs delivers significant write latency improvements at minimal extra cost. A single 1 TB NVMe can accelerate 3-6 HDDs, making this configuration ideal for large-capacity clusters that need better random write performance without paying for all-flash storage.
