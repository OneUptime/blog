# Validation Summary: How to Fix StorageClass Misconfiguration in Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (StorageClass, PVC, PV)
- CSI (Container Storage Interface) drivers
- RBD (RADOS Block Device)
- CephFS

## Sources Consulted
- Rook official documentation: Block Storage StorageClass configuration (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Kubernetes official documentation: StorageClass resource (https://kubernetes.io/docs/concepts/storage/storage-classes/)
- Kubernetes official documentation: PersistentVolumeClaims (https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- Kubernetes CSI documentation: CSI driver discovery via `kubectl get csidrivers` (https://kubernetes-csi.github.io/docs/)
- Rook CSI driver naming conventions: `<namespace>.rbd.csi.ceph.com` and `<namespace>.cephfs.csi.ceph.com`

## Issues Found
No technical issues found.

## Review Notes
- The provisioner names (`rook-ceph.rbd.csi.ceph.com`, `rook-ceph.cephfs.csi.ceph.com`) assume the default Rook namespace `rook-ceph`. If operators deploy Rook in a different namespace, these names will differ accordingly. The post could mention this but it is not an error since `rook-ceph` is the standard default.
- The `clusterID` retrieval command (`kubectl get cephcluster -n rook-ceph -o jsonpath='{.items[0].metadata.namespace}'`) will always return `rook-ceph` when queried with `-n rook-ceph`. This is technically redundant but serves as a useful confirmation step and is not incorrect.
- StorageClass immutability statement is accurate — Kubernetes does not allow in-place updates to StorageClass parameters, requiring delete and recreate.
- The post correctly notes that existing PVs retain their original provisioner information and are unaffected by StorageClass deletion.
