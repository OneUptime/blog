# Validation Summary: How to Use PersistentVolumes on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes PersistentVolumes
- Kubernetes PersistentVolumeClaims
- Kubernetes StorageClasses
- Kubernetes StatefulSets and Deployments
- CSI storage drivers
- Rook Ceph
- Longhorn
- NFS and CephFS shared storage

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Talos Linux local storage documentation: https://docs.siderolabs.com/kubernetes-guides/csi/local-storage
- Talos Linux disk management documentation: https://docs.siderolabs.com/talos/v1.10/talos-guides/configuration/disk-management
- Longhorn access modes documentation: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/create-volumes/
- Longhorn RWX volumes documentation: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/rwx-volumes/
- Rook Ceph CSI drivers documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook Ceph block storage documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/

## Issues Found
- The post said all persistent data on Talos must go through Kubernetes storage primitives. Changed this to persistent workload data should be managed through Kubernetes storage primitives, because Talos also has node-level user volumes and system volumes.
- The static local PV example used `/var/local-storage/vol-001`. Changed it to `/var/mnt/local-storage/vol-001`, matching Talos user volume guidance for local workload storage.
- The dynamic provisioning explanation implied Kubernetes itself creates PVs. Clarified that the storage provisioner creates PVs when a PVC is submitted.
- The access modes section listed only three access modes. Added `ReadWriteOncePod`, which is stable in Kubernetes 1.29 and supported for CSI volumes.
- The access mode explanation treated `ReadWriteOnce` as single-pod access. Corrected this to single-node access and noted `ReadWriteOncePod` for true single-pod access.
- The storage backend notes said Longhorn is typically only `ReadWriteOnce`. Updated this to mention Longhorn RWX support when the RWX prerequisites are installed.
- The Rook Ceph reclaim policy example used an incomplete static CSI `PersistentVolume` that would not be a reliable production example. Replaced it with a `StorageClass` example using `reclaimPolicy: Retain`.
- The volume expansion section overstated that most modern Talos storage classes support expansion. Changed this to CSI-backed storage classes that set `allowVolumeExpansion: true`.
- The summary claimed there is no other way to persist data across pod restarts and rescheduling on Talos. Narrowed this to recommending Kubernetes storage primitives for data that must survive pod restarts and rescheduling.

## Review Notes
The examples are syntactically valid YAML. Some operational details remain storage-backend-specific, especially CSI driver labels for logs and exact Rook/Longhorn class names, so users should adapt those to their installed provisioner.
