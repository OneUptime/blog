# Validation Summary: How to Set Up Ceph for Cold Storage Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Erasure coding (EC 4+2, 6+2, 8+3 profiles)
- CephBlockPool CRD (Rook custom resource)
- RADOS Gateway (RGW) with S3-compatible API
- radosgw-admin CLI
- BlueStore (Ceph OSD backend)
- boto3 (Python AWS SDK for S3-compatible access)
- kubectl

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph erasure coding documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph RGW storage classes and placement targets: https://docs.ceph.com/en/latest/radosgw/placement/
- Ceph PG calculator and placement group documentation: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph OSD configuration reference (osd_memory_target, osd_op_num_threads_per_shard): https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph BlueStore configuration (compression_mode, bulk flag): https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- boto3 S3 upload_file documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/upload_file.html

## Issues Found

### 1. Incorrect pool name in radosgw-admin data-pool reference
- **What was wrong:** The `radosgw-admin zone placement add` command referenced `--data-pool rook-ceph.cold-storage-pool.data`, but the CephBlockPool resource creates a Ceph pool named `cold-storage-pool` (matching metadata.name). The `rook-ceph.<name>.data` naming convention is used by CephObjectStore, not CephBlockPool.
- **What was changed:** Changed `--data-pool` to `cold-storage-pool` to match the actual pool name created by the CephBlockPool resource.

### 2. Non-existent index pool and unnecessary separate placement target
- **What was wrong:** The command referenced `--index-pool rook-ceph.cold.index`, a pool that is never created in the post. It also created a new placement target `cold-archive` that would require this missing index pool. The command as written would fail.
- **What was changed:** Changed the command to add the GLACIER storage class to the existing `default-placement` target (which already has index pools configured), and removed the `--index-pool` parameter. This is the standard approach documented by Ceph for adding storage classes.

### 3. Incorrect erasure coding profile in summary
- **What was wrong:** The summary section referenced "erasure coding (6+2 or 8+2)" but the erasure coding efficiency table in the post lists EC 8+3 (not 8+2). EC 8+3 gives 73% efficiency (matching the "70-75%" claim in the summary), while EC 8+2 would give 80% efficiency.
- **What was changed:** Changed "8+2" to "8+3" in the summary to match the table.

### 4. Incorrect PG formula terminology for EC pools
- **What was wrong:** The PG count calculation comment used "replica_count" as the divisor, which is terminology for replicated pools. For erasure-coded pools, the divisor is the total number of chunks (k+m), commonly referred to as "pool_size" in Ceph documentation.
- **What was changed:** Changed comment from "replica_count" to "pool_size" and added clarification that for EC 6+2, pool_size is k+m = 8.

## Review Notes
- The `bulk: "true"` parameter is set in both the CephBlockPool YAML and again via `ceph osd pool set cold-storage-pool bulk true` in the tuning section. This is redundant but not harmful.
- In modern Ceph (Mimic/13.x+), setting `pgp_num` separately after `pg_num` is no longer necessary as `pgp_num` is automatically adjusted. The manual `pgp_num` command is not wrong but is outdated practice.
- The `ceph config set osd osd_op_num_threads_per_shard 2` command applies to ALL OSDs globally. In a mixed cluster with hot and cold nodes, you may want to target only cold OSDs using device class or specific OSD IDs instead.
- The post recommends 2 GB RAM per OSD minimum, which aligns with Ceph's documentation for `osd_memory_target`. This is appropriate for cold storage where caching is less important.
- The pg_autoscaler module (enabled by default in Ceph Pacific+) handles PG count automatically, making manual PG configuration less common in modern deployments. The manual approach shown is still valid.
