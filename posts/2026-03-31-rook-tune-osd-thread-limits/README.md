# How to Tune OSD Thread Limits in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Performance, Threading

Description: Learn how to configure Ceph OSD thread limits and operation queues to balance throughput, latency, and resource usage in production clusters.

---

## OSD Threading Architecture

Each Ceph OSD uses multiple thread pools to handle client I/O, recovery, scrubbing, and internal operations. Tuning thread counts affects how the OSD balances concurrent work - too few threads limit throughput, too many waste CPU and increase context switching overhead.

## Key Threading Parameters

The main OSD thread settings are:

| Parameter | Default (SSD) | Default (HDD) | Description |
| --- | --- | --- | --- |
| `osd_op_num_threads_per_shard_ssd` | 2 | - | Threads per I/O shard for SSDs/NVMe |
| `osd_op_num_threads_per_shard_hdd` | - | 5 | Threads per I/O shard for HDDs |
| `osd_op_num_shards_ssd` | 8 | - | Number of I/O operation shards for SSDs/NVMe |
| `osd_op_num_shards_hdd` | - | 1 | Number of I/O operation shards for HDDs |
| `osd_recovery_max_active` | 10 | 3 | Maximum concurrent recovery operations |

## Configuring I/O Threads

The OSD uses a sharded thread pool for client I/O. Increase shards on NVMe-based OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_shards 16

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_threads_per_shard 2
```

For HDD-based OSDs, fewer shards are appropriate since HDDs cannot parallelize I/O as effectively:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_shards 4
```

## Recovery Tuning

The `osd_recovery_max_active` parameter controls how many recovery operations run concurrently per OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_max_active 5
```

Increasing this value speeds up recovery but competes with client I/O. Pair this with a lower recovery priority:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_op_priority 3
```

## Applying Settings via Rook CephCluster CR

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    "osd.*":
      osd_op_num_shards_ssd: "8"
      osd_op_num_threads_per_shard_ssd: "2"
      osd_recovery_max_active: "5"
      osd_recovery_op_priority: "3"
```

## Monitoring Thread Utilization

Check current OSD operation queues to determine if threads are saturated:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 dump_ops_in_flight | head -20
```

View OSD thread count and CPU usage from within the OSD pod:

```bash
OSD_POD=$(kubectl -n rook-ceph get pods -l app=rook-ceph-osd,ceph-osd-id=0 -o name)
kubectl -n rook-ceph exec $OSD_POD -- ps -T -p 1
```

## Disk Queue Depth

For NVMe OSDs, also tune the bluestore async I/O threads:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_aio_max_queue_depth 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_rocksdb_options "max_background_jobs=8"
```

## Summary

OSD thread tuning controls how Ceph allocates CPU resources across client I/O, recovery, and internal tasks. Use more I/O shards for NVMe OSDs and fewer for HDDs. Keep recovery thread priority low in production to protect client I/O. Apply changes via `ceph config set` or the Rook `CephCluster` CR's `cephConfig` field, and monitor with `ceph tell osd.X dump_ops_in_flight`.
