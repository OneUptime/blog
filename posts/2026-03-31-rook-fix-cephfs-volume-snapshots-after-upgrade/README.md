# How to Fix CephFS Volume Snapshots Not Ready After Rook Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Snapshot, Upgrade

Description: Learn how to diagnose and fix CephFS VolumeSnapshot resources stuck in a not-ready state after upgrading Rook-Ceph in Kubernetes.

---

## Why Snapshots Break After Rook Upgrades

After upgrading Rook-Ceph, existing CephFS VolumeSnapshot resources may become stuck in a `readyToUse: false` state. Common causes include:

- The CSI snapshot controller version mismatch with the new CSI driver
- CephFS snapshot class annotations changed between versions
- Existing `VolumeSnapshotContent` objects referencing deprecated driver names
- The `external-snapshotter` controller not restarted after the upgrade

## Step 1 - Check VolumeSnapshot Status

Identify which snapshots are stuck:

```bash
kubectl get volumesnapshot -A
kubectl describe volumesnapshot <snapshot-name> -n <namespace>
```

Look for events like:

```text
Failed to create snapshot: rpc error: code = Internal desc = failed to create snapshot
```

## Step 2 - Check the VolumeSnapshotClass

Verify the snapshot class references the correct driver after the upgrade:

```bash
kubectl get volumesnapshotclass -o yaml
```

The driver name should match what the new Rook CSI version expects:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-cephfsplugin-snapclass
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: rook-ceph.cephfs.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
```

## Step 3 - Restart the External Snapshotter

After a Rook upgrade, restart the snapshot controller to pick up the new driver registration:

```bash
kubectl rollout restart deployment/snapshot-controller -n kube-system
kubectl rollout restart deployment/snapshot-validation-webhook -n kube-system
```

Also restart the CephFS CSI provisioner:

```bash
kubectl rollout restart deployment/csi-cephfsplugin-provisioner -n rook-ceph
```

## Step 4 - Check and Update VolumeSnapshotContent

For snapshots already stuck, check the `VolumeSnapshotContent` that was created:

```bash
kubectl get volumesnapshotcontent
kubectl describe volumesnapshotcontent <content-name>
```

If the content has the wrong driver, delete and recreate the VolumeSnapshot:

```bash
kubectl delete volumesnapshot <snapshot-name> -n <namespace>
```

Then recreate:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: myfs-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: csi-cephfsplugin-snapclass
  source:
    persistentVolumeClaimName: myfs-pvc
```

## Step 5 - Validate the CephFS Snapshot in Ceph

Confirm the underlying Ceph snapshot was actually created:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs subvolume snapshot ls myfs <subvolume> --group_name <group>
```

## Step 6 - Upgrade the Snapshot CRDs If Needed

Rook upgrades may require updating the VolumeSnapshot CRDs:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v8.0.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v8.0.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v8.0.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
```

## Summary

CephFS VolumeSnapshots stuck after Rook upgrades are usually caused by a stale snapshot controller, mismatched driver names in the VolumeSnapshotClass, or outdated snapshot CRDs. Fix the issue by restarting the external-snapshotter controller, verifying the VolumeSnapshotClass driver name, and recreating stuck snapshots. Always upgrade the snapshot CRDs in lockstep with the CSI driver version.
