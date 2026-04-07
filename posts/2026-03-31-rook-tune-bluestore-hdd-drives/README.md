# How to Tune BlueStore for HDD Drives

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, HDD, Performance, Tuning

Description: Learn how to tune Ceph BlueStore settings for spinning hard disk drives to improve throughput, reduce seek overhead, and maximize performance from HDD-based OSDs.

---

## HDD Performance Characteristics

Hard disk drives have high sequential throughput but suffer from poor random I/O performance due to mechanical seek times. BlueStore's default settings work across drive types, but dedicated HDD tuning shifts workloads toward sequential access patterns, reducing seeks and improving overall throughput.

## Key Tuning Settings for HDD

### 1. Increase Minimum Allocation Size

Larger allocation sizes reduce fragmentation and improve sequential write patterns:

```bash
ceph config set osd bluestore_min_alloc_size_hdd 65536
```

The default is 4KB (4096) for HDD in Ceph Pacific and later. Setting 64KB reduces fragmentation significantly for most workloads. Consider 128KB for very write-heavy workloads:

```bash
ceph config set osd bluestore_min_alloc_size_hdd 131072
```

**Important:** This value is baked into the OSD at creation time. Changing it after OSD deployment requires destroying and recreating the OSD.

### 2. Increase Maximum Blob Size

Larger blobs mean fewer seeks when reading large objects. The default is 512KB (524288). Increase to 1MB for large-object workloads:

```bash
ceph config set osd bluestore_max_blob_size_hdd 1048576
```

### 3. BlueStore Cache Size for HDD

HDDs benefit from caching metadata heavily in memory. RocksDB reads are the main bottleneck. The default is 1GB (1073741824). Increase to 2GB for better metadata caching:

```bash
ceph config set osd bluestore_cache_size_hdd 2147483648
```

Set to 2-4GB depending on available memory. Very large caches on HDD OSDs may not pay off given the sequential access pattern.

### 4. Tune Deferred Write Batch Operations

HDD benefits from larger deferred write batches to group I/O operations. The default is 64. Increase to 128 for better batching:

```bash
ceph config set osd bluestore_deferred_batch_ops_hdd 128
```

### 5. Separate BlueFS onto SSD (Recommended)

For maximum HDD performance, store RocksDB WAL and SSTs on a fast SSD using `db` and `wal` device classes:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  storage:
    nodes:
      - name: "node1"
        devices:
          - name: "sdb"
            config:
              deviceClass: hdd
        config:
          metadataDevice: "sdc"
```

### 6. Limit OSD Threads

HDDs cannot benefit from deep parallelism due to seek overhead. The default for `osd_op_num_threads_per_shard_hdd` is already 1, but you can reduce the number of shards to further limit parallelism:

```bash
ceph config set osd osd_op_num_shards_hdd 3
```

The default is 5 shards. Reducing to 3 can help on slower drives by limiting concurrent I/O paths.

## Applying Settings via Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    osd:
      bluestore_min_alloc_size_hdd: "65536"
      bluestore_max_blob_size_hdd: "1048576"
      bluestore_cache_size_hdd: "2147483648"
```

## Benchmarking HDD Performance

```bash
rados -p rbd bench 60 write --no-cleanup -t 4 -b 4194304
```

Use 4MB block sizes to test sequential throughput which is where HDD excels.

## Summary

Tuning BlueStore for HDD involves using larger minimum allocation sizes and blob sizes to reduce fragmentation and seeks, caching metadata aggressively in memory, and where possible separating RocksDB to an SSD. These adjustments align I/O patterns with HDD strengths and can significantly improve throughput for sequential workloads.
