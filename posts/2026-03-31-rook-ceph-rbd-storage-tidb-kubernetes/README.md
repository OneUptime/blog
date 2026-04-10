# How to Set Up Ceph RBD Storage for TiDB on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, TiDB, RBD, Kubernetes, Database

Description: Learn how to configure Ceph RBD block storage for TiDB on Kubernetes using TiDB Operator, with separate volumes for TiKV, PD, and TiFlash components.

---

TiDB is a distributed SQL database with separate compute (TiDB), storage (TiKV), and metadata (PD) components. Each component has specific storage requirements, making Rook-Ceph RBD an excellent backend for TiDB deployments on Kubernetes.

## TiDB Component Storage Requirements

| Component | Storage Role | Size Recommendation |
|-----------|-------------|---------------------|
| TiKV | Key-value storage | Large (100Gi+) |
| PD | Cluster metadata | Small (10Gi) |
| TiFlash | Columnar replica | Large (100Gi+) |
| TiDB | Stateless compute | No persistent storage |

## Creating Component-Specific Pools

```bash
# TiKV pool (largest, most I/O intensive)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create tikv-pool 128 128

# PD pool (small, metadata)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create tidb-pd-pool 32 32

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init tikv-pool

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init tidb-pd-pool
```

## Creating StorageClasses

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-tikv
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: tikv-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-tidb-pd
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: tidb-pd-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Deploying TiDB with TiDB Operator

Install TiDB Operator and deploy a TiDB cluster:

```yaml
apiVersion: pingcap.com/v1alpha1
kind: TidbCluster
metadata:
  name: tidb-cluster
  namespace: tidb
spec:
  version: v7.5.0
  pd:
    replicas: 3
    requests:
      storage: 10Gi
    storageClassName: rook-ceph-tidb-pd
    config:
      replication:
        max-replicas: 3
  tikv:
    replicas: 3
    requests:
      storage: 200Gi
    storageClassName: rook-ceph-tikv
    config:
      storage:
        block-cache:
          capacity: "4GB"
      rocksdb:
        max-open-files: 4096
  tidb:
    replicas: 2
    requests:
      cpu: "1"
      memory: 2Gi
    service:
      type: ClusterIP
```

## TiKV Storage Tuning for RBD

Optimize TiKV's RocksDB for block device storage:

```yaml
tikv:
  config:
    storage:
      block-cache:
        capacity: "4GB"
    rocksdb:
      max-background-jobs: 4
      max-open-files: 4096
      defaultcf:
        # Reduce write amplification
        level0-slowdown-writes-trigger: 20
        level0-stop-writes-trigger: 36
    raftdb:
      max-background-jobs: 2
```

## Monitoring TiKV Storage

```sql
-- Check leader region distribution per store
SELECT count(*), store_id
FROM information_schema.tikv_region_peers
WHERE is_leader = 1
GROUP BY store_id;

-- Check storage usage
SELECT instance, VALUE
FROM metrics_schema.tikv_store_size_bytes
ORDER BY VALUE DESC;
```

## Summary

TiDB's component-based architecture maps naturally to Rook-Ceph's multi-pool design: TiKV uses a large, high-performance pool while PD uses a smaller metadata pool. TiDB Operator simplifies cluster deployment by accepting `storageClassName` fields for each component. Tuning RocksDB block cache and background job concurrency in TiKV ensures optimal performance on RBD-backed SSD storage.
