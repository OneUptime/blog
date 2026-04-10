# How to Configure Ceph for Hot Storage Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Hot Storage, NVMe, SSD, Performance, IOPS, Low Latency

Description: Configure Rook/Ceph for hot storage workloads requiring maximum IOPS and minimum latency using NVMe OSDs, tuned BlueStore settings, and replicated pools.

---

## What is Hot Storage?

Hot storage serves frequently accessed, latency-sensitive data. The access pattern is random reads and writes with high IOPS requirements. Performance is the primary optimization target, while cost per GB is secondary. Typical hot storage workloads include databases, message queues, search indices, and session stores.

## Hardware Requirements for Hot Storage

Hot storage Ceph nodes use NVMe SSDs for maximum IOPS and minimum latency:
- NVMe SSDs (Samsung 990 Pro, Intel P5800X, or enterprise equivalents)
- High-frequency CPUs (3.5 GHz+ for low-latency OSD processing)
- Fast RAM: 4-8 GB per OSD for BlueStore cache
- 25 GbE or 100 GbE networking (NVMe throughput can saturate 10 GbE)

## Optimized Pool Configuration for Hot Workloads

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: hot-nvme-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  deviceClass: nvme
  parameters:
    pg_autoscale_mode: "on"
    compression_mode: "none"   # Compression adds latency - skip for hot
    min_size: "2"
```

## Tuning BlueStore for NVMe Performance

```bash
# Increase BlueStore cache size for NVMe (8 GB per OSD on hot nodes)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set osd.0 bluestore_cache_size_ssd 8589934592  # 8GB

# Disable BlueStore deferred writes (not beneficial for NVMe)
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_prefer_deferred_size 0

# Increase OSD op threads for NVMe parallelism
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_threads_per_shard 4

# Use rocksdb for BlueStore WAL/DB - already on NVMe, optimize settings
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_rocksdb_options \
  "compaction_style=level,write_buffer_size=268435456,compression=kNoCompression"
```

## StorageClass for Hot Workloads

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-hot
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: hot-nvme-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/fstype: xfs  # XFS better for databases
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

## Using Hot Storage for PostgreSQL

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-hot
  namespace: production
spec:
  serviceName: postgres-hot
  selector:
    matchLabels:
      app: postgres-hot
  template:
    metadata:
      labels:
        app: postgres-hot
    spec:
      containers:
        - name: postgres
          image: postgres:16
          env:
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        storageClassName: rook-ceph-hot
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 200Gi
```

## Benchmarking Hot Storage Performance

```bash
# Run FIO benchmark on a hot storage PVC
kubectl exec -n production <pod-name> -- \
  fio --name=randread \
    --ioengine=libaio \
    --iodepth=64 \
    --rw=randread \
    --bs=4k \
    --direct=1 \
    --size=10g \
    --filename=/data/testfile \
    --runtime=60 \
    --group_reporting
```

## Setting Latency Alerts

```promql
# Alert if average OSD write latency exceeds 2ms
(
  rate(ceph_osd_op_w_latency_sum{namespace="rook-ceph"}[5m])
    /
  rate(ceph_osd_op_w_latency_count{namespace="rook-ceph"}[5m])
) * 1000 > 2
```

## Summary

Hot Ceph storage on NVMe OSDs delivers the IOPS and latency required for databases and real-time workloads. Key tuning levers include disabling compression (adds latency), increasing BlueStore cache size, adjusting OSD op thread counts for NVMe parallelism, and disabling deferred writes. Pairing the hot pool with an XFS-formatted StorageClass and deploying databases as StatefulSets with Retain reclaim policy provides both performance and data safety.
