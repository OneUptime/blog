# Validation Summary: How to Use Erasure Coding with RGW in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RADOS Gateway / RGW)
- Rook (Ceph Kubernetes operator)
- Erasure Coding (jerasure plugin, reed_sol_van technique)
- Kubernetes (CephObjectStore CRD)
- AWS CLI (S3-compatible object storage)

## Sources Consulted
- Ceph official documentation on erasure code profiles and RGW pool architecture (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Ceph documentation on RGW placement targets and data layout (https://docs.ceph.com/en/latest/radosgw/placement/)
- Ceph documentation on `rgw_max_chunk_size` configuration (https://docs.ceph.com/en/latest/radosgw/config-ref/)
- Rook documentation on CephObjectStore CRD (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)
- AWS CLI S3 configuration reference for multipart settings (https://docs.aws.amazon.com/cli/latest/topic/s3-config.html)

## Issues Found

### 1. Incorrect description of `rgw_max_chunk_size` behavior (line 79)
- **What was wrong:** The post claimed that objects smaller than `rgw_max_chunk_size` are "stored inline in the bucket index." This is incorrect — the bucket index (`.rgw.buckets.index`) stores only metadata (object names, sizes, etags, timestamps), never actual object data.
- **What was changed:** Updated the description to correctly state that small objects fit entirely in the head object, which is stored in a replicated pool rather than the EC data pool. Larger objects are split: the head stays in the replicated pool while tail chunks go to the EC data pool.
- **Why:** This is a fundamental architectural detail of RGW. Head objects must live in a replicated pool because EC pools do not support the OMAP operations that RGW uses for per-object metadata.

### 2. Invalid AWS CLI flag `--multipart-chunksize` (lines 94-96)
- **What was wrong:** The `aws s3 cp` command used `--multipart-chunksize 67108864`, which is not a valid command-line flag for `aws s3 cp`. Passing this flag would result in an "Unknown options" error.
- **What was changed:** Replaced the single command with two steps: first `aws configure set default.s3.multipart_chunksize 64MB` to set the config, then the `aws s3 cp` command with only the `--endpoint-url` flag.
- **Why:** The AWS CLI S3 transfer configuration parameters (multipart_chunksize, multipart_threshold, etc.) are set through the AWS CLI config file or `aws configure set`, not through per-command flags.

## Review Notes
- The EC profile parameters (k=4, m=2, jerasure/reed_sol_van, crush_failure_domain=host) are correct and represent a common production configuration.
- The overhead ratio calculation (1.5x for k=4,m=2) is correct: (k+m)/k = 6/4 = 1.5.
- The Rook CephObjectStore CRD YAML is correct per current Rook documentation, with proper separation of replicated metadataPool and erasureCoded dataPool.
- The stripe width calculations in the multipart alignment table are correct (k × stripe_unit = logical stripe width).
- The claim that `allow_ec_overwrites` is not needed for RGW data pools is correct — RGW object data is write-once, so EC works natively.
- The pool architecture listing is accurate for standard RGW deployments, though actual pool names will be prefixed with the zone name in multisite configurations.
- The `ceph osd pool create` command uses explicit PG counts (128); modern Ceph has pg_autoscaler enabled by default, but specifying PG counts is still valid.
