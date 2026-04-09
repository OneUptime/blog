# How to Fix DB_DEVICE_STALLED_READ_ALERT Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, RocksDB, Performance

Description: Learn how to diagnose and resolve the DB_DEVICE_STALLED_READ_ALERT health check in Ceph when the BlueStore RocksDB metadata device reports slow or stalled read operations.

---

## Understanding DB_DEVICE_STALLED_READ_ALERT

`DB_DEVICE_STALLED_READ_ALERT` fires when BlueStore detects stalled or excessively slow read operations on the DB (RocksDB metadata) device. The DB device stores critical BlueStore metadata and is read on every object access. Stalls here cause OSD-level latency spikes that impact client I/O. This is typically more impactful than WAL stalls because reads happen more frequently on the DB device.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN DB device stalled reads
[WRN] DB_DEVICE_STALLED_READ_ALERT: osd.1 DB device is experiencing stalled reads
    osd.1: 23 DB reads stalled > 5s in the last hour
```

## Identifying the DB Device

Locate the DB device for the affected OSD:

```bash
ceph osd metadata 1 | python3 -m json.tool | grep -E "bluefs_db|devname"

# Check symlink
ls -la /var/lib/ceph/osd/ceph-1/
readlink -f /var/lib/ceph/osd/ceph-1/block.db
```

## Diagnosing DB Device Performance

Test the DB device I/O:

```bash
DB_DEV=/dev/nvme1n1p2  # replace with actual DB device

# Random read test simulating RocksDB access pattern
fio --filename=$DB_DEV --rw=randread --bs=4k \
    --numjobs=4 --ioengine=libaio --iodepth=32 \
    --runtime=60 --name=db-read-test --readonly

# Check latency percentiles
fio --filename=$DB_DEV --rw=randread --bs=4k \
    --numjobs=1 --ioengine=libaio --iodepth=1 \
    --runtime=30 --name=db-lat-test --readonly \
    --lat_percentiles=1 --percentile_list=50:99:99.9
```

For NVMe devices, p99 latency above 1ms for 4KB random reads indicates a problem.

## Checking BlueStore DB-Specific Counters

```bash
ceph daemon osd.1 perf dump | python3 -m json.tool | grep -E "db_|kv_"
```

Key metrics:
- `bluefs_db_total_bytes` vs `bluefs_db_used_bytes` - check if DB is nearly full
- `rocksdb.get_latency` (sub-fields `sum` / `avgcount`) - average RocksDB read latency

## Fix: Check DB Device Fill Level

A DB device that is nearly full will perform much worse due to RocksDB compaction overhead:

```bash
ceph daemon osd.1 bluefs stats
```

If the DB device is over 80% full, expand it (see `BLUEFS_AVAILABLE_SPACE` fix guide).

## Fix: Tune RocksDB Cache

Increase the RocksDB block cache to reduce reads to the DB device:

```bash
ceph config set osd.1 bluestore_rocksdb_options "max_open_files=500,compaction_style=kUniversalCompaction,write_buffer_size=67108864,target_file_size_base=67108864,max_bytes_for_level_base=268435456,cache_index_and_filter_blocks=true,cache_index_and_filter_blocks_with_high_priority=true"
```

Or increase the default BlueStore cache:

```bash
ceph config set osd.1 bluestore_cache_size_ssd 6442450944   # 6GB for SSD-backed DB
```

Restart OSD to apply:

```bash
kubectl -n rook-ceph delete pod <osd-1-pod>
```

## Fix: NVMe Power Management

Disable power state transitions on the DB device NVMe:

```bash
# Get the NVMe device name
DB_NVME=/dev/nvme1

# Disable APST
nvme set-feature $DB_NVME -f 0x0c -v 0

# Check
nvme get-feature $DB_NVME -f 0x0c -H
```

## Fix: Migrate DB to Larger/Faster Device

If the DB device is consistently underperforming, migrate to a faster device:

```bash
# Stop OSD
systemctl stop ceph-osd@1

# Migrate DB to new device (new-device must already be provisioned)
ceph-bluestore-tool bluefs-bdev-migrate \
  --path /var/lib/ceph/osd/ceph-1 \
  --devs-source /var/lib/ceph/osd/ceph-1/block.db \
  --dev-target /dev/new-nvme-device

# Update symlink
ln -sf /dev/new-nvme-device /var/lib/ceph/osd/ceph-1/block.db

# Restart
systemctl start ceph-osd@1
```

## Monitoring DB Device Latency

```yaml
- alert: CephDBDeviceStalled
  expr: ceph_daemon_health_metrics{type="DB_DEVICE_STALLED_READ_ALERT"} > 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "OSD {{ $labels.ceph_daemon }} DB device has stalled reads - client I/O may be impacted"
```

## Summary

`DB_DEVICE_STALLED_READ_ALERT` indicates the BlueStore RocksDB metadata device is experiencing stalled reads, directly impacting client I/O latency. Diagnose with `fio` latency tests. Fix by ensuring the DB device is not near full, increasing the RocksDB block cache to reduce physical reads, disabling NVMe power management, or migrating the DB to a faster device. Monitor DB device latency proactively since DB performance directly impacts OSD read latency.
