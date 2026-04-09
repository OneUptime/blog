# How to Manage NFS Exports from the Ceph Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, NFS, Storage

Description: Create and manage NFS exports from CephFS and RGW backends using the Ceph Dashboard, enabling POSIX-compatible NFS access to Ceph storage.

---

## Overview

Ceph NFS (via NFS Ganesha) allows exposing CephFS or RGW-backed storage as NFS shares. The Dashboard NFS section provides a GUI for creating exports, setting access controls, and monitoring NFS server status.

## Prerequisites

Enable the NFS MGR module and deploy an NFS cluster:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNFS
metadata:
  name: my-nfs
  namespace: rook-ceph
spec:
  server:
    active: 1
    logLevel: NIV_INFO
```

Enable the NFS dashboard module:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph mgr module enable nfs
```

## Accessing NFS Management

```bash
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443
# Navigate to: https://localhost:8443/#/nfs
```

The NFS section shows:
- NFS cluster name
- Export list with paths, protocols, access types
- Client access rules

## Creating an NFS Export

Click "Create" in the NFS Exports section:

- **Cluster ID**: select the NFS cluster (CephNFS name)
- **Storage backend**: CephFS or RGW
- **CephFS Filesystem**: select existing filesystem
- **CephFS Path**: the directory to export (e.g., `/exports/team-a`)
- **Pseudo path**: NFS export path (e.g., `/team-a-data`)
- **Access type**: RW (read-write) or RO (read-only)
- **Squash**: no_root_squash, root_squash, all_squash

CLI equivalent using `ceph nfs`:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nfs export create cephfs \
  --cluster-id my-nfs \
  --pseudo-path /team-a-data \
  --fsname my-fs \
  --path /exports/team-a

# List exports
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nfs export ls my-nfs
```

## Configuring Client Access Control

Restrict access to specific subnets:

```bash
# Export with subnet restriction
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nfs export create cephfs \
  --cluster-id my-nfs \
  --pseudo-path /restricted-data \
  --fsname my-fs \
  --path /exports/restricted \
  --client-addr "10.0.1.0/24" \
  --squash root_squash
```

## Mounting NFS Exports

From a client machine or pod:

```bash
# Traditional NFS mount
mount -t nfs 10.0.1.20:/team-a-data /mnt/team-a

# In a Kubernetes pod via PV
```

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-team-a
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: 10.0.1.20
    path: /team-a-data
```

## Monitoring NFS Server Status

```bash
# Check NFS Ganesha pod health
kubectl -n rook-ceph get pods -l app=rook-ceph-nfs

# View NFS stats
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nfs cluster info my-nfs
```

## Summary

The Ceph Dashboard NFS section simplifies creating and managing NFS exports backed by CephFS or RGW. Key settings include the pseudo path, access type, and client subnet restrictions. NFS provides broad compatibility with legacy applications that cannot use the CSI driver or S3 API, making it essential for mixed Linux/Windows environments accessing Ceph storage.
