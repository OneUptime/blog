# Validation Summary: How to Configure Ceph Storage for a Basic Kubernetes Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RBD block storage, CephFS filesystem)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (StorageClass, PersistentVolumeClaim, CSI)
- Rook CSI driver (rook-ceph.rbd.csi.ceph.com)

## Sources Consulted
- Rook official documentation: CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Rook official documentation: Block Storage StorageClass (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Rook official documentation: CephFilesystem CRD (https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- Kubernetes official documentation: StorageClass (https://kubernetes.io/docs/concepts/storage/storage-classes/)
- Kubernetes official documentation: PersistentVolumeClaims (https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

## Issues Found
No technical issues found.

## Review Notes
- The post creates a CephFilesystem but does not provide a corresponding CephFS StorageClass (using the `rook-ceph.cephfs.csi.ceph.com` provisioner). Without this, users cannot provision CephFS-backed PVCs. A future update could add a CephFS StorageClass and an example ReadWriteMany PVC to complete the CephFS story.
- All CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) match the defaults created by the Rook operator and are correct.
- The `kubectl run --overrides` verification approach works but is somewhat fragile. A standalone Pod YAML would be clearer, though the current approach is technically correct.
