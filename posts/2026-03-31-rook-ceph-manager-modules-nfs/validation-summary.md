# Validation Summary: How to Configure Ceph Manager Modules for NFS in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Manager daemon and modules
- Ceph NFS-Ganesha
- Kubernetes (kubectl)
- RADOS (Ceph object storage layer)

## Sources Consulted
- Ceph NFS Manager Module Documentation: https://github.com/ceph/ceph/blob/main/doc/mgr/nfs.rst
- Rook CephNFS CRD Documentation: https://rook.io/docs/rook/latest/CRDs/ceph-nfs-crd/
- Rook NFS Storage Overview: https://rook.io/docs/rook/latest-release/Storage-Configuration/NFS/nfs/
- Ceph Rook Module Documentation: https://docs.ceph.com/en/reef/mgr/rook/
- Ceph Orchestrator Module Source Code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/orchestrator/module.py
- Rook MGR Source Code (mgr.go): https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/mgr/mgr.go
- Rook Issue #8450 (CephNFS RADOS .nfs pool): https://github.com/rook/rook/issues/8450

## Issues Found

### 1. Inconsistent module naming: `orchestrator` vs `rook`
**What was wrong:** The "Required Manager Modules" section listed `orchestrator` as the second required module, but the enabling commands correctly used `ceph mgr module enable rook`. The `rook` module is the actual orchestrator backend for Rook clusters; `orchestrator` is the framework/CLI module that is typically always-on in modern Ceph.
**What was changed:** Updated item 2 in the required modules list from `orchestrator` to `rook` with an accurate description: "The Rook orchestrator backend that allows the Manager to interact with Rook to create NFS pods."

### 2. Non-existent `--pool` and `--namespace` flags on `ceph nfs cluster create`
**What was wrong:** The command `ceph nfs cluster create my-nfs --pool my-fs-data0 --namespace nfs-ns` uses `--pool` and `--namespace` flags that do not exist in any version of Ceph. The correct syntax in Ceph Pacific and later is simply `ceph nfs cluster create <cluster_id> [<placement>]`. Starting with Ceph Pacific 16.2.6+, NFS configuration is automatically stored in a hardcoded `.nfs` RADOS pool.
**What was changed:** Removed the fabricated flags, corrected the command to `ceph nfs cluster create my-nfs`, and added a note explaining that the `.nfs` pool is managed automatically.

### 3. NFS cluster creation method incorrect for Rook environments
**What was wrong:** The post instructed readers to create NFS clusters via `ceph nfs cluster create` CLI. In a Rook-managed cluster, NFS clusters should be created via the `CephNFS` custom resource definition (CRD). Using the CLI bypasses Rook's management and can conflict with the CephNFS operator.
**What was changed:** Rewrote the section to clarify that in Rook environments, the CephNFS CRD is the correct approach. The CLI command is preserved as a reference for non-Rook or testing environments.

## Review Notes
- The `rook` MGR module is only strictly required for Ceph v16.2.7 and below. For v16.2.8+, it is optional. The Rook documentation notes it may be preferable to disable the `rook` and `nfs` MGR modules when not actively managing exports via CLI, to free up RAM.
- The post does not mention that `ceph orch set backend rook` may be needed after enabling the `rook` module to explicitly set it as the orchestrator backend.
- The `ceph mgr module ls | grep` and `ceph mgr dump | grep` commands pipe to grep on the local machine (outside the container), which works correctly since kubectl outputs the command result to stdout, but readers should be aware the grep runs locally.
- The post could benefit from showing the CephNFS CR YAML example since it recommends a Rook-based workflow, but this is a scope/content suggestion rather than a technical error.
