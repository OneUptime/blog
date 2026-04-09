# Validation Summary: How to Configure Stripe Unit Settings for Erasure Coding in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (erasure coding, OSD pools, erasure code profiles)
- Rook (CephBlockPool CRD)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Kubernetes
- Jerasure erasure coding plugin (reed_sol_van technique)

## Sources Consulted
- Ceph official documentation: Erasure Code Profiles (https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/)
- Ceph official documentation: Erasure Code Jerasure Plugin (https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/)
- Ceph official documentation: Pool Operations (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph RGW configuration reference: rgw_obj_stripe_size
- Rook documentation: CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)

## Issues Found
- **Rook CephBlockPool YAML incorrectly referenced a custom erasure code profile via `parameters.erasure_code_profile`**: The Rook operator auto-generates erasure code profiles from the `erasureCoded` spec (`dataChunks`, `codingChunks`). The CRD `parameters` field is for pool-level Ceph parameters (e.g., `compression_mode`, `target_size_ratio`), not for specifying an erasure code profile. Removed the `parameters.erasure_code_profile` field from the YAML and added a note explaining that custom `stripe_unit` requires creating the profile and pool directly via the Ceph CLI in the Rook toolbox.

## Review Notes
- The `ceph osd pool create ec-large-data 64 64 erasure ec-large-stripe` command uses the legacy syntax with explicit pg_num/pgp_num. In Ceph Pacific+ with pg_autoscaler enabled, these can be omitted. The syntax is still valid but may be considered legacy.
- The `rgw_obj_stripe_size` option controls the RADOS object stripe size for RGW, not specifically the multipart upload chunk size. The post's description is slightly simplified but the alignment advice is sound.
- The default `stripe_unit` of 4096 bytes is derived from the monitor config option `osd_pool_erasure_code_stripe_unit`, not hardcoded in the profile. The stated default value is correct for standard deployments.
