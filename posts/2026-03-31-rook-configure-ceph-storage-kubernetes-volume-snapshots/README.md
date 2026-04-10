# How to Configure Ceph Storage for Kubernetes Volume Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Volume Snapshot, CSI, Storage Configuration

Description: Step-by-step guide to configure Rook-Ceph storage classes and snapshot classes so Kubernetes workloads can take and restore volume snapshots.

---

## Introduction

Kubernetes volume snapshots depend on proper configuration of the CSI driver, StorageClass, and VolumeSnapshotClass. This guide covers the full configuration chain for enabling reliable snapshot workflows on a Rook-Ceph cluster.

## Step 1 - Verify CSI Snapshot Controller

The snapshot controller must be running in the cluster. Check its status:

```bash
kubectl get pods -n kube-system | grep snapshot
```

If not present, install it:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

## Step 2 - Configure the RBD StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

Note: `imageFeatures: layering` is required for snapshot support.

## Step 3 - Create a VolumeSnapshotClass

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: rook-ceph-rbd-snapclass
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: rook-ceph.rbd.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
```

Apply and verify:

```bash
kubectl apply -f volumesnapshotclass.yaml
kubectl get volumesnapshotclass
```

## Step 4 - Create a Test PVC and Snapshot

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  storageClassName: rook-ceph-block
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: test-snapshot
spec:
  volumeSnapshotClassName: rook-ceph-rbd-snapclass
  source:
    persistentVolumeClaimName: test-pvc
```

Check snapshot status:

```bash
kubectl describe volumesnapshot test-snapshot
kubectl get volumesnapshotcontent
```

## Step 5 - Verify at the Ceph Layer

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd snap ls replicapool/$(kubectl get pv $(kubectl get pvc test-pvc -o jsonpath='{.spec.volumeName}') -o jsonpath='{.spec.csi.volumeAttributes.imageName}')
```

## Summary

Configuring Ceph for Kubernetes volume snapshots requires the CSI snapshot controller, a properly annotated StorageClass with layering image features, and a matching VolumeSnapshotClass. Once configured, snapshots and restores are declarative Kubernetes operations that translate to native Ceph RBD snapshot commands under the hood.
