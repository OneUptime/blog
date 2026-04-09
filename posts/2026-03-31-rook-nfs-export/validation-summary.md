# Validation Summary: How to Create an NFS Export in Rook-Ceph

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- NFS-Ganesha (NFS server used by Ceph)
- CephFS (Ceph filesystem)
- Kubernetes (container orchestration)

## Sources Consulted
- Rook NFS documentation: https://rook.io/docs/rook/latest/Storage-Configuration/NFS/nfs/
- Rook CRD definitions: https://github.com/rook/rook/blob/master/deploy/examples/crds.yaml
- Ceph NFS module documentation (Reef): https://docs.ceph.com/en/reef/mgr/nfs/
- Ceph NFS module documentation (Quincy): https://docs.ceph.com/en/quincy/mgr/nfs/
- Ceph NFS module source code: `src/pybind/mgr/nfs/module.py`

## Issues Found

### 1. Fabricated `CephNFSExport` CRD (Critical)
**What was wrong:** The post claimed Rook provides a `CephNFSExport` CRD (kind: CephNFSExport, apiVersion: ceph.rook.io/v1) available in "Rook 1.13+". This CRD does not exist. The only NFS-related CRD in Rook is `CephNFS`, which manages the NFS-Ganesha server cluster itself. Individual NFS exports are managed exclusively through the Ceph CLI, not through a Kubernetes CRD.

**What was changed:**
- Removed the entire "Creating an Export via the CephNFSExport CRD (Rook 1.13+)" section including the fabricated YAML manifest and associated `kubectl apply` / `kubectl get` commands.
- Removed the `kubectl delete cephnfsexport` option from the "Deleting an Export" section.
- Updated the intro paragraph to remove the CRD claim and accurately state that exports are managed via the Ceph CLI.
- Updated the description metadata line to remove the CRD mention.
- Updated the summary to reference `ceph nfs export apply` instead of the CRD.

**Why:** The `CephNFSExport` CRD was verified as non-existent by checking Rook's canonical `crds.yaml` file in the GitHub repository and the official Rook documentation. Presenting a fabricated CRD would cause readers to waste time trying to apply a YAML manifest that Kubernetes cannot recognize.

### 2. Incorrect `--path` flag syntax (Minor)
**What was wrong:** The `ceph nfs export create cephfs` commands used `path=/` and `path=/data` without the required double-dash prefix.

**What was changed:** Updated to `--path=/` and `--path=/data` respectively. Also updated the parameter description list to show `--path=/data`.

**Why:** The Ceph CLI requires the standard `--path=` flag syntax. The bare `path=` form without dashes is not valid CLI syntax and would cause a command error.

## Review Notes
- The positional argument order used in the CLI commands (`<cluster_id> <pseudo_path> <fsname>`) is correct per the Ceph source code. The official Ceph documentation also supports a named-flag form (`--cluster-id`, `--pseudo-path`, `--fsname`) which is more explicit but both forms work.
- The `showmount -e` verification approach may have limited utility when NFS-Ganesha is configured for NFSv4-only (as shown in the export config with `protocols: [4]`), since `showmount` relies on the NFSv3 mount protocol. It will still work if the NFS-Ganesha server has the mount protocol enabled, but readers should be aware of this caveat.
- The `ceph nfs export apply` JSON examples correctly include all required fields (`export_id`, `path`, `cluster_id`, `pseudo`, `access_type`, `squash`, `protocols`, `transports`, `fsal`).
- The `ceph nfs export get`, `ceph nfs export ls`, and `ceph nfs export rm` commands all use correct syntax.
