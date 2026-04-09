# How to Rename a CephFS Filesystem

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CephFS

Description: Learn how to rename a CephFS filesystem using the ceph fs rename command and what steps are required to update clients and Rook configuration after renaming.

---

## Overview of CephFS Filesystem Renaming

Renaming a CephFS filesystem changes its logical name without affecting the underlying pools or data. This is a metadata-only operation. However, after renaming, any client using the old name in mount options or Kubernetes configurations must be updated.

The rename feature was introduced in Ceph Quincy (17.x) and is available in Rook with Ceph Quincy and later.

## Prerequisites

Before renaming:

- All clients should be unmounted from the filesystem
- MDS daemons should be active
- The new name must not already be in use by another filesystem
- Mirroring must be disabled on the filesystem

## Performing the Rename

From the Rook toolbox pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

Rename the filesystem:

```bash
ceph fs rename oldname newname --yes-i-really-mean-it
```

For example, rename `myfs` to `production-fs`:

```bash
ceph fs rename myfs production-fs --yes-i-really-mean-it
```

The `--yes-i-really-mean-it` flag is required to prevent accidental renames.

## Verifying the Rename

Confirm the filesystem now appears under the new name:

```bash
ceph fs ls
```

Expected output:

```text
name: production-fs, metadata pool: myfs-metadata, data pools: [myfs-data ]
```

Note: The pool names are not renamed - only the filesystem name changes.

## Updating Ceph Client Configurations

Any `ceph.conf` or application configuration referencing the filesystem by name must be updated:

```ini
[client]
client_fs = production-fs
```

For mount commands:

```bash
# Old
mount -t ceph mon1:/ /mnt/cephfs -o name=admin,fs=myfs

# New
mount -t ceph mon1:/ /mnt/cephfs -o name=admin,fs=production-fs
```

## Updating Rook CephFilesystem CRD

In Rook, you cannot rename the `CephFilesystem` CRD name directly since Rook ties the Ceph filesystem name to the CRD resource name. Instead, the approach in Rook is:

1. Create a new `CephFilesystem` with the new name and configuration
2. Migrate data if needed
3. Delete the old `CephFilesystem` (with `preserveFilesystemOnDelete: true` to preserve the underlying data and pools)

However, if you renamed the Ceph filesystem directly using the Ceph CLI outside of Rook, update the Rook reconciliation by restarting the operator:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

## Updating Kubernetes StorageClass

If you have a `StorageClass` that references the old filesystem name:

```yaml
parameters:
  fsName: production-fs  # Updated from myfs
```

After updating the StorageClass, new PVCs will use the new name. Existing PVs are not affected.

## Updating SubVolumeGroup References

If CephFS subvolume groups exist, they remain tied to the filesystem name:

```bash
# List subvolume groups under new name
ceph fs subvolumegroup ls production-fs
```

## Summary

`ceph fs rename <oldname> <newname> --yes-i-really-mean-it` renames a CephFS filesystem without affecting its pools or data. After renaming, update all client mount configurations, `ceph.conf` files, and Kubernetes StorageClass resources that reference the old name. In Rook, the recommended approach for renaming is to create a new `CephFilesystem` CRD with the desired name rather than using the CLI rename command.
