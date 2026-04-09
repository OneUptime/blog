# How to Enable Snapshot Support in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Helm, Snapshot, CSI

Description: Enable VolumeSnapshot support in Rook-Ceph by configuring the Helm chart to deploy CSI snapshotter sidecars and snapshot controller components.

---

## Overview

Kubernetes VolumeSnapshots allow point-in-time copies of PersistentVolumes. Rook-Ceph supports snapshots for both RBD (block) and CephFS volumes. Enabling snapshot support requires both the snapshot controller (cluster-wide) and the CSI snapshotter sidecar (per driver).

## Prerequisites

Verify that VolumeSnapshot CRDs are installed in your cluster:

```bash
kubectl get crd | grep volumesnapshot
```

You should see:
```text
volumesnapshotclasses.snapshot.storage.k8s.io
volumesnapshotcontents.snapshot.storage.k8s.io
volumesnapshots.snapshot.storage.k8s.io
```

If missing, install the snapshot CRDs:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
```

## Helm Chart Configuration

Enable snapshotters for both drivers in the operator chart values:

```yaml
csi:
  enableRBDSnapshotter: true
  enableCephfsSnapshotter: true

  # Optional: set the snapshotter image version
  snapshotter:
    repository: registry.k8s.io/sig-storage/csi-snapshotter
    tag: v6.3.0
```

## Applying the Configuration

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f rook-snapshot-values.yaml
```

Verify the snapshotter sidecar is running in provisioner pods:

```bash
kubectl get pod -n rook-ceph -l app=csi-rbdplugin-provisioner \
  -o jsonpath='{.items[0].spec.containers[*].name}'
```

The output should include `csi-snapshotter`.

## Creating VolumeSnapshotClass

After enabling the snapshotter, create a `VolumeSnapshotClass`:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-rbdplugin-snapclass
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: rook-ceph.rbd.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
```

## Taking a Snapshot

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: my-pvc-snapshot
spec:
  volumeSnapshotClassName: csi-rbdplugin-snapclass
  source:
    persistentVolumeClaimName: my-pvc
```

```bash
kubectl apply -f snapshot.yaml
kubectl get volumesnapshot my-pvc-snapshot
```

## Summary

Enabling snapshot support in the Rook Helm chart requires setting `enableRBDSnapshotter` and `enableCephfsSnapshotter` to true, ensuring snapshot CRDs are pre-installed, and creating `VolumeSnapshotClass` resources. Once configured, VolumeSnapshots provide a fast, Ceph-native way to protect stateful workloads.
