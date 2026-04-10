# Validation Summary: How to Configure Ceph for GDPR-Compliant Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- HashiCorp Vault (KMS integration)
- Kubernetes (node affinity, labels, pod scheduling)
- AWS CLI (S3 API for RGW)
- LUKS/dm-crypt (OSD encryption)

## Sources Consulted
- Rook CephCluster CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook KMS documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/
- Rook CephObjectStore CRD documentation — https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph RGW Config Reference — https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph Pool, PG and CRUSH Config Reference — https://docs.ceph.com/en/latest/rados/configuration/pool-pg-config-ref/
- Ceph radosgw-admin man page — https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph RGW Encryption documentation — https://docs.ceph.com/en/latest/radosgw/encryption/
- Ceph source code (rgw.yaml.in) — https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- AWS CLI put-bucket-encryption reference — https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-encryption.html
- AWS CLI put-bucket-lifecycle-configuration reference — https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html

## Issues Found
1. **Section 2 — Incorrect command for multisite replication control**: The command `ceph config set global osd_pool_default_size 3` was used under the heading "Disable Ceph multisite replication to non-EU zones." This command only controls the default number of data replicas within a single cluster and has nothing to do with multisite zone replication. Replaced with `radosgw-admin zone list` and `radosgw-admin zonegroup get` commands that actually verify multisite zone configuration. Also updated the section description from "Disable" to "Verify" since the commands are verification steps, not enforcement.

## Review Notes
- The erasure script in Section 3 references two different bucket naming patterns: `s3://user-data-eu/${USER_ID}/` (a prefix in a shared bucket) and `s3://user-data-eu-${USER_ID}` (a per-user bucket). This could be intentional (covering both patterns) but may confuse readers.
- The `radosgw-admin user rm --purge-data` in Section 3 already removes all user data including buckets, making the preceding `aws s3 rm` and `aws s3 rb` commands partially redundant. However, the belt-and-suspenders approach is reasonable for GDPR compliance.
- Enabling `rgw_ops_log_rados` (Section 4) without a log cleanup strategy will cause unbounded log growth. The Ceph source code explicitly warns that admins must use `radosgw-admin log rm` to manage these entries.
- The `encryptedDevice` per-device config (Section 1) is valid but represents an older Rook configuration style. Newer Rook versions also support cluster-level encryption via `spec.storage.config.encryptedDevice`.
- Section 5 describes the `rgw_frontend_defaults` command as "Redirect HTTP to HTTPS" but this command configures SSL certificate defaults for the beast frontend — it does not actually redirect HTTP traffic to HTTPS.
