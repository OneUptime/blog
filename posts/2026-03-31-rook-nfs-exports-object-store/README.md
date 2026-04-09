# How to Configure NFS Exports Backed by Object Store in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, Object Store, Kubernetes

Description: Learn how to configure Ceph NFS exports backed by a Ceph object store (RGW) in Rook, enabling NFS access to S3-compatible storage.

---

## Overview

Ceph NFS-Ganesha supports exporting namespaces backed by either CephFS or a Ceph object store via the RADOS gateway. When backed by an object store, NFS clients access S3 buckets as if they were POSIX directories. This is useful when you want to give legacy NFS-based workloads access to object storage without requiring S3 library changes.

## Prerequisites

You need a working `CephNFS` cluster and a `CephObjectStore` in the same Rook namespace. Verify both are ready:

```bash
kubectl -n rook-ceph get cephnfs
kubectl -n rook-ceph get cephobjectstore
```

Both should show a `Ready` phase before proceeding.

## Creating the NFS Export for Object Store

Create an export via the Ceph NFS CLI using the toolbox. The export type `RGW` points NFS at the object store:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

Inside the toolbox, use the Ceph NFS export command:

```bash
ceph nfs export create rgw \
  --cluster-id my-nfs \
  --pseudo-path /s3export \
  --bucket my-nfs-bucket
```

This creates an NFS export at path `/s3export` that maps to the Ceph bucket `my-nfs-bucket` in the default object store.

## Verifying the Export Configuration

List all exports for the NFS cluster:

```bash
ceph nfs export ls my-nfs
```

Inspect the specific export details:

```bash
ceph nfs export info my-nfs /s3export
```

The output shows the RGW bucket binding and access mode:

```json
{
  "export_id": 2,
  "path": "my-nfs-bucket",
  "pseudo": "/s3export",
  "access_type": "RW",
  "protocols": [4],
  "fsal": {
    "name": "RGW",
    "user_id": "nfs.my-nfs.2"
  }
}
```

## Mounting the NFS Export

From a Kubernetes pod or an external client, mount the exported path. First expose the NFS service, then mount:

```bash
mount -t nfs4 \
  -o proto=tcp,port=2049 \
  <nfs-service-ip>:/s3export \
  /mnt/s3nfs
```

Files written to `/mnt/s3nfs` are stored as objects in `my-nfs-bucket`, and files read from it are retrieved from the bucket.

## Limitations to Be Aware Of

NFS-over-object-store has important constraints compared to NFS-over-CephFS:

```text
- No hard link support (object stores are flat namespaces)
- Directory listing can be slow for buckets with millions of objects
- POSIX semantics are approximate, not exact
- Concurrent write conflicts are not handled like a true filesystem
```

For workloads that require strict POSIX semantics or high concurrency, CephFS-backed NFS is more appropriate.

## Summary

NFS exports backed by a Ceph object store in Rook give NFS clients a POSIX-like view of S3 buckets. After ensuring the `CephNFS` and `CephObjectStore` are ready, create an RGW-backed export via the Ceph CLI, then mount it using standard NFS4 tooling. Keep in mind the POSIX limitations inherent to object storage backends when choosing this approach.
