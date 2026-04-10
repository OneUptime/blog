# How to Set Up Data Tiering with Ceph Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Tiering, Storage Pool, NVMe, SSD, HDD, Performance, Cost

Description: Configure multi-tier storage with Ceph by creating separate pools backed by NVMe, SSD, and HDD device classes to match data access patterns with appropriate storage performance and cost.

---

## Why Data Tiering Matters

Not all data has the same access frequency or performance requirements. A tiered storage approach assigns data to the most cost-effective storage based on access patterns:

- **Hot tier (NVMe)**: Actively accessed databases, indices, transactional data
- **Warm tier (SSD)**: Recent logs, intermediate analytics results, application files
- **Cold tier (HDD)**: Archive data, compliance backups, historical records

Ceph device classes (nvme, ssd, hdd) make this straightforward to configure without custom CRUSH rules.

## Labeling OSDs by Device Class

Ceph automatically detects device classes via OSD metadata. Verify assignment:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd tree | grep -E "osd|class"

# Manually set a device class if auto-detection is wrong
# First remove the existing (incorrect) class, then set the correct one
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd crush rm-device-class osd.0 osd.1 osd.2
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd crush set-device-class nvme osd.0 osd.1 osd.2
```

## Creating Tier-Specific Pools

```yaml
# Hot tier pool - NVMe OSDs
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
    compression_mode: none
```

```yaml
# Warm tier pool - SSD OSDs
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: warm-ssd-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  deviceClass: ssd
  parameters:
    pg_autoscale_mode: "on"
    compression_mode: passive
```

```yaml
# Cold tier pool - HDD OSDs with erasure coding
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: cold-hdd-pool
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  deviceClass: hdd
  parameters:
    compression_mode: aggressive
```

## Tier-Specific StorageClasses

Create a StorageClass for each tier:

```yaml
# Hot tier StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-hot
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: hot-nvme-pool
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
---
# Warm tier StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-warm
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: warm-ssd-pool
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Assigning Workloads to Tiers

Choose the StorageClass that matches the workload:

```yaml
# Database - hot tier
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  storageClassName: rook-ceph-hot
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 100Gi
---
# Log aggregation - warm tier
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: log-aggregation
spec:
  storageClassName: rook-ceph-warm
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 500Gi
```

## Monitoring Per-Tier Usage

```promql
# Usage per pool (proxies for tier usage)
ceph_pool_bytes_used{name=~"hot-nvme-pool|warm-ssd-pool|cold-hdd-pool"}
```

## Summary

Ceph device classes make multi-tier storage straightforward without manual CRUSH map editing. By creating separate pools backed by NVMe, SSD, and HDD OSDs, and exposing them as distinct Kubernetes StorageClasses, operators can match workload performance requirements to the appropriate storage tier. This reduces costs by reserving expensive NVMe capacity for performance-sensitive workloads while storing cold data on economical HDD with erasure coding.
