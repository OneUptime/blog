# How to Set Up Rook-Ceph Example Configurations for Cloud/PVC Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cloud, PVC, Kubernetes, Storage

Description: Learn how to configure Rook-Ceph using PVC-backed OSDs for cloud Kubernetes environments where raw block devices are provisioned as persistent volumes.

---

## Cloud vs Bare Metal Deployments

In cloud Kubernetes environments (AWS EKS, GKE, AKS, etc.), nodes typically do not have raw unused block devices. Instead, cloud providers offer block storage volumes (EBS, GCE PD, Azure Disk) that can be attached as Kubernetes PersistentVolumes.

Rook supports PVC-backed OSDs through `StorageClassDeviceSets`, where each OSD uses a PVC as its backing device instead of a raw disk.

## Prerequisites

```bash
# Verify a StorageClass exists that provides block volumes
kubectl get storageclass

# A StorageClass that supports:
# - ReadWriteOnce access mode
# - Block volume mode (volumeMode: Block)
```

```bash
# Verify a StorageClass supports block mode
kubectl get storageclass gp2 -o yaml | grep volumeBindingMode
```

## PVC-Based OSD Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
    volumeClaimTemplate:
      spec:
        storageClassName: gp2
        resources:
          requests:
            storage: 10Gi
  mgr:
    count: 2
  storage:
    storageClassDeviceSets:
      - name: set1
        count: 3
        portable: true
        encrypted: false
        volumeClaimTemplates:
          - metadata:
              name: data
            spec:
              resources:
                requests:
                  storage: 100Gi
              storageClassName: gp2-block
              volumeMode: Block
              accessModes:
                - ReadWriteOnce
```

## Creating a Block StorageClass

Cloud provider default StorageClasses may use filesystem mode. You need a `Block` mode StorageClass for Ceph OSDs:

```yaml
# AWS EBS block StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp2-block
provisioner: ebs.csi.aws.com
parameters:
  type: gp2
  encrypted: "false"
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```yaml
# GKE block StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-ssd-block
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

## StorageClassDeviceSets Explained

```yaml
storage:
  storageClassDeviceSets:
    - name: set1          # Name for this set of OSDs
      count: 3            # Number of OSDs to create
      portable: true      # OSDs can be rescheduled to other nodes
      encrypted: false    # Disk-level encryption
      volumeClaimTemplates:
        - metadata:
            name: data    # Main data volume
          spec:
            resources:
              requests:
                storage: 500Gi
            storageClassName: gp2-block
            volumeMode: Block
            accessModes:
              - ReadWriteOnce
        - metadata:
            name: metadata  # Optional: separate metadata device (WAL/DB)
          spec:
            resources:
              requests:
                storage: 10Gi
            storageClassName: gp2-io1  # Faster SSD for metadata
            volumeMode: Block
            accessModes:
              - ReadWriteOnce
        - metadata:
            name: wal     # Optional: separate WAL device
          spec:
            resources:
              requests:
                storage: 10Gi
            storageClassName: gp2-io1
            volumeMode: Block
            accessModes:
              - ReadWriteOnce
```

## portable: true vs portable: false

```text
portable: true
- OSD pods can be scheduled on any node that can claim the PVC
- The PVC moves with the OSD pod when rescheduled
- Recommended for cloud environments where nodes may be replaced
- Better for cloud environments with autoscaling node groups

portable: false
- OSD is bound to the node where the PVC was first created
- Faster scheduling (no PVC movement needed)
- Better for bare metal with PVC-based storage
```

## PVC Monitor Configuration

For cloud deployments, monitors should also use PVCs to survive node replacements:

```yaml
spec:
  mon:
    count: 3
    volumeClaimTemplate:
      spec:
        storageClassName: gp2
        resources:
          requests:
            storage: 10Gi
```

## Verifying PVC-Based Deployment

```bash
# Check that PVCs are created for OSDs
kubectl -n rook-ceph get pvc | grep set1

# Check OSD pods
kubectl -n rook-ceph get pods -l app=rook-ceph-osd

# Verify OSD status in Ceph
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd status
```

```text
+----+-----------+-------+-------+--------+---------+--------+---------+-----------+
| id |    host   |  used | avail | wr ops | wr data | rd ops | rd data |   state   |
+----+-----------+-------+-------+--------+---------+--------+---------+-----------+
|  0 | node-aaa  | 5171M |  94.8G|     0  |     0   |    0   |     0   | exists,up |
|  1 | node-bbb  | 5171M |  94.8G|     0  |     0   |    0   |     0   | exists,up |
|  2 | node-ccc  | 5171M |  94.8G|     0  |     0   |    0   |     0   | exists,up |
```

## Summary

Rook-Ceph PVC-based deployments use `storageClassDeviceSets` to provision OSDs backed by cloud block volumes rather than raw disks. Each OSD gets a PVC from a `Block` volumeMode StorageClass. Set `portable: true` for cloud environments so OSD pods can reschedule freely, configure monitors with PVC templates to survive node replacements, and optionally separate WAL and metadata onto faster storage classes to improve write performance.
