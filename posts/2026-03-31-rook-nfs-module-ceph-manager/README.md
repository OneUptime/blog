# How to Configure the NFS Module in Ceph Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, NFS, File System, Storage

Description: Learn how to configure the Ceph Manager NFS module to manage NFS-Ganesha gateways that export CephFS or RGW buckets over the NFS protocol.

---

The Ceph Manager NFS module manages NFS-Ganesha gateways that expose CephFS directories or RGW buckets as NFS shares. This allows standard NFS clients to mount Ceph storage without requiring the CephFS kernel client or an S3 library.

## Prerequisites

Before configuring NFS exports, ensure:

- CephFS is deployed and healthy, or an RGW object store is available
- The NFS module is enabled in the Ceph Manager

## Enabling the NFS Module

```bash
ceph mgr module enable nfs
```

## Creating an NFS Cluster

An NFS cluster groups one or more NFS-Ganesha daemons behind a common namespace:

```bash
ceph nfs cluster create mynfs "2"
```

Verify the cluster was created:

```bash
ceph nfs cluster ls
```

## Exporting CephFS via NFS

Create an NFS export backed by a CephFS path:

```bash
ceph nfs export create cephfs \
  --cluster-id mynfs \
  --pseudo-path /exports/data \
  --fsname cephfs \
  --path /
```

List configured exports:

```bash
ceph nfs export ls mynfs
```

## Mounting the NFS Export

On a Linux client, mount the NFS share:

```bash
sudo mount -t nfs4 -o proto=tcp \
  192.168.1.20:/exports/data \
  /mnt/ceph-nfs
```

Verify access:

```bash
ls /mnt/ceph-nfs
df -h /mnt/ceph-nfs
```

## Managing Exports in Rook

In a Rook-managed cluster, create NFS exports using the `CephNFS` custom resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNFS
metadata:
  name: my-nfs
  namespace: rook-ceph
spec:
  server:
    active: 2
```

Apply the resource:

```bash
kubectl apply -f nfs.yaml
kubectl -n rook-ceph get cephnfs
```

## Modifying Export Configuration

Update an existing export to change access permissions:

```bash
ceph nfs export apply mynfs -i export.json
```

Where `export.json` contains the full export configuration:

```json
{
  "export_id": 1,
  "pseudo": "/exports/data",
  "access_type": "RW",
  "fsal": {
    "name": "CEPH",
    "fs_name": "cephfs"
  },
  "clients": [
    {
      "addresses": ["192.168.1.0/24"],
      "access_type": "RW",
      "squash": "no_root_squash"
    }
  ]
}
```

## Summary

The Ceph Manager NFS module simplifies NFS-Ganesha gateway management by providing `ceph nfs` commands for creating clusters and exports. CephFS directories can be exposed as NFS v4 shares with configurable access controls, and in Rook environments the `CephNFS` custom resource handles daemon placement and configuration through the Kubernetes operator.
