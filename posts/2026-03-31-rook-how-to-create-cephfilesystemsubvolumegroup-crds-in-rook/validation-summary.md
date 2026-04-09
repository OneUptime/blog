# Validation Summary: How to Create CephFilesystemSubVolumeGroup CRDs in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (CephFS, SubVolumeGroups)
- Kubernetes (CRDs, StorageClasses, PVCs)
- Ceph CSI driver

## Sources Consulted
- Rook CephFilesystemSubVolumeGroup CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-fs-subvolumegroup-crd/
- Rook GitHub repository CRD type definitions: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook GitHub documentation: https://github.com/rook/rook/blob/master/Documentation/CRDs/Shared-Filesystem/ceph-fs-subvolumegroup-crd.md
- Ceph FS Volumes and Subvolumes documentation: https://docs.ceph.com/en/latest/cephfs/fs-volumes/

## Issues Found

### 1. Incorrect `quota` field structure (all YAML examples)
- **What was wrong:** The post used a nested object structure for the `quota` field with `maxBytes` (integer) and `maxFiles` sub-fields. For example: `quota: { maxBytes: 107374182400, maxFiles: 1000000 }`.
- **What was changed:** Replaced all quota fields with the correct format — a simple Kubernetes resource quantity string. For example: `quota: 100Gi`. The Rook CRD defines `quota` as a `resource.Quantity` type, not a structured object.
- **Why:** The Rook CephFilesystemSubVolumeGroup CRD only supports a single byte-based quota as a Kubernetes quantity value. The `maxFiles` (inode limit) is not exposed through this CRD. While Ceph itself supports both byte and file quotas via extended attributes, the Rook CRD abstraction only exposes the byte quota.

### 2. Affected examples
- Main example (line ~33): Changed from `quota: { maxBytes: 107374182400, maxFiles: 1000000 }` to `quota: 100Gi`
- Fields Explained quota section: Rewrote to show simple quantity format and removed `maxFiles` reference
- Multi-tenancy production example: Changed from `quota: { maxBytes: 1099511627776 }` to `quota: 1Ti`
- Multi-tenancy staging example: Changed from `quota: { maxBytes: 107374182400 }` to `quota: 100Gi`

## Review Notes
- The `apiVersion: ceph.rook.io/v1` is correct.
- The `filesystemName`, `name`, `dataPoolName`, and `pinning` fields are all accurate and correctly documented.
- The `pinning` options (`distributed`, `export`, `random`) are correctly described; only one can be set at a time.
- The StorageClass `subvolumeGroup` parameter is a valid Ceph CSI parameter for directing PVCs to a specific subvolume group.
- The `ceph fs subvolumegroup ls myfs` CLI command is correct.
- The `name` field defaulting to the Kubernetes resource name when omitted is consistent with Rook behavior.
