# Validation Summary: How to Set OSD Device Classes in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- CRUSH map (Ceph's data placement algorithm)
- OSD device classes (hdd, ssd, nvme)
- CephBlockPool CRD
- CephCluster CRD with storageClassDeviceSets

## Sources Consulted
- Ceph official documentation on device classes: https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes
- Rook documentation on CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook documentation on CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph CLI reference for `ceph osd crush` subcommands: https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found
No technical issues found.

## Review Notes
- The post mentions that "Rook does not expose a direct `deviceClass` field on individual OSD specs in all versions." In current Rook versions, `storageClassDeviceSets` entries support a `crushDeviceClass` field within the set's config, which provides a more declarative way to assign device classes without relying solely on auto-detection. The post's approach of using separate device sets with different StorageClasses is valid and commonly used, but readers using recent Rook versions could also leverage the `crushDeviceClass` config option.
- The `ceph osd df tree` command with grep filtering is functional but the CLASS column is more reliably shown in `ceph osd tree` output. Both commands work for the stated purpose.
- All Ceph CLI commands use correct syntax and flags.
- The CephCluster and CephBlockPool YAML manifests are structurally valid with correct API versions and field names.
