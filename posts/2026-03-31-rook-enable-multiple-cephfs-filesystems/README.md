# How to Enable Multiple CephFS Filesystems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Filesystem, Kubernetes

Description: Learn how to enable and manage multiple CephFS filesystems in a Rook-Ceph cluster for workload isolation and multi-tenant storage.

---

## Overview

By default, Ceph supports only one CephFS filesystem per cluster. Starting with Ceph Nautilus, you can enable multiple CephFS filesystems using the `enable_multiple` flag. This is useful when you want to isolate workloads, separate metadata namespaces, or provide dedicated storage per team or application.

## Prerequisites

Before enabling multiple filesystems, ensure you are running Ceph Nautilus (14.x) or later, and that your Rook operator is deployed and healthy.

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s
```

## Enable the Multiple Filesystem Flag

The first step is to enable the `enable_multiple` flag on the Ceph cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs flag set enable_multiple true --yes-i-really-mean-it
```

Once enabled, you can create additional filesystems alongside your primary one.

## Create Additional Pools and Filesystems

Each CephFS filesystem needs its own metadata and data pools. Create dedicated pools for your second filesystem:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create cephfs2-metadata 32

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create cephfs2-data 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs new cephfs2 cephfs2-metadata cephfs2-data
```

## Create a Rook CephFilesystem CRD

Alternatively, define the second filesystem via a Kubernetes CRD so Rook manages it declaratively:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: cephfs2
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
    - name: data0
      replicated:
        size: 3
  preserveFilesystemOnDelete: true
  metadataServer:
    activeCount: 1
    activeStandby: true
```

```bash
kubectl apply -f cephfs2.yaml
```

## Verify Multiple Filesystems

Check that both filesystems are active:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs ls
```

You should see output listing both `cephfs` and `cephfs2` with their respective pools and MDS daemons.

## StorageClass for the Second Filesystem

Create a dedicated StorageClass for the new filesystem so Kubernetes workloads can consume it:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs2
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: cephfs2
  pool: cephfs2-data
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Summary

Enabling multiple CephFS filesystems in Rook-Ceph allows you to achieve workload isolation without running separate clusters. By setting the `enable_multiple` flag and defining additional `CephFilesystem` CRDs, you can provide dedicated filesystem namespaces for different teams or applications, each with independent pools, MDS daemons, and StorageClasses. This pattern is especially valuable in multi-tenant Kubernetes environments.
