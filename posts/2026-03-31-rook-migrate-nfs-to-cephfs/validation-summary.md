# Validation Summary: How to Migrate from NFS to CephFS

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Rook-Ceph (CephFilesystem CRD, CSI driver)
- CephFS (distributed POSIX file storage)
- NFS (legacy file storage)
- Kubernetes (PV, PVC, StorageClass, Pod, Deployment)
- rsync (file-level data migration)

## Sources Consulted
- Rook CephFS Filesystem documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook CephFS StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/#consume-the-shared-filesystem-k8s-registry
- Kubernetes PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- kubectl CLI reference: https://kubernetes.io/docs/reference/kubectl/
- rsync man page / documentation

## Issues Found
1. **Step 5 - File list comparison command was broken in two ways:**
   - **Process substitution on host shell:** The original command `kubectl exec ... -- diff <(find ...) <(find ...)` used Bash process substitution (`<(...)`), which is evaluated by the *host* shell, not inside the container. This means `find /nfs-source` and `find /cephfs-dest` would run on the host (where those paths likely don't exist), not in the container where the NFS and CephFS volumes are mounted.
   - **Path prefix mismatch:** Even if the finds ran inside the container, `diff` would report every line as different because one side lists `/nfs-source/...` paths and the other lists `/cephfs-dest/...` paths.
   - **Fix:** Replaced with `kubectl exec ... -- sh -c '...'` that runs entirely inside the container, uses `sed` to strip the base path prefixes before comparing, and writes to temp files instead of relying on process substitution (Alpine's `/bin/sh` does not support `<(...)`).

## Review Notes
- The CephFilesystem CRD, StorageClass, and PVC manifests are all correct and follow current Rook-Ceph conventions.
- The rsync migration pod approach is a well-established pattern for PVC-to-PVC data migration in Kubernetes.
- The `kubectl set env` in Step 6 is not strictly necessary for the PVC swap but is reasonable as an example of updating application configuration during cutover.
- The comment "CephFS supports RWX unlike RBD" in the PVC is accurate for filesystem-mode volumes; RBD supports ReadWriteOnce but not ReadWriteMany in filesystem mode.
