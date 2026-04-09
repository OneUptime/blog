# Validation Summary: How to Implement ReadWriteOnce (RWO) Storage with Ceph RBD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes (PersistentVolumes, PersistentVolumeClaims, StorageClasses, StatefulSets)
- Rook-Ceph (CSI RBD provisioner)
- Ceph RBD (RADOS Block Device)
- PostgreSQL (as example workload)

## Sources Consulted
- Kubernetes official documentation on PersistentVolumes and access modes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes
- Rook Ceph Block Storage (RBD) documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook CSI driver StorageClass examples: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/#provision-storage
- PostgreSQL Docker image documentation (PGDATA subdirectory recommendation): https://hub.docker.com/_/postgres
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
No technical issues found.

## Review Notes
- The StatefulSet example uses a direct `volumes.persistentVolumeClaim` reference rather than `volumeClaimTemplates`, which is the more idiomatic pattern for StatefulSets. However, with `replicas: 1` and a pre-created PVC, this is entirely valid and arguably clearer for the tutorial's purpose of demonstrating RWO usage.
- The post could mention `ReadWriteOncePod` (RWOP), available since Kubernetes 1.22 (beta) and GA in 1.29, which restricts access to a single Pod rather than a single node. This is not an error — RWO is still widely used — but worth noting for future updates.
- All CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) and namespaces match the Rook default installation conventions.
