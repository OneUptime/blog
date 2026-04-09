# How to Set Up Priority-Based Storage Classes in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Storage Class, Priority, Performance, QoS

Description: Create priority-based storage classes in Rook-Ceph that map to different performance tiers, enabling workloads to select appropriate storage based on latency and IOPS requirements.

---

## Priority-Based Storage Architecture

Priority-based storage classes map application performance requirements to Ceph storage tiers. High-priority classes use NVMe or SSD-backed pools with stricter QoS. Lower-priority classes use HDD pools with compression for cost efficiency.

## Define the Storage Tiers

Create Ceph pools for each priority tier:

```yaml
# High priority: NVMe-backed pool
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
---
# Standard priority: SSD-backed pool
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ssd-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    crush_rule: ssd-rule
---
# Bulk priority: HDD-backed pool with compression
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

## Create Priority-Named StorageClasses

```yaml
# High priority storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-priority-high
  annotations:
    description: "NVMe-backed, low-latency storage for databases"
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: nvme-pool
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
---
# Standard priority
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-priority-standard
  annotations:
    description: "SSD-backed storage for general application use"
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: ssd-pool
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
---
# Bulk/archive priority
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-priority-bulk
  annotations:
    description: "HDD-backed compressed storage for logs and archives"
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: hdd-pool
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Apply QoS at the Ceph Level

```bash
# Set per-pool RBD QoS IOPS limits (applies to each image in the pool)
rbd config pool set nvme-pool rbd_qos_iops_limit 50000
rbd config pool set ssd-pool rbd_qos_iops_limit 10000
rbd config pool set hdd-pool rbd_qos_iops_limit 2000

# Bandwidth limits
rbd config pool set hdd-pool rbd_qos_bps_limit 524288000  # 500 MB/s
```

## Usage in Application PVCs

```yaml
# Database PVC - uses high priority
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-storage
spec:
  storageClassName: ceph-priority-high
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 100Gi
---
# Log archive PVC - uses bulk priority
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: log-archive
spec:
  storageClassName: ceph-priority-bulk
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 5Ti
```

## Monitor Per-Tier Performance

```bash
# Compare latency across pools
ceph osd pool stats nvme-pool
ceph osd pool stats ssd-pool
ceph osd pool stats hdd-pool

# Watch real-time pool I/O
watch -n2 "ceph osd pool stats | grep -A4 'pool '"
```

## Summary

Priority-based storage classes in Rook-Ceph map performance tiers to Ceph pools backed by different hardware. NVMe-backed classes serve latency-sensitive databases, SSD classes serve general applications, and HDD classes with compression serve bulk or archive workloads. Pool-level QoS settings provide additional guarantees to prevent lower-priority workloads from impacting high-priority ones.
