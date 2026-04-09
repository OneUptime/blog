# How to Enforce PVC Quotas with CephFS in Rook (Kernel 4.17+)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Quota, PersistentVolumeClaim

Description: Learn how to enforce storage quotas on CephFS PVCs in Rook using kernel 4.17+ directory quota support to limit per-volume capacity consumption.

---

## Overview

CephFS supports directory-level quotas that limit how much data a specific directory subtree can consume. Rook uses these quotas when provisioning CephFS PVCs to enforce the storage limit requested in the PVC spec. This feature requires Linux kernel 4.17 or later on all nodes that mount CephFS volumes. This guide covers enabling and verifying CephFS PVC quotas in Rook.

## Kernel Version Requirement

CephFS quota enforcement in the kernel client requires kernel 4.17+. Prior to 4.17, quotas are set in Ceph metadata but not enforced by the kernel client, meaning applications can write beyond the PVC size limit.

Verify kernel versions across your nodes:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion
```

All nodes that will mount CephFS PVCs must show 4.17 or higher.

## Enabling Quota Enforcement in the StorageClass

Rook CephFS StorageClasses enable quotas by default when the underlying kernel supports them. Verify the StorageClass configuration:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-replicated
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Creating a PVC with a Storage Limit

Request a PVC with a specific size. Rook will set a CephFS quota matching this size:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: quota-test-pvc
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 5Gi
  storageClassName: rook-cephfs
```

```bash
kubectl apply -f quota-test-pvc.yaml
kubectl get pvc quota-test-pvc
```

## Verifying the Quota on the CephFS Directory

Once the PVC is bound, verify the quota was set on the corresponding CephFS subvolume:

```bash
# Find the subvolume path
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs subvolume getpath myfs <subvolume-name> --group_name=csi

# Check the quota attribute on that path
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs subvolume info myfs <subvolume-name> --group_name=csi | grep bytes_quota
```

You should see:

```json
{
  "bytes_quota": 5368709120
}
```

## Testing Quota Enforcement

Mount the PVC and attempt to write beyond the limit:

```bash
kubectl run quota-test --image=busybox --restart=Never \
  --overrides='{"spec":{"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"quota-test-pvc"}}],"containers":[{"name":"quota-test","image":"busybox","command":["dd","if=/dev/zero","of=/data/test","bs=1M","count=6000"],"volumeMounts":[{"mountPath":"/data","name":"data"}]}]}}'

kubectl logs quota-test
```

With kernel 4.17+, the write will fail with a disk quota exceeded error when it reaches 5 GiB.

## Updating Quotas via PVC Expansion

If `allowVolumeExpansion: true` is set in the StorageClass, you can expand the PVC and Rook will update the CephFS quota accordingly:

```bash
kubectl patch pvc quota-test-pvc -p '{"spec":{"resources":{"requests":{"storage":"10Gi"}}}}'
```

Verify the quota update:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs subvolume info myfs <subvolume-name> --group_name=csi | grep bytes_quota
```

## Summary

CephFS PVC quota enforcement in Rook requires kernel 4.17+ on all mounting nodes. Rook automatically sets CephFS directory quotas matching the PVC request size during provisioning. On older kernels, quotas are stored in metadata but not enforced, allowing writes beyond the PVC limit. Always verify kernel versions before relying on CephFS quotas for capacity control, and use PVC expansion with `allowVolumeExpansion` to update quotas without recreating volumes.
