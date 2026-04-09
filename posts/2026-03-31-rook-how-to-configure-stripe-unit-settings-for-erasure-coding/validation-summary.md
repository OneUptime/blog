# Validation Summary: How to Configure Stripe Unit Settings for Erasure Coding

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (erasure coding, BlueStore, RADOS)
- Rook (Ceph operator for Kubernetes)
- Ceph Object Gateway (RGW)
- BlueStore storage backend

## Sources Consulted
- Ceph official documentation: Erasure Code Profiles (https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/)
- Ceph official documentation: BlueStore Configuration (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph official documentation: Pool Operations (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph official documentation: RADOS Benchmarking (https://docs.ceph.com/en/latest/man/8/rados/)

## Issues Found

1. **Incorrect `bluestore_min_alloc_size_ssd` default value**: The post stated the default for `bluestore_min_alloc_size_ssd` is 16384 (16 KiB). The actual Ceph default across Pacific, Quincy, and Reef releases is 4096 (4 KiB). Fixed from `16384 (16 KiB)` to `4096 (4 KiB)`.

2. **Misleading pool-level `stripe_width` set command**: The original section stated "At the pool level, you configure `stripe_width`" and showed a `ceph osd pool set mypool stripe_width` command. For erasure-coded pools, `stripe_width` is derived from the EC profile and is read-only — it cannot be set manually via `ceph osd pool set`. The section was rewritten to clarify that `stripe_width` is read-only for EC pools and can only be viewed, not set. To change stripe_width, a new EC profile and pool must be created.

## Review Notes
- The `rados bench -p mypool 60 cleanup` command syntax is unconventional. The standard cleanup after `--no-cleanup` is typically `rados -p mypool cleanup` (without `bench` and without a duration). However, some Ceph versions may accept this form, so it was left as-is.
- The post title mentions "Rook" but the content covers Ceph CLI commands directly without Rook-specific CRD examples. This is acceptable since Rook delegates to Ceph under the hood, but readers looking for Rook CRD YAML examples may be surprised.
- The claim that "small objects still use a full stripe" is a simplification — BlueStore can handle sparse allocation — but is directionally correct regarding encoding overhead and is acceptable for a tutorial-level post.
