# Validation Summary: How to Use Global CephFS Settings with ceph fs flag set

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CephFS subsystem, `ceph fs flag set` command)
- Rook-Ceph (Kubernetes operator for Ceph)
- Kubernetes (`kubectl` commands, CephFilesystem CRD)

## Sources Consulted
- Ceph official documentation on `ceph fs flag set` and CephFS administration (https://docs.ceph.com/en/latest/cephfs/)
- Ceph CLI reference for `ceph fs` subcommands (https://docs.ceph.com/en/latest/man/8/ceph/)
- Rook documentation on CephFilesystem CRD (https://rook.io/docs/rook/latest/CRDs/Filesystem/ceph-filesystem-crd/)

## Issues Found
No technical issues found.

## Review Notes
- The post refers to flags being "stored in the MDS map." Strictly speaking, global CephFS flags like `enable_multiple` are stored in the FSMap (Filesystem Map), which contains MDS maps as sub-structures. However, "MDS map" is commonly used interchangeably with "FSMap" in Ceph documentation and community discussions, so this is acceptable.
- Starting with Ceph Reef (v18.x), `enable_multiple` is enabled by default. The post does not specify version requirements, which keeps it broadly applicable but readers on newer Ceph releases may find the flag already set.
- The CephFilesystem CRD example uses correct Rook `ceph.rook.io/v1` API and valid spec fields (`metadataPool`, `dataPools`, `metadataServer` with `activeCount` and `activeStandby`).
- All `kubectl exec` commands correctly target `deploy/rook-ceph-tools` in the `rook-ceph` namespace, which is the standard Rook toolbox deployment.
