# How to Configure Static Provisioning for CephFS in Rook CSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, CephFS, Kubernetes

Description: Learn how to statically provision CephFS volumes in Rook CSI by mapping pre-existing CephFS directories to Kubernetes PersistentVolumes.

---

## When to Use Static CephFS Provisioning

Dynamic provisioning creates a new subdirectory in CephFS for each PVC. Static provisioning lets you point a PV at an existing CephFS directory - useful when migrating legacy data, sharing a single CephFS path across multiple PVCs, or managing directory hierarchy outside of Kubernetes. The CSI driver handles authentication and mounting, but the directory itself is not lifecycle-managed by the provisioner.

## Identifying the CephFS Target Path

First, ensure the target directory exists in CephFS. Access it via the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

ceph fs ls
# output: my-fs
```

Create the directory if needed:

```bash
mkdir /mnt/cephfs/datasets/training-data
# Or via the toolbox with cephfs-shell if available
```

## Getting the CephFS Subvolume Root ID

For static provisioning, you need the CephFS filesystem root subvolume ID:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs subvolumegroup ls my-fs
```

## Creating the Static PersistentVolume

Create a PV that references an existing CephFS path:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: static-cephfs-pv
spec:
  accessModes:
    - ReadWriteMany
  capacity:
    storage: 200Gi
  csi:
    driver: rook-ceph.cephfs.csi.ceph.com
    nodeStageSecretRef:
      name: rook-csi-cephfs-node
      namespace: rook-ceph
    volumeAttributes:
      clusterID: rook-ceph
      fsName: my-fs
      rootPath: /datasets/training-data
      staticVolume: "true"
    volumeHandle: static-cephfs-training-data
  persistentVolumeReclaimPolicy: Retain
  storageClassName: rook-cephfs
  volumeMode: Filesystem
```

The `rootPath` is the CephFS path relative to the filesystem root. The `volumeHandle` must be unique but is not used for volume lookup - it is just an identifier.

## Creating the Matching PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: training-data-pvc
  namespace: ml-workloads
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 200Gi
  storageClassName: rook-cephfs
  volumeName: static-cephfs-pv
```

## Using the Volume in Multiple Pods

CephFS volumes with `ReadWriteMany` can be mounted by multiple pods simultaneously across different nodes:

```yaml
volumes:
  - name: training-data
    persistentVolumeClaim:
      claimName: training-data-pvc
```

Multiple training pods can read the same dataset concurrently, which is a common pattern for distributed machine learning.

## Verifying Access

After deploying a pod with the PVC, verify the mount:

```bash
kubectl -n ml-workloads exec -it deploy/training-job -- \
  ls /mnt/data
```

The contents of the CephFS directory at `/datasets/training-data` should be visible.

## Summary

Static provisioning for CephFS in Rook CSI maps a pre-existing CephFS directory to a Kubernetes PV using `rootPath` and `staticVolume: "true"` in the volume attributes. Use `Retain` reclaim policy to prevent the CSI driver from deleting the directory. With `ReadWriteMany` access, multiple pods across different nodes can share the same dataset or content directory simultaneously.
