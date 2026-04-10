# Validation Summary: How to Configure CephFS Client Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph / CephFS (distributed filesystem)
- CephFS kernel client (mount.ceph)
- ceph-fuse (FUSE-based CephFS client)
- Kubernetes StorageClass / CSI
- ceph-csi driver

## Sources Consulted
- Ceph mount.ceph man page: https://docs.ceph.com/en/latest/man/8/mount.ceph/
- Linux kernel CephFS documentation: https://docs.kernel.org/filesystems/ceph.html
- Linux kernel source (fs/ceph/super.c, fs/ceph/super.h) for rsize/wsize defaults
- Ceph client config reference: https://docs.ceph.com/en/latest/cephfs/client-config-ref/
- Ceph MDS client options source (src/common/options/mds-client.yaml.in) for client_mount_timeout and client_reconnect_stale
- Rook CephFS StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/cephfs/storageclass.yaml
- ceph-csi StorageClass example: https://github.com/ceph/ceph-csi/blob/devel/examples/cephfs/storageclass.yaml
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found

1. **`rsize` and `wsize` default values were incorrect.** The post claimed "default: 4MB" for both options. The Ceph mount.ceph man page documents the default as 16MB (16*1024*1024). Changed to "default: 16MB, max: 64MB" for both.

2. **`client_mount_timeout` description was incorrect.** The comment stated "Time before a client reconnects after losing contact with MDS." This is wrong; `client_mount_timeout` is the timeout (in seconds) for the CephFS mount operation to complete. Changed to "Timeout for the CephFS mount operation (seconds)."

3. **`client_reconnect_stale` description was incorrect.** The comment stated "Time before stale sessions are reclaimed," but the option is a boolean (set to `true`), not a time value. It controls whether the client should automatically attempt to reconnect when its session becomes stale. Changed to "Whether to reconnect automatically when the session becomes stale."

4. **StorageClass YAML had `mountOptions` incorrectly placed under `parameters`.** The `mountOptions` field is not a valid key inside `parameters` for the ceph-csi driver and would be silently ignored. It must be a top-level field in the StorageClass spec as an array of strings. Moved `mountOptions` to the top level and reformatted as a YAML array. Alternatively, `kernelMountOptions` or `fuseMountOptions` can be used under `parameters` as comma-separated strings for mounter-specific options.

## Review Notes
- The `client_mount_timeout` is set to 300, which is already the default value. The command is technically correct but redundant unless a prior config change has altered it.
- The `secretfile` mount option in the kernel mount example points to a full keyring file (`ceph.client.admin.keyring`). Strictly, `secretfile` expects a file containing only the raw base64 secret key, not a full keyring. However, newer versions of the `mount.ceph` helper can parse keyring files, so this may work depending on the version in use.
- The `rsize` and `wsize` defaults show some discrepancy between Ceph documentation (16MB) and the Linux kernel source (64MB where the default equals `CEPH_MAX_READ_SIZE`/`CEPH_MAX_WRITE_SIZE`). The Ceph man page value (16MB) was used as it is the primary user-facing documentation.
- For mounter-specific options, ceph-csi also supports `kernelMountOptions` and `fuseMountOptions` under `parameters` as comma-separated strings, which provides finer-grained control than the top-level `mountOptions` field.
