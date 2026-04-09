# How to Create a CephNFS Cluster with Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, Kubernetes, Storage, CephNFS

Description: Learn how to create a CephNFS cluster using the Rook CephNFS CRD to deploy NFS-Ganesha servers backed by CephFS for NFS-compatible shared storage.

---

## Overview

Rook supports NFS-backed storage through the `CephNFS` CRD, which deploys NFS-Ganesha servers that export CephFS directories over the NFS protocol. This enables NFS clients including VMs, bare metal hosts, and Kubernetes pods to mount Ceph-backed storage using standard NFS.

## Prerequisites

Before creating a CephNFS cluster, you need:
- A running Rook-Ceph cluster
- A deployed CephFilesystem (e.g., `myfs`)

Verify the filesystem exists:

```bash
kubectl -n rook-ceph get cephfilesystem myfs
```

## Creating the CephNFS Cluster

Define the CephNFS resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNFS
metadata:
  name: my-nfs
  namespace: rook-ceph
spec:
  server:
    active: 1
    placement:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: role
                  operator: In
                  values:
                    - storage-node
    resources:
      limits:
        memory: "1Gi"
      requests:
        memory: "1Gi"
        cpu: "500m"
    priorityClassName: system-cluster-critical
    logLevel: NIV_INFO
```

Apply the manifest:

```bash
kubectl apply -f cephnfs.yaml
```

## Verifying the NFS Deployment

Check the CephNFS status:

```bash
kubectl -n rook-ceph get cephnfs my-nfs
```

Expected output:

```text
NAME     PHASE
my-nfs   Ready
```

Verify the NFS-Ganesha pods are running:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-nfs
```

Check the NFS service is created:

```bash
kubectl -n rook-ceph get svc -l app=rook-ceph-nfs
```

## Creating NFS Exports

After the CephNFS server is running, create exports through the Ceph dashboard or CLI. Using the toolbox:

```bash
# Create an export for a specific CephFS path
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph nfs export create cephfs \
    --cluster-id my-nfs \
    --pseudo-path /exports/data \
    --fsname myfs \
    --path /
```

List configured exports:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph nfs export ls my-nfs
```

## Mounting the NFS Export

Get the NFS service IP:

```bash
NFS_IP=$(kubectl -n rook-ceph get svc rook-ceph-nfs-my-nfs-a \
  -o jsonpath='{.spec.clusterIP}')
```

Mount the export on a Linux host:

```bash
sudo mount -t nfs -o nfsvers=4.1 $NFS_IP:/exports/data /mnt/cephnfs
```

From a Kubernetes pod using a NFS PersistentVolume:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: <nfs-service-cluster-ip>
    path: /exports/data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  volumeName: nfs-pv
```

## Scaling NFS Servers

Increase the `active` count for higher throughput:

```bash
kubectl -n rook-ceph patch cephnfs my-nfs \
  --type merge \
  -p '{"spec":{"server":{"active":2}}}'
```

## Summary

Creating a CephNFS cluster with Rook involves deploying the CephNFS CRD, which starts NFS-Ganesha servers that serve CephFS directories over NFS. After creating the CephNFS resource, define exports via the Ceph CLI or dashboard, then mount them from NFS clients or Kubernetes pods using standard NFS PersistentVolumes. This enables NFS-compatible shared storage backed by the reliability and scalability of Ceph.
