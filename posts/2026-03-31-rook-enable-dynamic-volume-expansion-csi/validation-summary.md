# Validation Summary: How to Enable Dynamic Volume Expansion with Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (RBD block storage, CephFS filesystem storage)
- Kubernetes (PersistentVolumeClaims, StorageClasses, CSI)
- CSI (Container Storage Interface) volume expansion

## Sources Consulted
- Kubernetes Feature Gates documentation: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes Volume Expansion GA blog post: https://kubernetes.io/blog/2022/05/05/volume-expansion-ga/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Rook Ceph CSI Drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook Block Storage documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Ceph CSI expand-pvc documentation: https://github.com/ceph/ceph-csi/blob/devel/docs/expand-pvc.md
- Kubernetes CSI Volume Expansion documentation: https://kubernetes-csi.github.io/docs/volume-expansion.html

## Issues Found

1. **Incorrect feature gate name and version (description + intro section):** The post referred to a "VolumeExpansion feature gate" enabled by default since Kubernetes 1.24. The actual feature gates are `ExpandPersistentVolumes` (GA in 1.16, removed in 1.24), `ExpandCSIVolumes` (GA in 1.23, removed in 1.26), and `ExpandInUsePersistentVolumes` (GA in 1.23, removed in 1.26). Fixed to list the correct gate names and note they are GA since 1.23.

2. **Misleading claim that RBD expansion is fully online (description + intro section):** The post description said "without pod restarts" and the intro said "supports online expansion for both RBD and CephFS." Per the Ceph CSI documentation, RBD volumes require a pod restart for the filesystem resize step (the `NodeExpandVolume` call is triggered on pod restart). Only CephFS volumes expand fully online. Fixed both the description and intro to clarify this distinction.

3. **Misleading parenthetical about automatic node-level resize (Watching the Expansion section):** The post said RBD filesystem expansion happens "immediately if the node-level resize is triggered automatically." Per Ceph CSI docs, RBD always requires a pod restart. Replaced the parenthetical with accurate information about the `FileSystemResizePending` condition and the `NodeExpandVolume` CSI call triggered on pod restart.

4. **Incorrect troubleshooting point about StorageClass timing (Troubleshooting section):** The post said the StorageClass needed `allowVolumeExpansion: true` "at the time of provisioning." What actually matters is the current state of the StorageClass at the time of the resize request. The `allowVolumeExpansion` field is mutable and can be patched after provisioning. Fixed to say "does not currently have."

## Review Notes
- The StorageClass YAML, provisioner name (`rook-ceph.rbd.csi.ceph.com`), CSI secret parameter names, `kubectl patch` commands, and `FileSystemResizePending` condition name are all correct.
- The optional `csi.storage.k8s.io/node-expand-secret-name` and `csi.storage.k8s.io/node-expand-secret-namespace` parameters (GA in Kubernetes 1.29) are not included in the StorageClass example. Their omission is fine since they are optional and not in Rook's standard examples, but could be mentioned in a future update.
- The summary section already correctly stated that RBD needs a pod restart, which contradicted the intro. This internal contradiction has been resolved so the post is now consistent throughout.
