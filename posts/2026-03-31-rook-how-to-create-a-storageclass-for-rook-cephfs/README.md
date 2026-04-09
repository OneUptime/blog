# How to Create a StorageClass for Rook CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Kubernetes, Storage, StorageClass

Description: Learn how to create a Kubernetes StorageClass for Rook CephFS to enable dynamic provisioning of ReadWriteMany persistent volumes.

---

## Overview

A Kubernetes StorageClass for CephFS enables dynamic provisioning of persistent volumes backed by a Ceph filesystem. CephFS volumes support the `ReadWriteMany` (RWX) access mode, making them ideal for workloads that need shared storage across multiple pods.

This guide covers creating a StorageClass for Rook-managed CephFS, including the required CSI driver configuration and provisioner settings.

## Prerequisites

Before creating the StorageClass, ensure you have:
- A running Rook-Ceph cluster
- A CephFilesystem resource deployed (e.g., `myfs`)
- The Rook CSI driver deployed in the `rook-ceph` namespace

Verify the CephFilesystem exists:

```bash
kubectl -n rook-ceph get cephfilesystem
```

## Creating the StorageClass

Create a StorageClass manifest that references your CephFilesystem:

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
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

Apply the StorageClass:

```bash
kubectl apply -f storageclass-cephfs.yaml
```

## Creating the Required Secrets

The StorageClass references two secrets that Rook creates automatically. Verify they exist:

```bash
kubectl -n rook-ceph get secret rook-csi-cephfs-provisioner
kubectl -n rook-ceph get secret rook-csi-cephfs-node
```

If they are missing, the Rook operator should have created them during installation. Check the operator logs:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator | grep cephfs
```

## Using the StorageClass

Create a PersistentVolumeClaim using the new StorageClass:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cephfs-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: rook-cephfs
```

Apply and verify the PVC binds successfully:

```bash
kubectl apply -f pvc.yaml
kubectl get pvc cephfs-pvc
```

Expected output:

```text
NAME         STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
cephfs-pvc   Bound    pvc-abc12345-...                           10Gi       RWX            rook-cephfs    30s
```

## Mounting in a Pod

Deploy a pod that mounts the CephFS PVC:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cephfs-demo
spec:
  containers:
    - name: demo
      image: busybox
      command: ["sleep", "infinity"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: cephfs-pvc
```

## Setting as Default StorageClass

To make CephFS the default StorageClass for your cluster:

```bash
kubectl patch storageclass rook-cephfs \
  -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

## Summary

Creating a StorageClass for Rook CephFS involves defining a StorageClass with the CephFS CSI provisioner, referencing the correct filesystem name and data pool, and linking to the CSI secrets. Once deployed, PVCs using this StorageClass will be dynamically provisioned and support ReadWriteMany access, enabling shared storage for multi-pod workloads.
