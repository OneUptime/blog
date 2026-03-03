# How to Configure StorageClasses on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, StorageClasses, Storage, Persistent Storage, CSI

Description: A detailed guide to creating and managing Kubernetes StorageClasses on Talos Linux for different storage backends and workload needs.

---

StorageClasses define the types of storage available in your Kubernetes cluster. They act as the bridge between PersistentVolumeClaims and the actual storage backends, controlling how volumes are provisioned, what performance characteristics they have, and what happens when they are no longer needed. On Talos Linux, properly configured StorageClasses are essential because every piece of persistent data must flow through Kubernetes storage primitives.

This guide covers creating StorageClasses for different backends, tuning them for specific workloads, and managing them across your Talos Linux cluster.

## StorageClass Basics

A StorageClass consists of a few key fields:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: example-storage
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: example.com/provisioner  # CSI driver name
parameters:                            # Backend-specific settings
  type: ssd
reclaimPolicy: Delete                  # What happens when PVC is deleted
volumeBindingMode: Immediate           # When to bind the volume
allowVolumeExpansion: true             # Whether volumes can grow
mountOptions:                          # Options passed to mount
  - discard
```

## Setting a Default StorageClass

Your cluster should have exactly one default StorageClass. When a PVC does not specify a StorageClass, the default is used:

```bash
# Check current default
kubectl get storageclass

# Set a StorageClass as default
kubectl patch storageclass longhorn \
  -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

# Remove default from another StorageClass
kubectl patch storageclass old-default \
  -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'
```

## StorageClass for Local Path Provisioner

The local path provisioner is one of the simplest storage options for Talos Linux:

```bash
# Install the local path provisioner
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml
```

```yaml
# local-path-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

The `WaitForFirstConsumer` binding mode is crucial for local storage. It delays volume provisioning until a pod using the PVC is scheduled, so the volume gets created on the right node.

## StorageClass for Rook-Ceph Block Storage

```yaml
# ceph-block-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicated-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
  - discard
```

## StorageClass for Rook-Ceph Filesystem (CephFS)

```yaml
# cephfs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-filesystem
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-default
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## StorageClass for Longhorn

```yaml
# longhorn-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "2880"
  fromBackup: ""
  fsType: ext4
```

## StorageClass for NFS

```yaml
# nfs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-shared
provisioner: nfs.csi.k8s.io
parameters:
  server: 192.168.1.100
  share: /exports/kubernetes
  subDir: "${pvc.metadata.namespace}/${pvc.metadata.name}"
reclaimPolicy: Delete
volumeBindingMode: Immediate
mountOptions:
  - nfsvers=4.1
  - hard
  - noresvport
```

## Creating Workload-Specific StorageClasses

Rather than using a one-size-fits-all approach, create StorageClasses tailored to different workload types:

```yaml
# For databases - high performance, data retention
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: database-storage
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: ssd-pool
  imageFormat: "2"
  imageFeatures: layering,exclusive-lock,object-map,fast-diff
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/fstype: xfs
reclaimPolicy: Retain
allowVolumeExpansion: true
mountOptions:
  - discard
  - noatime
---
# For logs - bulk storage, automatic cleanup
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: log-storage
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: hdd-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
---
# For temporary build artifacts
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ephemeral-storage
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

## Volume Binding Modes

Understanding binding modes is critical for Talos Linux:

```yaml
# Immediate - PV is created as soon as PVC is submitted
# Use for network storage that is accessible from any node
volumeBindingMode: Immediate

# WaitForFirstConsumer - PV is created when a pod using the PVC is scheduled
# Use for local storage and topology-aware provisioning
volumeBindingMode: WaitForFirstConsumer
```

Always use `WaitForFirstConsumer` for local storage classes. If you use `Immediate`, the volume might be created on a different node than where the pod ends up running, causing a scheduling failure.

## Allowed Topologies

Restrict which nodes can provision volumes:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: zone-a-storage
provisioner: driver.longhorn.io
allowedTopologies:
  - matchLabelExpressions:
      - key: topology.kubernetes.io/zone
        values:
          - zone-a
parameters:
  numberOfReplicas: "2"
reclaimPolicy: Delete
```

## Managing StorageClasses

```bash
# List all StorageClasses
kubectl get storageclass

# Get details about a StorageClass
kubectl describe storageclass ceph-block

# Delete a StorageClass (existing PVs are not affected)
kubectl delete storageclass old-storage

# Check which PVCs use a specific StorageClass
kubectl get pvc -A -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,STORAGECLASS:.spec.storageClassName,STATUS:.status.phase'
```

## StorageClass for Snapshot Support

If you need volume snapshots, create a matching VolumeSnapshotClass:

```yaml
# snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ceph-block-snapshot
  labels:
    velero.io/csi-volumesnapshot-class: "true"
driver: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
deletionPolicy: Delete
```

## Troubleshooting StorageClass Issues

```bash
# PVC pending - check if provisioner is running
kubectl get pods -A | grep provisioner

# Check provisioner logs
kubectl logs -n rook-ceph deploy/csi-rbdplugin-provisioner -c csi-provisioner

# Verify StorageClass parameters are correct
kubectl get storageclass ceph-block -o yaml

# Check for events related to storage provisioning
kubectl get events -A --field-selector reason=ProvisioningFailed
```

## Summary

StorageClasses are the control layer for storage provisioning on Talos Linux. By creating purpose-built StorageClasses for different workload types, you give your teams clear choices for storage without requiring them to understand the underlying infrastructure. The key decisions for each StorageClass are the reclaim policy (protecting important data vs cleaning up automatically), the binding mode (immediate vs waiting for pod scheduling), and volume expansion support. Getting these right from the start prevents data loss and scheduling problems down the line.
