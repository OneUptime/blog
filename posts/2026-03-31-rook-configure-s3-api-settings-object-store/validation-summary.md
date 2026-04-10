# Validation Summary: How to Configure S3 API Settings in Rook Object Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway)
- S3-compatible object storage API
- Kubernetes CRDs (CephObjectStore)
- OpenStack Keystone (authentication)

## Sources Consulted
- Rook CephObjectStore CRD Documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook CRD types.go source (S3Spec struct): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook example object.yaml: https://github.com/rook/rook/blob/master/deploy/examples/object.yaml
- Ceph RGW Config Reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph RGW config options source (rgw.yaml.in): https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- Ceph Bucket Policies Documentation: https://docs.ceph.com/en/quincy/radosgw/bucketpolicy/
- Ceph MonCommands.h (config command syntax): https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h

## Issues Found

### 1. Non-existent `rgw_enable_bucket_policy` config parameter (Critical)
**What was wrong:** The "Enabling Bucket Policies" section claimed bucket policies are "disabled by default in some Ceph versions" and provided a `ceph config set client.rgw rgw_enable_bucket_policy true` command. The parameter `rgw_enable_bucket_policy` does not exist in Ceph. Bucket policies are a built-in feature of Ceph RGW's S3 implementation and are always enabled — there is no toggle.
**What was changed:** Rewrote the section to explain that bucket policies are enabled by default and showed how to apply a bucket policy using the `aws s3api put-bucket-policy` command instead.

### 2. Non-existent `protocols.s3.objectLockEnabled` CRD field (Critical)
**What was wrong:** The "Enabling Object Lock (WORM)" section showed a YAML snippet with `protocols.s3.objectLockEnabled: true`. This field does not exist in the Rook CephObjectStore CRD. The `S3Spec` struct only has two fields: `enabled` and `authUseKeystone`. The YAML would be rejected by the Kubernetes API server.
**What was changed:** Rewrote the section to show the correct approach: enabling Object Lock per-bucket at creation time using the `aws s3api create-bucket --object-lock-enabled-for-bucket` command.

### 3. Multipart upload example values are defaults (Minor)
**What was wrong:** The multipart upload tuning examples used `rgw_multipart_min_part_size 5242880` (5 MiB) and `rgw_multipart_part_upload_limit 10000`, which are the Ceph defaults. Setting a parameter to its default value is a no-op and doesn't demonstrate tuning.
**What was changed:** Updated to use non-default values (16 MiB min part size, 5000 part limit) and noted the defaults in the description text, so readers can see they are actually changing something.

## Review Notes
- The `protocols.s3.enabled` field is marked as deprecated in the Rook source code in favor of `protocols.enableAPIs`. The blog uses the older field, which still works but may be removed in a future Rook release.
- The `ceph config set/get client.rgw` commands target the generic RGW section. For deployments with multiple object stores, more specific daemon names (e.g., `client.rgw.my-store.a`) may be needed.
- The `externalRgwEndpoints` YAML snippet is shown in the context of configuring virtual-hosted style access, but `externalRgwEndpoints` is actually for pointing Rook to external (non-Rook-managed) RGW instances. The DNS configuration command that follows it is correct, but the YAML context is slightly misleading.
