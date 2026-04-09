# How to Handle Encrypted Snapshot Constraints in Rook CSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Snapshot, Kubernetes

Description: Understand the constraints around creating and restoring snapshots of encrypted RBD volumes in Rook CSI and how to work within them.

---

## Overview

When using encrypted RBD volumes in Rook CSI, snapshots and restores have specific constraints that differ from unencrypted volumes. Understanding these constraints prevents data loss and ensures encrypted data remains protected throughout its lifecycle.

## Constraint 1 - Snapshots Inherit Encryption

Snapshots of encrypted RBD volumes can only be restored to encrypted PVCs using the same KMS configuration. You cannot create an unencrypted snapshot from an encrypted volume, and restoring requires that the new PVC reference an encrypted StorageClass with the same KMS backend so the encryption passphrase can be retrieved:

```yaml
# Snapshot source must be encrypted
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: encrypted-source
spec:
  storageClassName: rook-ceph-block-encrypted  # encrypted StorageClass
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Constraint 2 - Same KMS for Restore

When restoring an encrypted snapshot, the restore PVC must use the same KMS backend that was used to encrypt the original volume. Cross-KMS restores are not supported:

```yaml
# Restore PVC must reference the same encrypted StorageClass (same KMS)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: encrypted-restored
spec:
  storageClassName: rook-ceph-block-encrypted  # must match original KMS
  dataSource:
    name: encrypted-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Constraint 3 - VolumeSnapshotClass Must Be Properly Configured

The VolumeSnapshotClass used for snapshots (encrypted or not) must include the Ceph authentication secrets. These are standard parameters required for all RBD snapshot operations, not encryption-specific, but they must be present for encrypted snapshot workflows to succeed:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-rbdplugin-snapclass
driver: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
deletionPolicy: Delete
```

## Constraint 4 - Volume Group Snapshots and Encryption

For volume group snapshots with encrypted volumes, all volumes in the group must share the same KMS configuration. Mixing encrypted and unencrypted volumes in the same group snapshot is not supported:

```bash
# Verify all PVCs in the group use the same StorageClass
kubectl get pvc -l app=mydb-snapshot-group -o jsonpath='{.items[*].spec.storageClassName}'
```

## Debugging Encrypted Snapshot Failures

If snapshot creation fails for an encrypted volume, check the CSI provisioner logs:

```bash
kubectl logs -n rook-ceph deployment/csi-rbdplugin-provisioner -c csi-snapshotter | grep -i "error\|encrypt"
```

Common errors include:

```text
- "failed to get encryption passphrase" - KMS secret not found
- "rbd: snap create failed" - Ceph-level snapshot error
- "missing KMS configuration" - encryptionKMSID not set in StorageClass
```

## Verify Snapshot Encryption Status

Confirm a snapshot was captured correctly using the rook toolbox:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rbd snap ls replicapool/<volume-name>
```

The snapshot should appear in the pool alongside its parent encrypted image.

## Summary

Encrypted RBD volume snapshots in Rook CSI carry forward their encryption properties automatically, but restore operations require strict alignment between the source and destination KMS configurations. By understanding these constraints - same KMS for restore, encrypted StorageClass for the restore PVC, and properly configured VolumeSnapshotClass - teams can safely manage the complete lifecycle of encrypted volumes.
