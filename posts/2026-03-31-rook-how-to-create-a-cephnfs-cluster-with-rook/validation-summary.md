# Validation Summary: How to Create a CephNFS Cluster with Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- NFS-Ganesha (NFS server)
- CephNFS CRD
- CephFS (Ceph filesystem)
- Kubernetes (PersistentVolume, PersistentVolumeClaim, Services, Pods)

## Sources Consulted
- Rook CephNFS CRD documentation: https://rook.io/docs/rook/latest/CRDs/ceph-nfs-crd/
- Rook NFS storage configuration: https://rook.io/docs/rook/latest/Storage-Configuration/NFS/nfs/
- Rook GitHub issue #8450 (RADOS pool deprecation): https://github.com/rook/rook/issues/8450
- Ceph NFS module documentation (export CLI syntax)
- NFS-Ganesha log level documentation

## Issues Found

1. **Removed deprecated `spec.rados` section from CephNFS YAML example.**
   - **What was wrong:** The CephNFS manifest included `spec.rados.pool: myfs-data0` and `spec.rados.namespace: nfs-ns`. The `spec.rados` field has been deprecated since Ceph v16 (Pacific). In all modern Rook deployments (which require Ceph v16.2.7+), these values are silently ignored. The `.nfs` RADOS pool is auto-created internally. Official Rook documentation examples omit `spec.rados` entirely.
   - **What was changed:** Removed the `rados` block (`pool` and `namespace` fields) from the YAML example.
   - **Why:** Including deprecated, ignored fields misleads readers into thinking these are required or functional configuration. Removing them aligns with official documentation and current best practices.

2. **Added explicit NFSv4.1 version to mount command.**
   - **What was wrong:** The mount command used `sudo mount -t nfs` without specifying an NFS version. CephNFS (NFS-Ganesha backed by Ceph) only supports NFSv4.1 and later -- NFSv3 is not supported. While modern Linux clients typically negotiate to v4 automatically, omitting the version could cause failures on systems that default to NFSv3.
   - **What was changed:** Updated the mount command to `sudo mount -t nfs -o nfsvers=4.1 $NFS_IP:/exports/data /mnt/cephnfs`.
   - **Why:** Explicitly specifying the NFS version ensures the mount works correctly and avoids silent negotiation failures on systems that might attempt NFSv3.

## Review Notes
- The `ceph nfs export create cephfs` command uses named flags (`--cluster-id`, `--pseudo-path`, `--fsname`, `--path`), which is the correct syntax for Ceph Quincy (v17) and later. Older Ceph versions (Pacific) used positional arguments.
- The NFS service naming convention `rook-ceph-nfs-my-nfs-a` is correct for Rook-deployed CephNFS services.
- The PersistentVolume/PersistentVolumeClaim example uses the basic `nfs` volume type, which is functional but does not include a `storageClassName: ""` on the PVC. This works because `volumeName` is set, which binds the PVC directly to the PV regardless.
- Active-active NFS configurations (`active > 1`) have known limitations with the NFS protocol -- when a server goes offline, clients connected to that server may experience blocking. This is worth noting for production deployments but does not constitute an error in the post.
