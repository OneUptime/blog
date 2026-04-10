# How to Configure BlueStore DB Device Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, BlueStore, DB Device, RocksDB, OSD, Performance, NVMe

Description: Configure BlueStore's RocksDB metadata database on a separate SSD or NVMe device to improve metadata-intensive workload performance.

---

## Overview

BlueStore stores all OSD metadata (object names, xattrs, omap data) in an embedded RocksDB database. By default, this database lives on the same block device as the OSD data. Moving the RocksDB DB to a faster SSD or NVMe drive improves metadata-intensive operations, particularly for workloads with many small objects or heavy omap usage (such as RGW bucket indexes).

## What Is Stored on the DB Device

The BlueStore DB device (also called the "block.db") stores:

- Object namespace and name mappings
- Extended attributes (xattrs)
- Omap data (key-value data for objects)
- RocksDB internal metadata and SST files

## Performance Impact

Operations that benefit most from a fast DB device:

- RGW bucket listing (reads omap indexes)
- CephFS directory operations
- Snapshot creation (metadata-heavy)
- Metadata pool workloads

## Configuring a Separate DB Device

### With cephadm

```bash
# Add OSD with separate DB on SSD
ceph orch daemon add osd myhost:data_devices=/dev/sdb,db_devices=/dev/ssd0
```

For more complex setups with separate DB and WAL devices, use a service specification:

```yaml
# osd_spec.yaml
service_type: osd
service_id: osd_with_db_wal
placement:
  hosts:
    - myhost
spec:
  data_devices:
    paths:
      - /dev/sdb
  db_devices:
    paths:
      - /dev/ssd0
  wal_devices:
    paths:
      - /dev/nvme0n1
```

```bash
ceph orch apply -i osd_spec.yaml
```

### With ceph-volume

```bash
ceph-volume lvm prepare \
  --data /dev/sdb \
  --block.db /dev/ssd0
```

### With Rook-Ceph CephCluster

```yaml
# rook-cluster-db.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    storageClassDeviceSets:
      - name: hdd-set
        count: 6
        volumeClaimTemplates:
          - metadata:
              name: data
            spec:
              storageClassName: local-hdd
              resources:
                requests:
                  storage: 4Ti
          - metadata:
              name: metadata
            spec:
              storageClassName: local-ssd
              resources:
                requests:
                  storage: 50Gi
```

## DB Device Sizing Guidelines

The DB device needs to be large enough to hold RocksDB without spillover to the main device. If the DB device fills up, BlueStore falls back to the main block device (which is slower).

```bash
# Rule of thumb: 1-4% of OSD data size depending on workload
# RBD-only workloads: 1-2%
# RGW, CephFS, or mixed workloads: at least 4%

# Check current DB usage via BlueFS perf counters
ceph daemon osd.0 perf dump bluefs | python3 -c "
import sys, json
data = json.load(sys.stdin)
bluefs = data.get('bluefs', {})
print('DB total:', bluefs.get('db_total_bytes', 'N/A'))
print('DB used:', bluefs.get('db_used_bytes', 'N/A'))
"
```

Recommended sizing per OSD:

| OSD Size | RBD Workloads (1-2%) | RGW/CephFS/Mixed (4%) |
|---|---|---|
| 1 TB | 10-20 GB | 40 GB |
| 4 TB | 40-80 GB | 160 GB |
| 10 TB | 100-200 GB | 400 GB |

## Verifying DB Device Usage

```bash
# Check DB device symlink
ls -la /var/lib/ceph/osd/ceph-0/block.db

# Verify it points to the SSD
stat $(readlink -f /var/lib/ceph/osd/ceph-0/block.db) | grep Device
```

## Monitoring DB Device Metrics

```bash
# Check RocksDB compaction stats
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
rocksdb = data.get('rocksdb', {})
print('Compactions:', rocksdb.get('compact', 0))
print('Compaction queue:', rocksdb.get('compact_queue_len', 0))
"
```

Monitor DB device I/O:

```bash
iostat -x /dev/ssd0 5
```

## Handling DB Device Overflow

If the DB device fills up:

```bash
# Check DB space usage via BlueFS counters
ceph daemon osd.0 perf dump bluefs | python3 -c "
import sys, json
data = json.load(sys.stdin)
bluefs = data.get('bluefs', {})
db_total = bluefs.get('db_total_bytes', 0)
db_used = bluefs.get('db_used_bytes', 0)
slow_used = bluefs.get('slow_used_bytes', 0)
print(f'DB total: {db_total}')
print(f'DB used: {db_used}')
print(f'Spilled to slow device: {slow_used}')
"

# If overflowing, increase DB size or move RocksDB back
# Option: compact RocksDB to reduce size
ceph daemon osd.0 compact
```

## Summary

Moving BlueStore's RocksDB metadata database to a dedicated SSD or NVMe device reduces metadata operation latency, which is critical for workloads with high omap usage or many small objects. Size the DB device at 1-4% of the OSD data size (1-2% for RBD, 4% for RGW/CephFS/mixed workloads) to prevent DB spillover to the slower main device. Monitor RocksDB compaction rates and L0 file counts to identify when the DB device is under pressure.
