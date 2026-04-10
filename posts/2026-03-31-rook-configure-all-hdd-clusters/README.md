# How to Configure Ceph for All-HDD Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, HDD, Configuration, Hardware, Capacity

Description: Optimize Ceph configuration for all-HDD deployments by tuning BlueStore for rotational media, adjusting recovery rates, and configuring journal settings.

---

## HDD Characteristics That Drive Configuration

HDDs have high sequential throughput but poor random I/O. Seek times of 5-10ms mean that random small writes are extremely expensive. Ceph's BlueStore addresses this with write-ahead logging, but HDD tuning requires care to avoid WAL overflow and fragmentation.

## Rook CephCluster for HDD Deployment

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
          - name: "sdb"
            config:
              deviceClass: hdd
          - name: "sdc"
            config:
              deviceClass: hdd
  resources:
    osd:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
```

## BlueStore Tuning for HDDs

```bash
# Smaller cache is sufficient for HDDs (rotational is slower)
ceph config set osd bluestore_cache_size_hdd 1073741824   # 1 GB

# Larger minimum allocation size reduces WAL pressure
ceph config set osd bluestore_min_alloc_size_hdd 65536    # 64 KB

# Enable deferred writes to batch small random writes
ceph config set osd bluestore_prefer_deferred_size_hdd 65536

# Limit concurrent compaction to avoid I/O contention
ceph config set osd bluestore_rocksdb_options "compression=kNoCompression,max_write_buffer_number=4"
```

## Recovery Settings for HDDs

```bash
# HDDs cannot handle aggressive recovery without impacting client I/O
ceph config set osd osd_recovery_max_active_hdd 3
ceph config set osd osd_max_backfills 1

# Add recovery sleep to yield I/O time to clients
ceph config set osd osd_recovery_sleep_hdd 0.1

# Limit scrubbing to off-hours only
ceph config set osd osd_scrub_begin_hour 1
ceph config set osd osd_scrub_end_hour 5
```

## Thread Count for HDDs

```bash
# HDDs saturate with fewer threads than SSDs
ceph config set osd osd_op_num_shards_hdd 5
ceph config set osd osd_op_num_threads_per_shard_hdd 1
```

## Sequential I/O Optimization

```bash
# Enable read-ahead for sequential workloads
blockdev --setra 8192 /dev/sdb  # 4 MB read-ahead

# Set I/O scheduler - deadline works well for HDDs
echo mq-deadline > /sys/block/sdb/queue/scheduler

# Tune rotational disk queue depth
echo 128 > /sys/block/sdb/queue/nr_requests
```

## Create HDD Storage Pool

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: hdd-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    crush_rule: hdd-rule
    compression_mode: aggressive
    compression_algorithm: zstd
```

## Monitor HDD-Specific Health

```bash
# Check for slow OSD requests (indicator of HDD saturation)
ceph health detail | grep "slow requests"

# Get per-OSD latency
ceph osd perf | sort -k3 -n | tail -10  # Sort by apply latency

# Check OSD operation queue depth (indicator of HDD saturation)
ceph daemon osd.0 dump_ops_in_flight
```

## Summary

All-HDD Ceph clusters benefit from larger minimum allocation sizes, deferred write buffering, conservative recovery rates with sleep intervals, and sequential I/O optimizations. Tuning BlueStore for rotational media characteristics prevents the most common HDD performance pitfalls: WAL overflow and background I/O contention with client operations.
