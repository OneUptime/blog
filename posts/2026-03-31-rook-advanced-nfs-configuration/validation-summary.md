# Validation Summary: How to Set Up Advanced NFS Configuration in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph NFS (CephNFS CRD)
- NFS-Ganesha (NFS server daemon)
- Kubernetes

## Sources Consulted
- Rook CephNFS CRD source code (`pkg/apis/ceph.rook.io/v1/types.go` on GitHub) — verified CRD spec fields (`server`, `rados`, `security`; no `ganesha` section)
- Rook GitHub issue rook/rook#5122 — confirmed `ganesha.config` CRD field was rejected (closed as wontfix)
- Rook GitHub issue rook/rook#8450 — confirmed `rados.pool` and `rados.namespace` are deprecated
- Ceph NFS documentation (`doc/mgr/nfs.rst`) — verified `ceph nfs export apply` and `ceph nfs cluster config set` commands
- NFS-Ganesha man pages: ganesha-core-config(8), ganesha-cache-config(8), ganesha-export-config(8) — verified config blocks and parameters
- NFS-Ganesha source: `log.h` enum definition — verified log level order
- NFS-Ganesha V4.1 and V5 release notes — confirmed CACHE_INODE renamed to MDCACHE
- NFS-Ganesha config samples (`src/config_samples/export.txt`) — verified squash mode synonyms

## Issues Found

### 1. Non-existent `ganesha.config` CRD field (Critical)
**What was wrong:** The post claimed the `CephNFS` CRD spec accepts a `ganesha.config` field for injecting custom NFS-Ganesha configuration. This field does not exist in the CRD — the feature request (rook/rook#5122) was closed as wontfix.
**What was changed:** Replaced the incorrect `ganesha.config` YAML with the correct approach: using `ceph nfs cluster config set` from the Ceph CLI/toolbox to apply custom Ganesha configuration. Updated the summary section accordingly.

### 2. Non-existent `rados.object` field and deprecated `rados` section (Moderate)
**What was wrong:** The `rados` section included an `object: conf-nfs.my-nfs` field that does not exist in the CRD's `GaneshaRADOSSpec`. The `rados.pool` and `rados.namespace` fields also exist but are deprecated since Rook v1.8/Ceph v16.2.6+ (they are now internally hardcoded to `.nfs` pool and the CephNFS name).
**What was changed:** Removed the entire `rados` section from the YAML example since all its fields are either non-existent or deprecated and automatically set.

### 3. Deprecated `CACHE_INODE` block name (Minor)
**What was wrong:** The post used `CACHE_INODE` as the NFS-Ganesha config block name. This was renamed to `MDCACHE` starting with NFS-Ganesha V4.1. While the legacy name may still be accepted as an alias in some versions, it was largely removed in V5.
**What was changed:** Replaced `CACHE_INODE` with `MDCACHE` and added a parenthetical note that it was formerly called `CACHE_INODE`.

## Review Notes
- The NFS-Ganesha config parameters (Entries_HWMark, Dir_Chunk, NParts, Protocols, NFS_Port, fsid_device, Lease_Lifetime, Grace_Period, Minor_Versions) are all valid and correctly documented.
- The squash modes (None, RootSquash, AllSquash, RootIdSquash) are all valid NFS-Ganesha squash mode names/aliases.
- The log level ordering (NIV_NULL through NIV_FULL_DEBUG) is correct per the NFS-Ganesha `log.h` source.
- The `ceph nfs export apply` command with JSON client restrictions is correct syntax.
- The kubectl label selector `app=rook-ceph-nfs` is correct per Rook source code.
- The `RootIdSquash` description in the squash reference table ("Root is squashed, but other users are passed through") is technically accurate but could be more precise — the distinction from `RootSquash` is that `RootIdSquash` only squashes the root UID, not the root GID. This is a minor clarity issue, not an error.
