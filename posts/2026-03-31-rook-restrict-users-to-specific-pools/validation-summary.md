# Validation Summary: How to Restrict Users to Specific Pools in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (authentication and authorization system, CephX)
- Rook (Ceph operator for Kubernetes)
- Kubernetes StorageClass with Rook CSI
- RADOS (Reliable Autonomic Distributed Object Store)
- RBD (RADOS Block Device)

## Sources Consulted
- Ceph official documentation: User Management (https://docs.ceph.com/en/latest/rados/operations/user-management/)
- Ceph official documentation: Auth subsystem and capability strings (https://docs.ceph.com/en/latest/rados/configuration/auth-config-ref/)
- Rook documentation: Ceph Block Storage / StorageClass (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)

## Issues Found
1. **"authentication error" should be "permission denied error"** (line 29): The post stated that accessing an unauthorized pool "results in an authentication error." This is incorrect terminology — CephX authentication succeeds (the user is identified), but authorization fails (the user lacks permission for that pool). The error code shown later in the post (-13, EPERM) confirms this is a permission/authorization error. Changed to "permission denied error."

2. **Keyring not written to file in verification example** (line 73): The original code used `KEYRING=$(ceph auth get client.restricted)` which captures the keyring into a shell variable but never writes it to disk. The subsequent `rados` commands reference `/tmp/test.keyring` which would not exist. Changed to `ceph auth get client.restricted -o /tmp/test.keyring` which correctly exports the keyring to the file used by the `rados` commands.

## Review Notes
- The StorageClass YAML is a partial example (missing namespace parameters for secrets like `csi.storage.k8s.io/provisioner-secret-namespace`), but the post frames it as illustrative rather than copy-paste complete, which is acceptable.
- The pool creation script hardcodes `32` placement groups. Modern Ceph versions (Nautilus+) support the `--pg-autoscale-mode` flag and pg autoscaling is on by default, so the explicit PG count may be unnecessary. This is not incorrect but could be noted in a future update.
