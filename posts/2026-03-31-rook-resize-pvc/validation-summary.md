# Validation Summary: How to Resize a PVC Backed by Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD and CephFS CSI drivers)
- Kubernetes PersistentVolumeClaims (PVC) and StorageClasses
- Ceph RBD image management
- CephFS subvolume management
- Kubernetes CSI volume expansion

## Sources Consulted
- Rook-Ceph documentation on StorageClass configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook-Ceph documentation on CephFS StorageClass: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Kubernetes documentation on volume expansion: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims
- Kubernetes CSI spec for ControllerExpandVolume and NodeExpandVolume RPCs
- Ceph documentation on auth capabilities: https://docs.ceph.com/en/latest/rados/operations/user-management/

## Issues Found
1. **PVC status transition description was incorrect**: The post stated the PVC status "should transition through `Resizing` and then back to `Bound`." In reality, the PVC phase remains `Bound` throughout the resize process. The resize progress is tracked via PVC conditions (`Resizing`, `FileSystemResizePending`), not phase changes. Fixed to accurately describe the condition-based tracking.

2. **Offline PVC `status.capacity` claim was wrong**: The post stated "The PVC will show the new size in `status.capacity`" for an offline PVC. This is incorrect — `status.capacity` only updates after the node-side filesystem expansion completes, which requires a running pod. The PVC will instead show a `FileSystemResizePending` condition. Fixed to reflect the correct behavior.

3. **Incorrect Ceph capability reference in Common Issues**: The post referenced `osd pool application set` as a Ceph auth capability needed for the CSI provisioner. `osd pool application set` is a Ceph CLI command for tagging pools with applications, not an auth capability. The correct capabilities for the CSI provisioner are `mon 'profile rbd'` and `osd 'profile rbd pool=<pool>'`. Fixed to reference the correct Ceph auth capabilities.

## Review Notes
- The StorageClass examples for both RBD and CephFS are accurate and include the required `controller-expand-secret-name` and `controller-expand-secret-namespace` parameters needed for volume expansion.
- The mermaid sequence diagram accurately represents the CSI volume expansion flow.
- The Rook version requirement (1.3+) for volume expansion support is correct.
- The `kubectl` commands shown are all syntactically correct and appropriate.
- The CSI provisioner container name in the log command (`-c csi-provisioner`) and the label selector (`app=csi-rbdplugin-provisioner`) are correct for Rook-Ceph deployments.
