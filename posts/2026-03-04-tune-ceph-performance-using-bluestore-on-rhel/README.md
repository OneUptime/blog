# How to Tune Ceph Performance Using BlueStore on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ceph, BlueStore, Performance, Storage

Description: Optimize Ceph BlueStore OSD performance on RHEL by tuning cache sizes, WAL/DB placement, and kernel parameters for high-throughput workloads.

---

BlueStore is the default Ceph OSD backend. It writes directly to raw block devices, bypassing the filesystem layer for better performance. Proper tuning of BlueStore parameters can significantly improve throughput and latency.

## Check Current BlueStore Configuration

```bash
# Verify OSDs are using BlueStore

sudo ceph osd metadata osd.0 | grep osd_objectstore

# View current BlueStore settings for an OSD
sudo ceph config show osd.0 | grep bluestore
```

## Separate WAL and DB onto Fast Media

Placing the write-ahead log (WAL) and RocksDB database on NVMe drives while keeping bulk data on HDDs is the most impactful optimization:

```yaml
# osd-spec.yaml - OSD service specification with separate WAL and DB devices
service_type: osd
service_id: hdd-with-nvme
placement:
  hosts:
  - node1
data_devices:
  paths:
  - /dev/sdb
db_devices:
  paths:
  - /dev/nvme0n1
wal_devices:
  paths:
  - /dev/nvme0n1
```

```bash
# Apply the OSD specification
sudo ceph orch apply -i osd-spec.yaml
```

For existing OSDs, you need to recreate them with the new layout.

## Tune BlueStore Cache

Modern Ceph enables BlueStore cache autotuning by default. Increase the OSD memory target for read-heavy workloads:

```bash
# Set the OSD memory target to 8 GB for all OSDs
sudo ceph config set osd osd_memory_target 8589934592

# If you intentionally use manual cache sizing, disable autotuning first
sudo ceph config set osd bluestore_cache_autotune false

# Set manual cache sizes (default is 1 GB for HDD, 3 GB for SSD)
sudo ceph config set osd bluestore_cache_size_hdd 4294967296
sudo ceph config set osd bluestore_cache_size_ssd 8589934592

# Adjust cache ratios for metadata vs data
# Give more cache to metadata and RocksDB (kv) for random read workloads
# The data cache is the remaining fraction: 1 - meta_ratio - kv_ratio
sudo ceph config set osd bluestore_cache_meta_ratio 0.5
sudo ceph config set osd bluestore_cache_kv_ratio 0.3
```

## Tune Allocation Size

```bash
# Set minimum allocation size before creating or redeploying OSDs
# Current Ceph defaults are 4 KiB for both HDD and SSD OSDs
# Larger values can reduce metadata overhead for sequential workloads
sudo ceph config set osd bluestore_min_alloc_size_hdd 65536
sudo ceph config set osd bluestore_min_alloc_size_ssd 4096
```

The BlueStore minimum allocation size is baked into an OSD at creation time, so existing OSDs must be rebuilt to use a different value.

## Kernel and OS Tuning

Apply system-level tuning on OSD nodes:

```bash
# Set read-ahead for HDD OSD devices
sudo blockdev --setra 8192 /dev/sdb

# Disable transparent huge pages for lower latency
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled

# Set the I/O scheduler (mq-deadline for HDD, none for NVMe)
echo mq-deadline | sudo tee /sys/block/sdb/queue/scheduler
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler
```

## Tune Recovery and Backfill

Prevent recovery operations from consuming all OSD bandwidth:

```bash
# Limit recovery and backfill operations when overriding mClock recovery defaults
sudo ceph config set osd osd_mclock_override_recovery_settings true
sudo ceph config set osd osd_recovery_max_active_hdd 3
sudo ceph config set osd osd_max_backfills 1
```

If your cluster uses the mClock scheduler, recovery sleep options such as `osd_recovery_sleep_hdd` are disabled; use mClock profiles or the recovery override setting instead.

## Benchmark Your Changes

```bash
# Run a RADOS bench test on a test pool
sudo ceph osd pool create bench-pool 64
sudo rados bench -p bench-pool 30 write --no-cleanup
sudo rados bench -p bench-pool 30 seq
sudo rados bench -p bench-pool 30 rand

# Clean up
sudo rados -p bench-pool cleanup
sudo ceph osd pool delete bench-pool bench-pool --yes-i-really-really-mean-it
```

Careful BlueStore tuning combined with proper hardware placement (NVMe for WAL/DB, HDD for data) delivers the best price-to-performance ratio for Ceph on RHEL.
