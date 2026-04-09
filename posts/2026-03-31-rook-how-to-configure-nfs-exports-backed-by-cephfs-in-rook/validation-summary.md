# Validation Summary: How to Configure NFS Exports Backed by CephFS in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph NFS-Ganesha
- CephFS (Ceph Filesystem)
- Kubernetes CRDs (CephNFS)
- NFS v4.1 protocol
- `ceph nfs export` CLI commands

## Sources Consulted
- Rook latest CephNFS CRD documentation: https://rook.io/docs/rook/latest/CRDs/ceph-nfs-crd/
- Rook latest CRD specification (shows `rados` as deprecated): https://rook.io/docs/rook/latest/CRDs/specification/
- Rook NFS storage configuration: https://rook.io/docs/rook/latest/Storage-Configuration/NFS/nfs/
- Ceph NFS manager module documentation: https://docs.ceph.com/en/latest/mgr/nfs/
- Rook GitHub issue #8450 (RADOS spec deprecation): https://github.com/rook/rook/issues/8450

## Issues Found
1. **Deprecated `spec.rados` field in CephNFS CRD**: The CephNFS YAML example included a `spec.rados` block with `pool: myfs-metadata` and `namespace: nfs-ns`. This field has been deprecated since Rook v1.10+ and is silently ignored in current versions. Ceph's NFS module now automatically manages its configuration in the internal `.nfs` pool, and the RADOS namespace is set to the CephNFS resource name. Removed the `spec.rados` block entirely to match current Rook documentation and prevent confusion.

## Review Notes
- The `ceph nfs export create cephfs` command uses the correct named-flag syntax (`--cluster-id`, `--pseudo-path`, `--fsname`, `--path`) which is the current standard in Ceph Reef/Squid.
- The `ceph nfs export apply` command with stdin (`-`) and heredoc is correct.
- The NFS service naming convention (`rook-ceph-nfs-my-nfs-a`) and pod naming (`rook-ceph-nfs-my-nfs-a-0`) follow Rook's patterns correctly.
- The mount command, fstab entry, and `_netdev` option are all correct for NFS4.1 mounts.
- The export JSON structure (FSAL, squash, access_type, clients block) matches NFS-Ganesha's export configuration format.
