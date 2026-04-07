# Validation Summary: How to Use Rook-Ceph with StatefulSet Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CSI driver, CephBlockPool, StorageClass)
- Ceph RBD (block storage)
- CephFS (shared filesystem)
- Kubernetes StatefulSets
- Kubernetes PersistentVolumeClaims (PVCs)
- Kubernetes Headless Services
- Kubernetes PodDisruptionBudgets
- PostgreSQL 16 (used as example workload)

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes volumeClaimTemplates documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-storage
- Rook-Ceph Block Storage (RBD) documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook-Ceph Filesystem (CephFS) documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook-Ceph StorageClass examples: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/#provision-storage
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- PostgreSQL Docker image documentation: https://hub.docker.com/_/postgres

## Issues Found
No technical issues found.

## Review Notes
- The StatefulSet YAML correctly uses a PGDATA subdirectory (`/var/lib/postgresql/data/pgdata`) to avoid conflicts with the `lost+found` directory created by ext4 filesystems on the PVC mount.
- The CephFS section correctly notes that volumeClaimTemplates still creates separate PVCs per pod even with ReadWriteMany access mode. If truly shared storage across all pods is needed, a single PVC with a volume reference in the pod template (not volumeClaimTemplates) would be the approach.
- The StorageClass uses `imageFormat: "2"` which is correct and standard for Ceph RBD images.
- All API versions used (`apps/v1`, `v1`, `policy/v1`, `storage.k8s.io/v1`, `ceph.rook.io/v1`) are current and non-deprecated.
- The CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) match Rook's default secret naming conventions.
