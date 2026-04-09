# Validation Summary: How to Manage NFS Exports from the Ceph Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph NFS (NFS Ganesha integration)
- CephFS (Ceph Filesystem)
- Ceph Dashboard
- Kubernetes (PersistentVolume, CRDs, kubectl)
- NFS (Network File System)

## Sources Consulted
- Rook CephNFS CRD documentation: https://rook.io/docs/rook/latest/CRDs/ceph-nfs-crd/
- Ceph NFS management documentation: https://docs.ceph.com/en/latest/cephadm/services/nfs/
- Ceph NFS export CLI reference: https://docs.ceph.com/en/latest/man/8/ceph/#nfs
- NFS Ganesha configuration reference (squash options, log levels)
- Kubernetes PersistentVolume NFS documentation: https://kubernetes.io/docs/concepts/storage/volumes/#nfs

## Issues Found

1. **CephNFS YAML included deprecated `rados` section**: The `spec.rados` field (with `pool` and `namespace` sub-fields) was deprecated in Rook v1.10 and removed in Rook v1.13+. Modern Rook versions auto-manage the RADOS pool for NFS configuration storage. Removed the `rados` block from the CephNFS CRD example to reflect the current API.

2. **Incorrect squash option name in Dashboard UI description**: The squash option was listed as "none" which is not how the Ceph Dashboard presents it. Changed to `no_root_squash` which is the actual option name used in both the Dashboard UI and the Ceph NFS configuration.

## Review Notes
- The `ceph mgr module enable nfs` command is technically valid but may be unnecessary in Rook-managed clusters, as Rook auto-enables required MGR modules when creating CephNFS resources. The command is harmless if the module is already enabled.
- The CLI flags `--client-addr` and `--squash` for `ceph nfs export create cephfs` are valid in Ceph Reef (18.x) and later versions.
- The NFS PersistentVolume example uses a hardcoded IP address (10.0.1.20) which is appropriate for an example but readers should determine their NFS Ganesha service IP via `ceph nfs cluster info`.
- The pod label selector `app=rook-ceph-nfs` is correct for identifying Rook-managed NFS Ganesha pods.
