# How to Configure BlueStore WAL Device Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, BlueStore, WAL, OSD, NVMe, Performance, Configuration

Description: Configure BlueStore's Write-Ahead Log (WAL) on a separate fast NVMe device to improve write latency for HDD-backed OSDs.

---

## Overview

BlueStore uses a Write-Ahead Log (WAL) for small writes that are smaller than `bluestore_min_alloc_size`. By default, the WAL is stored on the same device as the OSD data. Moving the WAL to a fast NVMe drive dramatically improves write latency for HDD-backed OSDs by keeping latency-sensitive journal writes on faster media.

## How the BlueStore WAL Works

When BlueStore receives a small write:

1. The write is staged in the RocksDB WAL (BlueFS layer)
2. Once the WAL entry is committed, the data is deferred to the main device
3. Background processes ("deferred" writes) flush WAL entries to the block device

This two-phase approach ensures durability while keeping the write acknowledgment fast.

## Performance Impact of WAL Device

Latency comparison (typical values):

| Configuration | Write Latency (p99) |
|---|---|
| WAL on HDD (same as data) | 15-25ms |
| WAL on SSD | 5-10ms |
| WAL on NVMe | 1-3ms |

## Configuring a Separate WAL Device

### With cephadm

Create a DriveGroup service specification to define OSD layout with a separate WAL device:

```yaml
# osd-wal-spec.yaml
service_type: osd
service_id: hdd-with-wal
placement:
  hosts:
    - myhost
data_devices:
  paths:
    - /dev/sdb
wal_devices:
  paths:
    - /dev/nvme0n1
```

Apply the specification:

```bash
ceph orch apply -i osd-wal-spec.yaml
```

### With ceph-volume

```bash
# Provision OSD with WAL on separate device
ceph-volume lvm prepare \
  --data /dev/sdb \
  --block.wal /dev/nvme0n1
```

### With Rook-Ceph

```yaml
# rook-cluster-wal.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    storageClassDeviceSets:
      - name: hdd-with-wal
        count: 3
        volumeClaimTemplates:
          - metadata:
              name: data
            spec:
              storageClassName: local-storage-hdd
              resources:
                requests:
                  storage: 1Ti
          - metadata:
              name: wal
            spec:
              storageClassName: local-storage-nvme
              resources:
                requests:
                  storage: 10Gi
```

## BlueStore WAL Configuration Parameters

```bash
# WAL size (default is 96 MiB; set explicitly for larger WAL partitions)
ceph config show osd.0 bluestore_block_wal_size

# Set a specific WAL partition size (in bytes)
ceph config set osd.0 bluestore_block_wal_size 10737418240  # 10 GB

# View WAL path
ls -la /var/lib/ceph/osd/ceph-0/block.wal
```

## Verifying WAL Device Usage

```bash
# Check that WAL is on a separate device
stat /var/lib/ceph/osd/ceph-0/block
stat /var/lib/ceph/osd/ceph-0/block.wal

# Confirm they are different block devices
ls -la /var/lib/ceph/osd/ceph-0/ | grep block
```

## Monitoring WAL Performance

```bash
# Check WAL-related performance counters
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
rocksdb = data.get('rocksdb', {})
for k in ['rocksdb_write_delay_time', 'rocksdb_write_wal_time', 'rocksdb_compact']:
    print(k, ':', rocksdb.get(k, 'N/A'))
"
```

Monitor WAL activity via iostat:

```bash
# On the WAL device (NVMe)
iostat -x /dev/nvme0n1 5
```

## WAL Sizing Guidelines

Calculate WAL size based on your write workload:

```bash
# Rule of thumb: WAL should hold ~10 seconds of writes
# For 1 GB/s write rate: WAL = 10 GB minimum

# Check cumulative bytes written (take two samples to compute a rate)
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('Write bytes (cumulative):', data.get('osd', {}).get('op_w_in_bytes', 'N/A'))
"
```

## Summary

Placing BlueStore's WAL on a fast NVMe device significantly reduces write latency for HDD-backed OSDs. The WAL handles small write acknowledgments, so NVMe latency directly maps to client-visible write latency. Configure the WAL device using cephadm, ceph-volume, or Rook's `volumeClaimTemplates`, and size the WAL to hold at least 10-30 seconds of write data to prevent WAL stalls under burst loads.
