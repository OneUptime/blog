# Validation Summary: How to Use Mixed Drive Types for Cost Optimization in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CRUSH rules, device classes, OSD management, pool configuration)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (StorageClass, PersistentVolumeClaim, CSI provisioner)
- Ceph RBD CSI driver
- Hardware tiers: NVMe, SSD, HDD

## Sources Consulted
- Ceph documentation on CRUSH device classes: https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes
- Ceph documentation on `osd crush rule create-replicated`: https://docs.ceph.com/en/latest/rados/operations/crush-map/#crush-rules
- Rook documentation on CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook documentation on StorageClass configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Kubernetes documentation on PersistentVolumeClaim: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims
- Kubernetes documentation on StorageClass: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found

### Issue 1: Incorrect weighted cost calculation
- **What was wrong:** The weighted cost formula `(10x$450 + 20x$240 + 70x$27) / 100` was shown as equaling `~$79/TB usable`, but the actual result is `(4500 + 4800 + 1890) / 100 = $111.90/TB`, approximately `$112/TB`.
- **What was changed:** Corrected `~$79/TB usable` to `~$112/TB usable`.
- **Why:** Arithmetic error. The savings vs all-NVMe ($450/TB) are still ~75%, which is consistent with the summary's "60-80%" claim.

### Issue 2: Incomplete ceph-nvme StorageClass definition
- **What was wrong:** The `ceph-nvme` StorageClass was missing `imageFormat`, `csi.storage.k8s.io/provisioner-secret-name`, and `csi.storage.k8s.io/provisioner-secret-namespace` parameters that were correctly included in the `ceph-hdd` StorageClass. Without the secret parameters, the CSI provisioner cannot authenticate with the Ceph cluster and provisioning will fail.
- **What was changed:** Added the missing `imageFormat: "2"`, `csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner`, and `csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph` parameters to match the complete `ceph-hdd` definition.
- **Why:** These parameters are required for functional CSI-based RBD provisioning.

## Review Notes
- The PVC examples omit `accessModes`, which is technically optional in the Kubernetes API (defaults vary by provisioner), but including `accessModes: [ReadWriteOnce]` would make the examples more complete and copy-paste-ready.
- The automatic detection of the "nvme" device class depends on the Ceph/Rook version. Older Ceph versions classify NVMe drives as "ssd" by default. Users on older versions may need to manually set the device class using `ceph osd crush set-device-class nvme <osd-id>`.
- The `ceph osd crush rule create-replicated` commands are correct but represent a manual approach. Rook's CephBlockPool CRD supports a `deviceClass` field (e.g., `deviceClass: hdd`) that automatically creates the appropriate CRUSH rules, which is a more Rook-idiomatic approach.
- Cost figures are approximate and will vary by market conditions and vendor.
