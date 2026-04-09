# Validation Summary: How to Plan CephFS for Web Content Serving

## Status
validated

## Post Type
Tutorial / Planning Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS
- Kubernetes (Deployments, StorageClass, PVC)
- Ceph MDS (Metadata Server)
- Nginx
- CSI (Container Storage Interface) driver for CephFS

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephFS StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/mds-config-ref/
- Ceph CephFS client configuration: https://docs.ceph.com/en/latest/cephfs/client-config-ref/
- Kubernetes Deployment spec: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
1. **Missing pod template labels in Deployment YAML**: The `spec.template` was missing `metadata.labels` with `app: nginx-web`. Kubernetes requires that `spec.selector.matchLabels` matches the pod template labels. Without this, the Deployment would be rejected by the API server with a validation error. Added the required `metadata.labels` block to the pod template.

## Review Notes
- The `noacl` mount option in the StorageClass may be silently ignored by the CephFS kernel client, as ACL handling in CephFS differs from traditional filesystems like ext4/xfs. `noatime` is valid and beneficial for read-heavy workloads.
- The `client_readahead_max_bytes` config option is set at the `client` section level, which is correct for libcephfs-based clients. For kernel CephFS mounts (which is what the CSI driver uses by default), readahead is managed by the Linux VFS layer and this setting may not apply. The post could clarify which CephFS mount type benefits from this tuning.
- The MDS `mds_cache_memory_limit` is set to 4 GiB, which matches the MDS container memory limit of 4 GiB. In practice, the MDS cache limit should be set lower than the container memory limit to leave headroom for other MDS memory usage. A value of ~3 GiB would be safer with a 4 GiB container limit.
- nginx 1.25 is a valid image tag but users should verify the latest stable version at deployment time.
