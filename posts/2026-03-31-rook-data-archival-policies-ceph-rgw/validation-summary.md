# Validation Summary: How to Set Up Data Archival Policies with Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph RGW (RADOS Gateway)
- S3-compatible lifecycle rules
- S3 Object Lock (COMPLIANCE mode)
- Erasure-coded RADOS pools
- CephBlockPool CRD
- `radosgw-admin` CLI
- AWS CLI (`s3api`)

## Sources Consulted
- Ceph official docs: Pool Placement and Storage Classes — https://docs.ceph.com/en/latest/radosgw/placement/
- Rook official docs: CephBlockPool CRD — https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph official docs: Cloud Restore — https://docs.ceph.com/en/latest/radosgw/cloud-restore/
- Ceph official docs: radosgw-admin man page — https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph official docs: Autoscaling Placement Groups (bulk flag) — https://docs.ceph.com/en/reef/rados/operations/placement-groups/

## Issues Found

1. **Incorrect pool names in `radosgw-admin` command**: The command referenced `rook-ceph.archive-pool.data` and `rook-ceph.archive-pool.index`, but a Rook `CephBlockPool` with `metadata.name: archive-pool` creates a RADOS pool named simply `archive-pool` (no prefix or suffix). Fixed `--data-pool` to `archive-pool`.

2. **Wrong placement target for lifecycle transitions**: The command used `--placement-id archive` to create a separate placement target, but S3 lifecycle transitions between storage classes only work within the same placement target. Since buckets are created in `default-placement` by default, the GLACIER storage class must be added there. Fixed `--placement-id` to `default-placement`.

3. **`--index-pool` incorrectly combined with `--storage-class`**: In Ceph RGW, `--index-pool` is a placement-level setting shared across all storage classes, not a per-storage-class setting. When adding a storage class with `--storage-class GLACIER`, only `--data-pool` should be specified. Removed the `--index-pool` line from the command.

4. **Missing `period update --commit`**: After modifying zone placement configuration with `radosgw-admin`, changes do not take effect until `radosgw-admin period update --commit` is run (multisite) or RGW daemons are restarted (single-site). Added the `period update --commit` step.

5. **Misleading `restore-object` section**: The blog set up a local pool-based GLACIER storage class, but `restore-object` only applies to objects moved via the cloud transition feature (to a remote S3 endpoint). Objects in local pool-based storage classes are directly accessible without restoration. Updated the section intro to clarify this applies to cloud-transitioned objects.

6. **Undocumented `bulk` parameter in CephBlockPool**: The `bulk: "true"` parameter under `spec.parameters` is not documented in the Rook CephBlockPool CRD specification. While Ceph supports a pool-level `bulk` flag, it is not a recognized Rook CRD parameter and may not be passed through reliably. Removed this parameter.

## Review Notes
- The lifecycle rules reference a `STANDARD_IA` storage class that is not configured in the guide. For the `STANDARD_IA` transition to work, it would need to be added as an additional storage class in the default placement target with its own data pool, similar to the GLACIER configuration shown.
- The `CephBlockPool` CRD is primarily designed for RBD block storage pools. While it does create a valid RADOS pool that can be referenced by RGW, using `CephObjectStore` or manual pool creation via `ceph osd pool create` may be more conventional for RGW-specific pools.
- The guide uses `--rgw-zone default` which assumes a single-zone setup. In multisite deployments, the zone name would differ.
- Object Lock and lifecycle rules are presented as complementary features, which is correct — Object Lock prevents deletion while lifecycle rules handle tiering. However, lifecycle expiration rules will not delete objects that are under Object Lock retention.
