# Validation Summary: How to Configure min_size for Erasure Coded Pool Recovery in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (erasure coded pools, OSD management, CRUSH maps)
- Rook (CephBlockPool CRD on Kubernetes)
- Kubernetes (custom resource definitions)

## Sources Consulted
- Ceph official documentation on erasure coded pools and pool parameters (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Ceph official documentation on pool settings including size and min_size (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Rook documentation on CephBlockPool CRD and erasure coded pool configuration (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph CLI reference for `ceph osd pool get/set` commands (https://docs.ceph.com/en/latest/man/8/ceph/)

## Issues Found
No technical issues found.

## Review Notes
- The `ceph health detail` example output is simplified compared to actual Ceph output (which includes more structured warning categories in newer versions like Pacific+), but this is acceptable for illustrative purposes and clearly marked as example text.
- Ceph will actually refuse to set `min_size` below `k` for EC pools at the OSD level, so the warning in the post is good practice but the scenario is also guarded by Ceph itself.
- The Rook CephBlockPool YAML uses `spec.parameters.min_size` which is a passthrough to Ceph pool parameters. This works but users should be aware that Rook may override pool parameters on reconciliation depending on the Rook operator version and configuration.
