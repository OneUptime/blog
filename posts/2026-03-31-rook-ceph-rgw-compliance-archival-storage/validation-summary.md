# Validation Summary: How to Use Ceph RGW for Compliance and Archival Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3 Object Lock (WORM compliance)
- AWS CLI (s3api commands)
- S3 lifecycle policies
- S3 bucket logging

## Sources Consulted
- AWS CLI s3api reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/
- Ceph RGW S3 Object Lock documentation: https://docs.ceph.com/en/latest/radosgw/s3/objectlocking/
- Ceph RGW placement and storage classes: https://docs.ceph.com/en/latest/radosgw/placement/
- Ceph RGW bucket logging documentation: https://docs.ceph.com/en/latest/radosgw/bucket_logging/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found

### 1. Fictitious `radosgw-admin bucket logging enable` command
**What was wrong:** The post used `radosgw-admin bucket logging enable --bucket compliance-archive --target-bucket compliance-logs` to enable access logging. This command does not exist. The `radosgw-admin bucket logging` subcommands are limited to `flush`, `info`, and `list` — all operational tools, not configuration tools. Neither `enable` nor `--target-bucket` are valid.
**What was changed:** Replaced with the correct S3 API approach using `aws s3api put-bucket-logging` with a `--bucket-logging-status` JSON body specifying `TargetBucket` and `TargetPrefix`. Also updated the log listing command to include the target prefix.
**Why:** Bucket logging in Ceph RGW is configured exclusively through the S3 API, per the official Ceph bucket logging documentation.

### 2. Invalid `GLACIER` storage class for Ceph RGW lifecycle rule
**What was wrong:** The lifecycle configuration used `"StorageClass": "GLACIER"`, which is an AWS-specific built-in storage class. Ceph RGW does not have a built-in GLACIER class. The official Ceph documentation explicitly warns against using GLACIER-prefixed names because some S3 clients attempt Glacier-specific API calls (restore operations, tier retrieval) that RGW does not support.
**What was changed:** Replaced `"GLACIER"` with `"COLD"` as an example operator-defined storage class, and added explanatory text noting that Ceph RGW requires custom storage classes to be defined in the zone/zonegroup configuration.
**Why:** Per Ceph placement documentation, storage classes must be operator-defined and mapped to pools. Using `GLACIER` would result in `InvalidStorageClass` errors or client-side failures.

### 3. Misleading versioning section
**What was wrong:** The section "Configuring Versioning for Audit Trails" showed `put-bucket-versioning` as a required step, but when a bucket is created with `--object-lock-enabled-for-bucket`, versioning is automatically enabled. The command was redundant and implied versioning was not yet active.
**What was changed:** Rewrote the section to explain that versioning is automatically enabled with Object Lock, and replaced the `put-bucket-versioning` command with `get-bucket-versioning` to verify the auto-enabled state.
**Why:** Both AWS and Ceph RGW automatically enable versioning when Object Lock is enabled at bucket creation. Presenting it as a manual step is misleading.

## Review Notes
- The `create-bucket` command works without `--create-bucket-configuration` since that parameter is only needed for specifying a `LocationConstraint` (region), not for Object Lock.
- The Object Lock configuration JSON structure, put-object retention flags, and get-object-retention syntax are all correct.
- The `COLD` storage class used in the fix is an example name. In practice, the operator must define the actual storage class name in their Ceph zone/zonegroup configuration and map it to an appropriate erasure-coded pool.
