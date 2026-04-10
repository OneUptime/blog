# Validation Summary: How to Set Up Rook-Ceph for Canary Deployments with Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (CephBlockPool CRD, StorageClass configuration)
- Ceph (RBD block storage, CephFS, OSD pool stats, health monitoring)
- Kubernetes (Deployments, PersistentVolumeClaims, StorageClasses, CSI)
- Canary deployment patterns with persistent storage

## Sources Consulted
- Rook-Ceph official documentation: CephBlockPool CRD spec (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Rook-Ceph official documentation: StorageClass configuration for RBD (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Kubernetes API reference: StorageClass (https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/storage-class-v1/)
- Kubernetes API reference: PersistentVolumeClaim volume source (https://kubernetes.io/docs/concepts/storage/volumes/#persistentvolumeclaim)
- Kubernetes API reference: Deployment (https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/)
- Ceph CLI reference: `ceph osd pool stats`, `ceph health detail` (https://docs.ceph.com/en/latest/rados/operations/monitoring/)

## Issues Found
No technical issues found.

## Review Notes
- The stable Deployment uses `replicas: 8` with a single PVC (`myapp-stable-pvc`). RBD volumes default to `ReadWriteOnce` (RWO) access mode, meaning only one node can mount the volume at a time. If pods are scheduled across multiple nodes, mount failures will occur. The post does not show PVC definitions, so this is not a code error, but readers should be aware they need either `ReadWriteMany` access mode (not supported by RBD without additional configuration) or should use a StatefulSet with volumeClaimTemplates for per-pod volumes. A brief note about access modes would strengthen the post.
- The rollback advice to "delete the canary pool" is functionally correct but destructive — it permanently removes all data in the pool. Readers should be cautioned that this is irreversible. A safer approach would be to scale the canary to zero replicas and delete the pool only after confirming it is no longer needed.
- The CephFS read-only sharing pattern is sound but the post does not show how to create the shared CephFS filesystem or StorageClass. Readers new to Rook-Ceph may need additional guidance to implement this section.
