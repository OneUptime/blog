# Validation Summary: How to Configure Subvolume Groups for CephFS in Rook

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
- Rook GitHub CRD type definitions: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Ceph FS Volumes and Subvolumes documentation: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- Rook CephFS StorageClass documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Cross-referenced with already-validated sibling post `rook-how-to-create-cephfilesystemsubvolumegroup-crds-in-rook` which identified the same quota format issue

## Issues Found

### 1. Incorrect `quota` field structure (all CRD YAML examples)
- **What was wrong:** The post used a nested object structure for the `quota` field with `maxBytes` (integer) and `maxFiles` sub-fields. For example: `quota: { maxBytes: 10995116277760, maxFiles: 1000000 }`.
- **What was changed:** Replaced all quota fields with the correct format — a simple Kubernetes resource quantity string. Examples: `quota: 10Ti`, `quota: 2Ti`, `quota: 512Gi`. Removed `maxFiles` entirely.
- **Why:** The Rook `CephFilesystemSubVolumeGroup` CRD defines `quota` as a `resource.Quantity` type, not a structured object. The `maxFiles` (inode limit) is not exposed through this CRD. While Ceph itself supports both byte and file quotas via extended attributes, the Rook CRD only exposes the byte quota as a simple quantity value.

### 2. Mermaid diagram inconsistency for dev quota
- **What was wrong:** The architecture diagram showed `Quota: 1Ti` for the dev group, but the YAML examples defined the dev group quota as 512 GiB (`549755813888` bytes).
- **What was changed:** Updated the diagram node from `Quota: 1Ti` to `Quota: 512Gi` to match the YAML.
- **Why:** The diagram should accurately reflect the values used in the configuration examples below it.

### 3. Misleading CLI comment for `getpath` command
- **What was wrong:** The comment said "Get quota info for a group" but the `ceph fs subvolumegroup getpath` command returns the filesystem path of the group, not quota information.
- **What was changed:** Changed the comment to "Get path of a group".
- **Why:** The `getpath` subcommand returns the mount path (e.g., `/volumes/production`), not quota details. Using `ceph fs subvolumegroup info` would be needed for quota inspection, but `getpath` is still a useful inspection command, so only the comment was corrected.

## Review Notes
- The `apiVersion: ceph.rook.io/v1` is correct for the CephFilesystemSubVolumeGroup CRD.
- The `filesystemName`, `name`, and `dataPoolName` fields are all accurate and correctly documented.
- The StorageClass `cephFS.subvolumeGroup` parameter is correctly used to direct PVCs to a specific subvolume group.
- The provisioner name `rook-ceph.cephfs.csi.ceph.com` is the standard Rook CephFS CSI provisioner.
- The CSI secret parameter names and patterns are correct.
- The `ceph fs subvolumegroup ls` and `ceph fs subvolume ls --group_name` CLI commands are correct.
- The concept that Rook defaults to a `csi` subvolume group is accurate.
