# Validation Summary: How to Create a CephBlockPool CRD in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (RADOS block storage / RBD)
- Kubernetes (CRDs, StorageClass, PersistentVolumeClaim)
- CSI (Container Storage Interface) via rook-ceph RBD driver

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook source code (QuotaSpec struct in types.go): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook CephCluster CRD documentation (cleanupPolicy): https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CSI drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook example StorageClass for RBD: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass-ec.yaml
- Ceph CLI man page (ceph osd pool ls): https://www.mankier.com/8/ceph

## Issues Found

### 1. `quotas.maxBytes` replaced with `quotas.maxSize`
- **What was wrong:** The post used `quotas.maxBytes: 10Gi`. The `maxBytes` field is deprecated in favor of `maxSize` in current Rook versions. Additionally, `maxBytes` is typed as `uint64` (plain integer in bytes), so the Kubernetes quantity string `10Gi` would be invalid for that field. The newer `maxSize` field accepts string quantities like `"10Gi"`.
- **What was changed:** Replaced `maxBytes: 10Gi` with `maxSize: "10Gi"`.
- **Why:** Ensures readers use the current, non-deprecated field with the correct value type.

### 2. Inaccurate description of CephBlockPool deletion behavior
- **What was wrong:** The post stated "Rook will reject deletion if active volumes exist unless `allowUninstallWithVolumes` is set." This is inaccurate on two counts: (a) Rook does not reject the delete request -- the resource enters a `Terminating` state with the `cephblockpool.ceph.rook.io` finalizer preventing actual removal until the pool is clean; (b) `allowUninstallWithVolumes` is a CephCluster-level setting under `spec.cleanupPolicy`, not applicable to individual CephBlockPool deletions.
- **What was changed:** Rewrote the sentence to accurately describe the finalizer-based blocking behavior.
- **Why:** Prevents readers from expecting an immediate error on `kubectl delete` when the actual behavior is the resource hanging in Terminating state.

## Review Notes
- The API version `ceph.rook.io/v1`, kind `CephBlockPool`, and all YAML field names in the minimal example and key spec fields are correct for current Rook versions.
- The CSI provisioner name `rook-ceph.rbd.csi.ceph.com` and default secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) match current Rook defaults.
- The `ceph osd pool ls detail` command is valid Ceph CLI syntax.
- The StorageClass and PVC examples are correct and follow standard Rook patterns.
- The `imageFormat: "2"` parameter is technically legacy (format 2 has been the default for many years), but including it explicitly does no harm and improves clarity.
