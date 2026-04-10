# How to Create CephFS Volumes for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CephFS, Kubernetes, Persistent Volume, Storage, CSI

Description: Provision CephFS-backed persistent volumes in Kubernetes using the Rook-Ceph CSI driver for ReadWriteMany workloads like shared configuration and media storage.

---

CephFS provides POSIX-compliant shared filesystem storage for Kubernetes, supporting ReadWriteMany (RWX) access mode. This allows multiple pods to mount the same volume simultaneously - ideal for shared content, logs, or configuration. This guide uses the Rook-Ceph operator to provision CephFS volumes.

## Prerequisites

- Rook-Ceph operator installed and a CephCluster deployed
- Rook CSI driver running

## Step 1: Create the CephFilesystem

```yaml
# cephfilesystem.yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
    - name: replicated
      replicated:
        size: 3
  preserveFilesystemOnDelete: true
  metadataServer:
    activeCount: 1
    activeStandby: true
```

```bash
kubectl apply -f cephfilesystem.yaml

# Wait for MDS to become active
kubectl -n rook-ceph get cephfilesystem myfs
```

## Step 2: Create the StorageClass

```yaml
# storageclass-cephfs.yaml
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
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

```bash
kubectl apply -f storageclass-cephfs.yaml
```

## Step 3: Create a PersistentVolumeClaim

```yaml
# pvc-cephfs.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: rook-cephfs
```

```bash
kubectl apply -f pvc-cephfs.yaml
kubectl get pvc shared-data
# STATUS should show Bound
```

## Step 4: Use the PVC in a Deployment

```yaml
# deployment-with-cephfs.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shared-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shared-app
  template:
    metadata:
      labels:
        app: shared-app
    spec:
      containers:
        - name: app
          image: nginx:alpine
          volumeMounts:
            - name: shared-data
              mountPath: /usr/share/nginx/html
      volumes:
        - name: shared-data
          persistentVolumeClaim:
            claimName: shared-data
```

```bash
kubectl apply -f deployment-with-cephfs.yaml
kubectl get pods -l app=shared-app
# All 3 pods should mount the same CephFS volume
```

## Verifying RWX Access

```bash
# Write from one pod
kubectl exec deploy/shared-app -c app -- sh -c "echo 'hello from pod' > /usr/share/nginx/html/test.txt"

# Read from another pod (different replica)
POD2=$(kubectl get pods -l app=shared-app -o name | tail -1)
kubectl exec ${POD2} -c app -- cat /usr/share/nginx/html/test.txt
# Output: hello from pod
```

## Summary

Rook-Ceph enables ReadWriteMany persistent volumes in Kubernetes through its CephFS CSI driver. The key resources are a CephFilesystem CRD (which deploys MDS pods), a StorageClass pointing at that filesystem, and PVCs using accessMode ReadWriteMany. Multiple pods across different nodes can mount the same CephFS volume simultaneously, making it the right choice for shared static assets, ML training data, or configuration files in multi-replica deployments.
