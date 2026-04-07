# Validation Summary: How to Scale NFS Servers in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph NFS (CephNFS CRD)
- NFS-Ganesha
- Kubernetes (PodDisruptionBudget, resource requests/limits)
- RADOS (Ceph object store for shared NFS config)

## Sources Consulted
- Rook CephNFS CRD documentation (latest-release): https://www.rook.io/docs/rook/latest-release/CRDs/ceph-nfs-crd/
- Rook CephNFS CRD documentation (v1.10): https://rook.io/docs/rook/v1.10/CRDs/ceph-nfs-crd/
- Rook v1.12 CRD specification: https://rook.io/docs/rook/v1.12/CRDs/specification/
- Rook GitHub issue #8450 (CephNFS RADOS spec updates): https://github.com/rook/rook/issues/8450
- NFS-Ganesha DBus interface documentation: https://github.com/nfs-ganesha/nfs-ganesha/wiki/Dbusinterface

## Issues Found

1. **Invalid `spec.rados.object` field in CephNFS YAML**: The blog included `object: conf-nfs.my-nfs` under `spec.rados`. This field does not exist in the CephNFS CRD — the `rados` section only supports `pool` and `namespace`. Removed the `object` line.

2. **Incorrect command to list NFS clients**: The blog used `ganesha_mgr get_clients`, which is not a real NFS-Ganesha command. NFS-Ganesha exposes client management through its DBus interface. Replaced with the correct `dbus-send` command targeting `org.ganesha.nfsd.clientmgr.ShowClients`.

## Review Notes
- The `spec.rados` section (with `pool` and `namespace`) is optional in Rook v1.10+ with Ceph Pacific (v16) or later. For Ceph Pacific+, the pool is hardcoded to `.nfs` and the namespace defaults to the NFS cluster name. The post could note this, but the current usage is not incorrect for backward compatibility with older Ceph versions.
- The post correctly identifies that NFS is stateful and scaling down requires client migration — an important operational consideration often overlooked.
- The PDB configuration and resource request examples are accurate and follow Kubernetes best practices.
