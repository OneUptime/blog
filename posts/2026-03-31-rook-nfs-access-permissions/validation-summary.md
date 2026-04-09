# Validation Summary: How to Configure NFS Access Lists and Permissions in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- NFS-Ganesha (NFS server daemon used by Ceph/Rook)
- Kubernetes (container orchestration)
- CephFS (Ceph file system)

## Sources Consulted
- NFS-Ganesha export configuration reference (GitHub nfs-ganesha/nfs-ganesha, `src/config_samples/export.txt`) — for valid Access_Type, Squash values, CLIENT block fields
- Ceph NFS manager module documentation (`doc/mgr/nfs.rst` from GitHub ceph/ceph main branch) — for `ceph nfs export` CLI syntax, JSON format, flags
- Rook NFS documentation (https://rook.io/docs/rook/latest/Storage-Configuration/NFS/nfs/) — for Kubernetes service naming, export management methods
- Rook NFS security documentation (https://rook.io/docs/rook/latest/Storage-Configuration/NFS/nfs-security/) — for access control and authentication details

## Issues Found

1. **Invalid squash flag value in `ceph nfs export create` command**: The command used `--squash=rootsquash` (no underscore), which is not a recognized squash value. Fixed to `--squash=root_squash`. NFS-Ganesha accepts `Root_Squash`, `RootSquash`, and `root_squash`, but not `rootsquash` as a single word without underscore or camelCase.

2. **Invalid squash value `no_squash` in Squash Options table**: `no_squash` is not a valid NFS-Ganesha squash value. The NFS-Ganesha documentation lists `No_Root_Squash`, `NoIdSquash`, and `None` as the variants meaning "no squashing." Replaced `no_squash` with `none` and clarified its equivalence to `no_root_squash`.

## Review Notes
- The post uses positional argument syntax for `ceph nfs export create cephfs` (e.g., `ceph nfs export create cephfs my-nfs /export1 myfs`). Newer Ceph versions (Reef+) prefer named flags (`--cluster-id`, `--pseudo-path`, `--fsname`), but positional syntax remains supported for backward compatibility and is used in current Rook documentation.
- The Access Type table omits `MDONLY_RO` (metadata read-only), which is a valid NFS-Ganesha access type. This is acceptable since the table covers the most commonly used values.
- The EXPORT block example writes config to `/tmp/export.conf` but doesn't show how to load it into the RADOS config object that Ganesha reads. In practice, users would need to use `rados put` or the `ceph nfs export apply` JSON approach (which is covered later in the post) to apply such configurations.
- The Ganesha EXPORT block uses lowercase squash values (e.g., `root_squash`) while NFS-Ganesha documentation uses capitalized forms (e.g., `Root_Squash`). Both are valid since NFS-Ganesha config parsing is case-insensitive.
