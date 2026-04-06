# How to Use the NFS CSI Provisioner with Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, CSI, Kubernetes

Description: Learn how to use the NFS CSI driver with a Rook CephNFS cluster to dynamically provision PersistentVolumes backed by NFS exports.

---

## What Is the NFS CSI Provisioner

Rook includes support for the NFS CSI driver (`rook-ceph.nfs.csi.ceph.com`), which allows Kubernetes applications to dynamically provision PersistentVolumeClaims backed by NFS exports from a `CephNFS` cluster. Unlike manually creating NFS PVs, the CSI provisioner automates export creation and deletion, integrating NFS into the standard Kubernetes storage workflow.

## Prerequisites

You need a running `CephNFS` cluster and a `CephFilesystem` (or `CephObjectStore`). Verify Rook has deployed the NFS CSI driver sidecar:

```bash
kubectl -n rook-ceph get daemonset | grep nfs
```

The NFS CSI node plugin should be running on all nodes where NFS clients will mount volumes.

## Creating a StorageClass for NFS CSI

Define a `StorageClass` that references the NFS CSI driver and your NFS cluster:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-nfs
provisioner: rook-ceph.nfs.csi.ceph.com
parameters:
  nfsCluster: my-nfs
  server: rook-ceph-nfs-my-nfs-0.rook-ceph.svc
  share: /data
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-nfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-nfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

The `server` parameter points at the ClusterIP Service for one of the NFS pods.

## Creating a PersistentVolumeClaim

Applications request NFS storage through a standard PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-nfs-pvc
  namespace: my-app
spec:
  storageClassName: rook-nfs
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
```

The NFS CSI provisioner creates a subdirectory within the `/data` NFS export and binds it as a PV. Multiple pods can mount this PVC simultaneously with `ReadWriteMany`.

## Using the PVC in a Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: app
          image: nginx:1.25
          volumeMounts:
            - name: shared-storage
              mountPath: /usr/share/nginx/html
      volumes:
        - name: shared-storage
          persistentVolumeClaim:
            claimName: my-nfs-pvc
```

All three replicas share the same NFS-backed directory, which is useful for shared content serving.

## Verifying the PV and Mount

Check that the PV was created and bound:

```bash
kubectl get pvc my-nfs-pvc -n my-app
kubectl get pv | grep my-nfs-pvc
```

Inspect the mount inside a pod:

```bash
kubectl -n my-app exec -it deploy/my-app -- df -h /usr/share/nginx/html
```

Expected output shows the NFS filesystem:

```text
Filesystem      Size  Used Avail Use% Mounted on
192.168.1.x:/   100G  1.2G   99G   2% /usr/share/nginx/html
```

## Summary

The NFS CSI provisioner in Rook enables dynamic PVC provisioning backed by `CephNFS` exports. Create a `StorageClass` referencing the NFS CSI driver and the NFS cluster, then use standard `ReadWriteMany` PVCs in your applications. This approach automates NFS export lifecycle management and integrates NFS into Kubernetes storage workflows without manual export creation.
