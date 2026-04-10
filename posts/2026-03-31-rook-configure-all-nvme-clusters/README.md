# How to Configure Ceph for All-NVMe Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe, Performance, Hardware, Configuration

Description: Tune Ceph and Rook for maximum performance on all-NVMe deployments with CPU pinning, queue depth optimization, and BlueStore settings for ultra-low latency.

---

## NVMe-Specific Challenges for Ceph

NVMe drives can saturate CPU cores before reaching their IOPS limits. A single NVMe can deliver 500K+ IOPS, but Ceph's default single-threaded OSD model becomes the bottleneck. Proper NVMe tuning focuses on CPU parallelism and queue depth.

## Rook OSD Configuration for NVMe

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
          - name: "nvme0n1"
            config:
              deviceClass: nvme
          - name: "nvme1n1"
            config:
              deviceClass: nvme
  resources:
    osd:
      requests:
        cpu: "4"
        memory: "8Gi"
      limits:
        cpu: "8"
        memory: "16Gi"
```

## CPU and Thread Tuning

```bash
# NVMe OSDs need more CPU threads to keep drives busy
ceph config set osd osd_op_num_shards 16
ceph config set osd osd_op_num_threads_per_shard 4

# Enable CPU affinity for OSD processes
ceph config set osd osd_numa_auto_affinity true
```

## BlueStore NVMe Optimizations

```bash
# Large BlueStore cache for NVMe (8 GB per OSD)
ceph config set osd bluestore_cache_size_ssd 8589934592

# Small minimum allocation size for NVMe (benefits small I/O)
ceph config set osd bluestore_min_alloc_size_ssd 4096

# Disable deferred writes for NVMe (write directly to device, avoiding WAL double-write overhead)
ceph config set osd bluestore_prefer_deferred_size_ssd 0
```

## Recovery Settings for NVMe

```bash
# NVMe can handle aggressive recovery
ceph config set osd osd_recovery_max_active_ssd 10
ceph config set osd osd_max_backfills 8
ceph config set osd osd_recovery_sleep_ssd 0
ceph config set osd osd_backfill_scan_max 512
```

## CRUSH Rule for NVMe Tier

```bash
# Create NVMe-specific CRUSH rule
ceph osd crush rule create-replicated nvme-rule default host nvme
```

## Create NVMe Pool for Latency-Sensitive Workloads

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: nvme-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    crush_rule: nvme-rule
```

## Kernel and OS Tuning for NVMe Hosts

```bash
# Set I/O scheduler to none for NVMe (no rotational penalty)
echo none > /sys/block/nvme0n1/queue/scheduler

# Increase NVMe queue depth
echo 1024 > /sys/block/nvme0n1/queue/nr_requests

# Pin NVMe IRQs to specific CPU cores (NUMA-aware)
cat /proc/interrupts | grep nvme
# Then use irqbalance or manual IRQ affinity
```

## Benchmark NVMe OSD Performance

```bash
# Measure raw OSD IOPS
rados -p nvme-pool bench 60 write -b 4096 --no-cleanup
rados -p nvme-pool bench 60 rand

# Compare with raw NVMe device
fio --name=nvme-raw \
    --filename=/dev/nvme0n1 \
    --ioengine=libaio \
    --direct=1 \
    --rw=randread \
    --bs=4k \
    --numjobs=8 \
    --iodepth=64 \
    --time_based --runtime=30
```

## Summary

All-NVMe Ceph clusters require higher OSD thread counts, larger BlueStore caches, minimal allocation sizes matched to NVMe page sizes, and OS-level tuning of I/O schedulers and queue depths. With proper configuration, NVMe Ceph clusters can achieve sub-millisecond latency and hundreds of thousands of IOPS per OSD.
