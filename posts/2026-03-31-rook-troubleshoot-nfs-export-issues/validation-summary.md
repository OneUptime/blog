# Validation Summary: How to Troubleshoot NFS Export Issues in Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph NFS (NFS-Ganesha)
- CephFS
- Kubernetes (kubectl)
- RADOS

## Sources Consulted
- Ceph NFS CLI documentation: https://docs.ceph.com/en/latest/cephadm/services/nfs/
- Rook NFS documentation: https://rook.io/docs/rook/latest/Storage-Configuration/NFS/nfs/
- NFS-Ganesha project documentation: https://github.com/nfs-ganesha/nfs-ganesha
- Kubernetes kubectl exec documentation: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
1. **Incorrect flag `--pseudo` in `ceph nfs export create cephfs` command**: The flag was written as `--pseudo` but the correct Ceph CLI flag is `--pseudo-path`. Fixed to `--pseudo-path /data`.

2. **Shell `&&` operator scoping bug in Step 6 (Inspect Ganesha Stats)**: The command used `&&` outside the `kubectl exec` boundary, meaning `ganesha_mgr get_stats` would execute on the local machine rather than inside the container. Wrapped both commands in `sh -c '...'` so they both execute inside the container.

## Review Notes
- All other commands (`ceph nfs export ls`, `ceph nfs export info`, `ceph fs status`, `showmount -e`, kubectl label selectors) are correct.
- The Rook NFS service naming convention `rook-ceph-nfs-<name>-<id>` used in the examples is accurate.
- The troubleshooting flow is logically structured from pod health through export config, networking, mount issues, filesystem health, and protocol-level stats.
- The `ganesha_mgr` tool availability depends on the NFS-Ganesha container image; some images may use `dbus-send` instead. This is a minor caveat but the approach described is valid for Rook's default NFS container.
