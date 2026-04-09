# Validation Summary: How to Configure the NFS Module in Ceph Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph Manager NFS module
- NFS-Ganesha
- CephFS
- Rook Ceph Operator
- CephNFS Custom Resource Definition
- Kubernetes
- NFS v4

## Sources Consulted
- Ceph NFS module documentation (Reef): https://docs.ceph.com/en/reef/mgr/nfs/
- Ceph NFS module documentation (Quincy): https://docs.ceph.com/en/quincy/mgr/nfs/
- Ceph NFS service deployment (cephadm): https://docs.ceph.com/en/reef/cephadm/services/nfs/
- Ceph Manager administrator guide: https://docs.ceph.com/en/latest/mgr/administrator/
- Ceph source doc/mgr/nfs.rst: https://github.com/ceph/ceph/blob/main/doc/mgr/nfs.rst
- Rook CephNFS CRD documentation (latest): https://www.rook.io/docs/rook/latest-release/CRDs/ceph-nfs-crd/
- Rook GitHub issue #8450 (removal of spec.rados): https://github.com/rook/rook/issues/8450

## Issues Found

### 1. Incorrect `--placement` flag in `ceph nfs cluster create`
- **What was wrong:** The command used `--placement="2"` but `placement` is a positional argument, not a named flag.
- **What was changed:** Changed `ceph nfs cluster create mynfs --placement="2"` to `ceph nfs cluster create mynfs "2"`.
- **Why:** The official Ceph CLI syntax defines placement as a positional parameter: `ceph nfs cluster create <cluster_id> [<placement>]`.

### 2. Incorrect usage of `ceph nfs export apply` and incomplete JSON
- **What was wrong:** The command piped JSON via a heredoc directly to stdin (`<<EOF`), but the documented syntax uses the `-i` flag to specify an input file. Additionally, the JSON body was missing the required `fsal` block that specifies the storage backend.
- **What was changed:** Replaced the heredoc approach with `ceph nfs export apply mynfs -i export.json` and a separate JSON block that includes the `fsal` configuration (`"name": "CEPH", "fs_name": "cephfs"`).
- **Why:** The Ceph docs specify `-i <json_file>` for input. The docs also state that the provided JSON should fully describe the export state; omitting the `fsal` block would result in an incomplete or failing configuration.

### 3. Deprecated `spec.rados` field in Rook CephNFS CRD
- **What was wrong:** The CephNFS YAML included `spec.rados.pool` and `spec.rados.namespace`, which were removed from the CRD in Rook v1.8 (August 2021).
- **What was changed:** Removed the `rados` section from the CephNFS spec, leaving only the `server` configuration.
- **Why:** Since Rook v1.8, the `.nfs` RADOS pool is automatically created and managed by Ceph's NFS orchestrator. The user-configurable `rados` field was removed because mismatches between user-specified and Ceph-expected values caused export creation failures.

## Review Notes
- The `ceph nfs export create cephfs` command and its flags are correct for Ceph Quincy (17.x) and later. Earlier releases (Pacific/Octopus) used a different syntax.
- The mount command example uses a placeholder IP (`192.168.1.20`), which is appropriate for a tutorial.
- The post could benefit from mentioning which Ceph release the commands target (Quincy+ is assumed), but this is a style suggestion, not a technical error.
