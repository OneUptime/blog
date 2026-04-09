# Validation Summary: How to Set Pool Placements and Storage Classes for Rook Object Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph Kubernetes operator)
- `radosgw-admin` CLI
- Ceph RADOS pools
- S3 API storage classes
- AWS CLI (`aws s3`, `aws s3api`)
- Kubernetes CRDs (CephObjectZone, ObjectBucketClaim)

## Sources Consulted
- Ceph official placement documentation: https://docs.ceph.com/en/latest/radosgw/placement/
- Ceph radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Rook CephObjectZone CRD documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-zone-crd/
- Rook CephObjectZone Go types: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook ObjectBucketClaim documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- Cross-referenced with validated sister post: posts/2026-03-31-rook-pool-placement-storage-classes-rgw/

## Issues Found

### 1. CephObjectZone YAML used non-existent `storageClass` field
**What was wrong:** The YAML snippet used a top-level `storageClass` field with `pools` sub-arrays containing `name` entries. This field does not exist in the CephObjectZone CRD. The valid spec fields are `zoneGroup`, `metadataPool`, `dataPool`, `sharedPools`, `customEndpoints`, and `preservePoolsOnDelete`.
**What was changed:** Replaced with the correct `sharedPools.poolPlacements` structure, which defines a placement with a `dataPoolName` and nested `storageClasses` entries that each map a storage class name to a data pool. Added a note that referenced pools must exist as separate CephBlockPool CRDs.

### 2. `radosgw-admin placement list` is not a standard subcommand
**What was wrong:** The blog used `radosgw-admin placement list` as a standalone command. The documented and structured form is `radosgw-admin zonegroup placement list`, consistent with the hierarchical `zonegroup placement` / `zone placement` command structure in radosgw-admin.
**What was changed:** Replaced with `radosgw-admin zonegroup placement list`.

### 3. ObjectBucketClaim `placementTarget` is not a supported `additionalConfig` field
**What was wrong:** The OBC YAML included `placementTarget: ssd-tier` in `additionalConfig`. The Rook bucket provisioner does not support a `placementTarget` field in `additionalConfig`. The documented fields are `maxSize`, `maxObjects`, `objectLockEnabled`, `defaultRetentionMode`, and `defaultRetentionDays`.
**What was changed:** Replaced the unsupported `placementTarget` field with the documented `maxSize` and `maxObjects` fields. Added an example showing how to create a bucket in a specific placement target using the S3 API with `LocationConstraint`, which is the correct mechanism for selecting placement targets at bucket creation time.

## Review Notes
- The `radosgw-admin zonegroup placement add` and `zone placement add` commands in the toolbox section are correct.
- The `radosgw-admin period update --commit` command is correct for multisite setups. For single-site setups without multisite configured, this command may produce a warning but is harmless.
- The `aws s3 cp --storage-class STANDARD_IA` command is correct for uploading objects with a specific storage class.
- The `rados -p <pool> ls | wc -l` verification commands are correct for checking object distribution across pools.
- The `sharedPools.poolPlacements` approach requires the referenced pools (e.g., `my-store.rgw.buckets.ia-data`, `my-store.rgw.buckets.archive-data`) to exist as separate CephBlockPool CRDs before applying the CephObjectZone configuration.
