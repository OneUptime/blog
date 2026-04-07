# How to Tune BlueStore for SSD and NVMe Drives

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, SSD, NVMe, Performance, Tuning

Description: Learn how to tune Ceph BlueStore settings for SSD and NVMe drives to maximize IOPS, reduce latency, and get the best performance from your fast storage hardware.

---

## Why SSD and NVMe Require Different Tuning

Hard disk drives and solid-state drives have very different performance profiles. SSDs and NVMe drives offer low latency (sub-millisecond), high IOPS, and benefit from parallelism. The default BlueStore configuration is conservative and designed to work across drive types. Proper tuning can unlock 2-5x the performance on fast media.

## Key BlueStore Settings for SSD and NVMe

### 1. BlueStore Cache Size

SSDs have fast random reads, so a larger BlueStore cache allows more metadata to be served from memory:

```bash
ceph config set osd bluestore_cache_size_ssd 4294967296
```

This sets a 4GB cache for SSD-backed OSDs. For NVMe, 6-8GB may be beneficial.

### 2. BlueFS Minimum Ratio

BlueFS stores RocksDB WAL and SSTs. Increasing the minimum ratio ensures BlueFS always has enough space for write-heavy workloads:

```bash
ceph config set osd bluestore_bluefs_min_ratio 0.05
```

The default minimum is 0.02. Raising it to 0.05 reserves more space for BlueFS. The default maximum ratio (0.90) is typically fine and should not be lowered aggressively.

### 3. Minimum Allocation Size

The minimum allocation size controls the smallest unit BlueStore allocates. For SSDs, the default is 4KB (changed from 16KB in Octopus):

```bash
ceph config set osd bluestore_min_alloc_size_ssd 4096
```

Note: This value is stamped at OSD creation time and cannot be changed on existing OSDs without recreating them.

### 4. Deferred Writes and Blob Size

Deferred writes use a write-ahead log before committing to the main storage. On SSDs, deferred writes are disabled by default (`bluestore_prefer_deferred_size_ssd = 0`) since random writes are fast. You can tune the maximum blob size and deferred batch operations:

```bash
ceph config set osd bluestore_max_blob_size 65536
ceph config set osd bluestore_deferred_batch_ops 16
```

### 5. RocksDB Compaction Tuning

```bash
ceph config set osd bluestore_rocksdb_options "compression=kNoCompression,max_write_buffer_number=4,min_write_buffer_number_to_merge=1,write_buffer_size=67108864"
```

### 6. OSD Objectstore Queue Depth

Increase queue depth to match NVMe parallelism:

```bash
ceph config set osd osd_op_thread_timeout 10
ceph config set osd osd_op_num_threads_per_shard_ssd 2
```

## Applying via Rook CephCluster

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    osd:
      bluestore_cache_size_ssd: "4294967296"
      bluestore_min_alloc_size_ssd: "4096"
```

## Validating the Tuning

Run a write throughput benchmark with rados bench:

```bash
rados -p rbd bench 60 write --no-cleanup
```

Compare with default settings. On NVMe, expect 20-40% improvement with proper tuning.

## Summary

Tuning BlueStore for SSD and NVMe involves increasing cache sizes, reducing the minimum allocation size to 4KB, adjusting deferred write thresholds, and optimizing RocksDB. These changes dramatically reduce latency and increase IOPS, especially for random write workloads common in Kubernetes persistent volumes.
