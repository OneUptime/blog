# Validation Summary: How to Configure CephFS FUSE Mount Options in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph / CephFS
- ceph-fuse (FUSE client for CephFS)
- Kubernetes StorageClass and CSI
- ceph-csi (Ceph CSI driver)
- FUSE / libfuse

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephCluster Go types (CSICephFSSpec struct): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go - confirmed `fuseMountOptions` is type `string`, not `[]string`
- Rook operator.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/operator.yaml - confirmed available ConfigMap keys
- ceph-csi CephFS StorageClass example: https://github.com/ceph/ceph-csi/blob/devel/examples/cephfs/storageclass.yaml - confirmed `mounter` and `fuseMountOptions` parameters
- Rook filesystem storage documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Ceph tracker issue on big_writes: https://tracker.ceph.com/issues/44885 - confirmed auto-handling in ceph-fuse
- ceph/ceph PR #34531: https://github.com/ceph/ceph/pull/34531 - ceph-fuse libfuse3 big_writes handling
- libfuse 3.0.0 release notes: https://github.com/libfuse/libfuse/releases/tag/fuse-3.0.0

## Issues Found

### 1. CephCluster CRD `fuseMountOptions` shown as YAML list instead of string (ERROR)
**What was wrong:** The `fuseMountOptions` field in the CephCluster CRD example was shown as a YAML list of strings. The Rook Go type `CSICephFSSpec` defines this field as `string`, not `[]string`. Using a list would fail CRD validation.
**What was changed:** Converted from a YAML list to a comma-separated string: `fuseMountOptions: "default_permissions,allow_other,kernel_cache,max_write=16777216"`

### 2. Non-existent ConfigMap key `CSI_CEPHFS_FUSEMOUNT_OPTIONS` (ERROR)
**What was wrong:** The operator ConfigMap example included `CSI_CEPHFS_FUSEMOUNT_OPTIONS` as a key. This key does not exist in the Rook operator. The available CephFS-related ConfigMap keys include `CSI_FORCE_CEPHFS_KERNEL_CLIENT` and `CSI_CEPHFS_KERNEL_MOUNT_OPTIONS`, but there is no FUSE mount options key. FUSE mount options are configured via the CephCluster CRD or StorageClass parameters.
**What was changed:** Removed the invalid ConfigMap key. The ConfigMap example now only shows `CSI_FORCE_CEPHFS_KERNEL_CLIENT: "false"`, with surrounding text clarified to explain that FUSE mount options are set in the CRD.

### 3. StorageClass missing required `mounter: "fuse"` parameter (ERROR)
**What was wrong:** The StorageClass example included `fuseMountOptions` but was missing the `mounter: "fuse"` parameter. Without this, ceph-csi defaults to auto-detection which typically selects the kernel client, rendering the `fuseMountOptions` ineffective.
**What was changed:** Added `mounter: "fuse"` to the StorageClass parameters.

### 4. `big_writes` recommended as a manual mount option (OUTDATED)
**What was wrong:** The post listed `big_writes` as a FUSE mount option to set manually for performance tuning. Since Ceph Octopus (v15.2), ceph-fuse automatically enables `big_writes` when linked against libfuse2. In libfuse3, `big_writes` is always enabled by default and the option flag itself is removed. Manually specifying it is unnecessary and can cause warnings with libfuse3.
**What was changed:** Removed `big_writes` from the common options table and tuning section. Added a note explaining that ceph-fuse handles this automatically.

### 5. Misleading description of `CSI_FORCE_CEPHFS_KERNEL_CLIENT` (INACCURACY)
**What was wrong:** The post stated setting this to `"false"` "allows the CSI driver to fall back to FUSE on nodes where the kernel module is unavailable." This implies a fallback mechanism. In reality, setting it to `"false"` actively selects the FUSE client for all CephFS mounts - it's not a conditional fallback.
**What was changed:** Reworded to: "tells the CSI driver to use the FUSE client (`ceph-fuse`) instead of the kernel client for CephFS mounts."

### 6. Tuning section `fuseMountOptions` also shown as YAML list (ERROR)
**What was wrong:** Same issue as #1 - the tuning section snippet showed `fuseMountOptions` as a YAML list.
**What was changed:** Converted to comma-separated string format.

## Review Notes
- The `max_write` default value was removed from the options table because the actual default varies by libfuse version and kernel FUSE module configuration. Stating a specific default could be misleading.
- The `mounter` parameter in the StorageClass accepts `"fuse"` or `"kernel"`. When omitted, ceph-csi probes for available clients. For guaranteed FUSE behavior, explicitly setting `mounter: "fuse"` is recommended.
- The post's overall advice to prefer the kernel client for performance and use FUSE selectively is sound and well-aligned with upstream Ceph and Rook recommendations.
