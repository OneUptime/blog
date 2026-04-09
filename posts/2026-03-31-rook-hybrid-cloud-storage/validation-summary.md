# Validation Summary: How to Set Up Rook-Ceph for Hybrid Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Ceph cloud-s3 tier type (cloud tiering)
- Ceph cache tiering (deprecated)
- AWS S3 / AWS CLI
- Kubernetes (ConfigMaps, Services)
- Python boto3 SDK

## Sources Consulted
- Ceph RGW cloud transition documentation: https://docs.ceph.com/en/latest/radosgw/cloud-transition/
- Ceph RGW multisite documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph cache tiering documentation: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- AWS S3 lifecycle configuration API: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLifecycleConfiguration.html
- AWS S3 replication API: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketReplication.html
- radosgw-admin CLI reference: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found

### 1. Incorrect RGW service endpoint (all occurrences)
- **What was wrong:** The post used `rook-ceph-rgw.rook-ceph.svc.cluster.local` as the RGW endpoint. Rook always names the RGW service as `rook-ceph-rgw-<store-name>`, so this endpoint would not resolve.
- **What was changed:** Replaced all occurrences with `rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local` (assuming an object store named `my-store`).
- **Why:** Rook creates the RGW Kubernetes service with the CephObjectStore resource name appended. Without the store name suffix, the DNS name does not exist in the cluster.

### 2. Missing `Filter` field in lifecycle rule
- **What was wrong:** The S3 lifecycle configuration JSON in the cloud tiering section omitted the `Filter` field, which is required by the S3 API specification.
- **What was changed:** Added `"Filter": {}` to the lifecycle rule.
- **Why:** The S3 PutBucketLifecycleConfiguration API (v2) requires a `Filter` field in each rule. Omitting it can cause validation errors.

### 3. Invalid cross-region replication approach
- **What was wrong:** The section used a ConfigMap with `rgw_enable_sync_module = true`, which is not a valid Ceph configuration option. It also used `aws s3api put-bucket-replication` with AWS IAM role ARNs, which is an AWS-specific API that Ceph RGW does not support in this form. Ceph multisite replication uses zone-level sync configuration, not S3-style bucket replication rules.
- **What was changed:** Replaced the entire section with the correct Ceph approach: configuring a `cloud-s3` tier storage class with `retain_head_object=true` (to keep the local copy for DR) via `radosgw-admin` commands, and applying a lifecycle rule to transition objects to the cloud backup tier.
- **Why:** The original commands would fail — `rgw_enable_sync_module` does not exist, and `put-bucket-replication` with IAM ARNs is not implemented in Ceph RGW. The cloud-s3 tier with `retain_head_object` is the correct Ceph mechanism for replicating data to cloud S3 while retaining local copies.

### 4. Non-existent cache tier configuration options
- **What was wrong:** The post showed a ConfigMap with global Ceph config options `osd_tier_default_cache_mode`, `osd_tier_cache_target_full_ratio`, and `osd_tier_cache_target_dirty_ratio`. None of these are valid Ceph configuration options. Ceph cache tiering is configured per-pool using `ceph osd tier` and `ceph osd pool set` commands, not through global config.
- **What was changed:** Replaced the ConfigMap with correct per-pool `ceph osd tier` and `ceph osd pool set` commands. Added a deprecation notice since Ceph cache tiering has been deprecated since Luminous.
- **Why:** The original config options do not exist in Ceph. Cache tiering is a pool-level feature that must be configured with CLI commands against specific pools.

## Review Notes
- Ceph cache tiering has been deprecated since Luminous (12.x) and is strongly discouraged by the Ceph project. The post now includes a deprecation notice recommending RGW cloud tiering as the preferred alternative. Future readers should be aware that cache tiering may be removed in a future Ceph release.
- The `radosgw-admin` cloud-s3 tier configuration syntax may vary slightly between Ceph versions (Quincy, Reef, Squid). Readers should verify the exact flags against their deployed Ceph version.
- The post assumes a single-site RGW deployment with default zone/zonegroup. Multi-site deployments would require additional realm and zone configuration.
- The boto3 Python example is correct and functional but uses placeholder credentials. In production, credentials should be managed via Kubernetes secrets or an IAM-compatible solution.
