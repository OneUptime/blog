# Validation Summary: How to Understand the Three Rook CSI Drivers (RBD, CephFS, NFS)

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- CephFS (Ceph Filesystem)
- NFS-Ganesha (NFS server over CephFS)
- Kubernetes CSI (Container Storage Interface)
- Kubernetes StorageClass API

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook official documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook official documentation: https://rook.io/docs/rook/latest/Storage-Configuration/NFS/nfs/
- Ceph CSI driver documentation: https://github.com/ceph/ceph-csi
- Kubernetes CSI specification: https://kubernetes-csi.github.io/docs/

## Issues Found
No technical issues found.

## Review Notes
- The StorageClass YAML examples are intentionally simplified for clarity. Production configurations would typically include additional secret references such as `csi.storage.k8s.io/node-stage-secret-name`, `csi.storage.k8s.io/node-stage-secret-namespace`, and `csi.storage.k8s.io/controller-expand-secret-name`. This is acceptable for a comparison/overview post.
- RBD also supports `ReadWriteOncePod` (RWOP) access mode in newer Kubernetes versions, but listing only RWO is appropriate for this overview.
- The comparison table lists NFS snapshot support as "Limited" which is reasonable — the NFS CSI driver does not natively support CSI snapshots, though the underlying CephFS does.
- CephFS also supports RWO and ROX access modes in addition to RWX, but the post correctly highlights RWX as the primary differentiator.
