# How to Create Separate Pools for Hot and Cold Data in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Storage, Hot Storage, Cold Storage, Kubernetes

Description: Learn how to create separate Ceph pools for hot and cold data tiers, using device classes to route active data to SSDs and archival data to HDDs.

---

## Hot vs. Cold Data in Ceph

Hot data requires low latency and high IOPS - think active database volumes, frequently accessed objects, and real-time metrics. Cold data is infrequently accessed but must be stored durably and cost-effectively - think backups, audit logs, and archival datasets.

Ceph supports device classes (SSD, HDD, NVMe) that allow you to create pools that target specific hardware tiers.

## Labeling OSD Device Classes

First, verify that OSDs are labeled with the correct device class:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree
```

If labels are missing, set them manually:

```bash
# Mark OSD 0 as SSD
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush set-device-class ssd osd.0

# Mark OSD 3 as HDD
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush set-device-class hdd osd.3
```

## Creating the Hot Pool (SSD-backed)

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: hot-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  deviceClass: ssd
  parameters:
    pg_autoscale_mode: "on"
    compression_mode: "none"
```

```bash
kubectl apply -f hot-pool.yaml
```

## Creating the Cold Pool (HDD-backed with EC)

For cold storage, erasure coding reduces overhead compared to 3x replication:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: cold-pool
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  deviceClass: hdd
  parameters:
    pg_autoscale_mode: "on"
    compression_mode: "aggressive"
```

## Creating a Metadata Pool for the Cold EC Pool

RBD requires a replicated pool for image metadata, even when the data itself is stored in an erasure-coded pool. Create a small replicated metadata pool on HDDs:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: cold-pool-metadata
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  deviceClass: hdd
```

## Creating StorageClasses for Each Tier

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-hot
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: hot-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-cold
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: cold-pool-metadata
  dataPool: cold-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
volumeBindingMode: Immediate
```

## Verifying Pool Placement

After creating volumes, confirm they are backed by the correct OSDs:

```bash
# Check which OSDs back a specific pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd dump | grep "hot-pool\|cold-pool"

# Verify device class usage
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df detail
```

## Moving Data Between Tiers

When data transitions from hot to cold, you can create a new PVC in the cold storage class and copy data using tools like `rclone` or Kubernetes jobs - Ceph does not natively move data between pools automatically without cache tiering.

## Summary

Creating separate hot and cold pools in Ceph involves labeling OSD device classes, defining CephBlockPool resources targeting those classes, and creating corresponding StorageClasses. This approach lets you cost-effectively store archival data on HDDs while keeping active workloads on high-performance SSDs, all within the same Ceph cluster.
