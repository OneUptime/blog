# Validation Summary: How to Understand Profile Immutability After Creation in Erasure Coding

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (erasure code profiles, OSD pools, RADOS)
- Rook (CephBlockPool CRD)
- Kubernetes (StorageClass, PVC migration)

## Sources Consulted
- Ceph official documentation on erasure code profiles (https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/)
- Ceph OSDMonitor source code for `erasure-code-profile set` and `rm` command behavior
- Ceph documentation on pool operations (`ceph osd pool set`) (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Rook documentation on CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph documentation on `rados cppool` (https://docs.ceph.com/en/latest/man/8/rados/)

## Issues Found
1. **Incorrect error code for `erasure-code-profile set` on existing profile**: The post showed `Error EEXIST: an erasure code profile with name 'existing-profile' already exists` when attempting to overwrite an existing profile. In Ceph's OSDMonitor implementation, the actual error returned when trying to `set` a profile that already exists with different parameters (without the `--force` flag) is `EPERM` with the message "will not override erasure code profile existing-profile". Fixed the error output to match the actual Ceph behavior.

## Review Notes
- The `rados cppool` command used in the migration strategy section has been deprecated in newer Ceph releases (since Luminous). The post partially mitigates this by mentioning "or application-level copy" as an alternative, but users on modern Ceph versions should prefer `rados export`/`rados import` or application-level migration tools (e.g., `rbd migration` for RBD workloads).
- The post does not mention the `--force` flag for `ceph osd erasure-code-profile set`, which allows overwriting an existing profile as long as no pool references it. This is a valid alternative to the delete-and-recreate workflow described. Not a technical error, but worth noting for completeness.
- All other CLI commands, pool-level settings, Rook CRD fields, and technical explanations are accurate.
