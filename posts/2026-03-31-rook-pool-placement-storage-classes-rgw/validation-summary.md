# Validation Summary: How to Set Up Pool Placement and Storage Classes for RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph Kubernetes operator)
- `radosgw-admin` CLI
- Ceph RADOS pools (replicated and erasure-coded)
- S3 API storage classes
- AWS CLI (`aws s3cp`, `aws s3api`)
- Python boto3 SDK
- Kubernetes CRDs (CephObjectZone)

## Sources Consulted
- Ceph official placement documentation: https://docs.ceph.com/en/latest/radosgw/placement/
- Ceph radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Rook CephObjectZone CRD source (Go types): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook CephObjectZone documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-zone-crd/

## Issues Found

### 1. `radosgw-admin zone placement add` mixed placement-level and storage-class-level flags
**What was wrong:** The original command combined `--storage-class=COLD` with `--index-pool` and `--data-extra-pool` in a single invocation. According to official Ceph docs, `--index-pool` and `--data-extra-pool` are placement-level flags (used without `--storage-class`), while adding a storage class only accepts `--data-pool`.
**What was changed:** Split into two separate `zone placement add` commands — one for the base placement target (with `--data-pool`, `--index-pool`, `--data-extra-pool`) and one for the COLD storage class (with `--storage-class=COLD` and `--data-pool` only).

### 2. `radosgw-admin pool init` does not exist
**What was wrong:** The blog used `radosgw-admin pool init --placement-id=cold-storage` to "initialize pools for RGW." This subcommand does not exist. The valid pool subcommands are `pool add`, `pool rm`, and `pools list`.
**What was changed:** Removed the non-existent command entirely. Pools are created with `ceph osd pool create` and referenced in placement configuration — no separate initialization step is needed.

### 3. Incorrect order of operations
**What was wrong:** The blog created placement targets before creating the underlying RADOS pools. Placement configuration references pool names that should already exist.
**What was changed:** Reordered sections so that RADOS pool creation comes first, followed by zonegroup placement configuration, then zone placement configuration.

### 4. `zonegroup placement modify` used instead of `zonegroup placement add`
**What was wrong:** The blog used `radosgw-admin zonegroup placement modify --storage-class=COLD` to add a storage class. While `modify` exists as a subcommand, the documented approach for adding a storage class to a zonegroup placement is `zonegroup placement add` with `--storage-class`.
**What was changed:** Replaced `zonegroup placement modify` with `zonegroup placement add --storage-class=COLD`.

### 5. Rook CephObjectZone YAML used non-existent `additionalDataPool` field
**What was wrong:** The YAML snippet used `additionalDataPool` with an inline pool spec (`erasureCoded: dataChunks: 4, codingChunks: 2`). This field does not exist in the CephObjectZone CRD. The valid fields are `zoneGroup`, `metadataPool`, `dataPool`, `sharedPools`, `customEndpoints`, and `preservePoolsOnDelete`.
**What was changed:** Replaced with the correct `sharedPools.poolPlacements` structure, which references pre-existing pools by name and supports `storageClasses` entries for routing objects to different pools based on S3 storage class.

## Review Notes
- The S3 CLI commands (`aws s3 cp --storage-class COLD`) and boto3 examples are correct.
- The `radosgw-admin zone get | jq '.placement_pools'` command correctly references the JSON field name.
- The `ceph osd pool create cold-data-pool erasure` minimal syntax is valid, though production deployments would typically specify an explicit erasure-code profile.
- The Rook `sharedPools` approach requires the referenced pools (e.g., `cold-ec-pool`) to exist as separate CephBlockPool CRDs. A note was added to the blog mentioning this requirement.
