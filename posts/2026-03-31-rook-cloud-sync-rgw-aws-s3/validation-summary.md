# Validation Summary: How to Configure Cloud Sync Module for RGW to AWS S3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph RGW Cloud Sync Module
- Ceph Multisite (realms, zonegroups, zones)
- radosgw-admin CLI
- AWS S3
- Rook (Kubernetes operator for Ceph)
- Kubernetes ConfigMap

## Sources Consulted
- Ceph Cloud Sync Module documentation: https://docs.ceph.com/en/latest/radosgw/cloud-sync-module/
- Ceph Cloud Transition documentation: https://docs.ceph.com/en/latest/radosgw/cloud-transition/
- Ceph Sync Modules documentation: https://docs.ceph.com/en/latest/radosgw/sync-modules/
- Ceph Multi-Site documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph Cloud Sync Module source code (rgw_sync_module_aws.cc): https://github.com/ceph/ceph/blob/main/src/rgw/driver/rados/rgw_sync_module_aws.cc

## Issues Found

### 1. Invalid `connection.id` tier-config parameter (Step 2)
**What was wrong:** The `--tier-config` included `connection.id=aws-main` which is not a valid Cloud Sync Module parameter. The `connection.*` namespace supports `endpoint`, `access_key`, `secret`, `host_style`, `region`, and `storage_class`, but not `id`.
**What was changed:** Removed `connection.id=aws-main,\` from the `radosgw-admin zone modify` tier-config line.
**Why:** This parameter would cause an unrecognized config key or be silently ignored, confusing readers who try to replicate the setup.

### 2. Cloud Transition parameters used in Cloud Sync context (Step 3)
**What was wrong:** The second command in Step 3 used `retain_head_object=false` and `target_storage_class=STANDARD_IA`. Both are parameters for the Cloud Transition feature (`--tier-type=cloud-s3`), not the Cloud Sync Module (`--tier-type=cloud`). The comment also said "Restrict sync to specific buckets" which did not match what the command does.
**What was changed:** Replaced the command with a valid Cloud Sync Module command using `connection.storage_class=STANDARD_IA` to set the S3 storage class for synced objects. Updated the comment to accurately describe the command.
**Why:** Using Cloud Transition parameters on a Cloud Sync zone would fail or be ignored, and would confuse readers about the distinction between these two separate Ceph features.

### 3. Invalid `connections[].target_storage_class` parameter (Step 6)
**What was wrong:** The command used `connections[].target_storage_class=GLACIER` which is not a valid Cloud Sync Module parameter. `target_storage_class` belongs to Cloud Transition. The correct Cloud Sync Module parameter is `storage_class` (not `target_storage_class`). Additionally, the `connections[]` array syntax was being used unnecessarily when only one connection is configured.
**What was changed:** Simplified to `connection.storage_class=GLACIER` using the single-connection tier-config syntax. Updated the comment accordingly.
**Why:** The original command would not correctly set the S3 storage class for synced objects.

## Review Notes
- The post correctly uses `--tier-type=cloud` for the Cloud Sync Module. Readers should be aware that Ceph has a separate feature called Cloud Transition (`--tier-type=cloud-s3`) that uses lifecycle policies for object transition rather than zone-based multisite sync. These are distinct features with different configuration parameters.
- The `connection.region` parameter is used in Step 2. While it exists in the source code and works, it is not prominently documented in the official Cloud Sync Module docs. It functions correctly for AWS S3.
- The multisite setup sequence (realm, zonegroup, zone) is correct but the zonegroup create command omits `--endpoints` which is recommended in production setups. For a tutorial this is acceptable.
- The `sleep 60` in the end-to-end test is a rough estimate; actual sync time depends on the sync interval and data size. Readers should use `radosgw-admin sync status` to verify sync completion rather than relying on a fixed sleep.
- The overview states sync "does not impact write latency on the primary zone" which is accurate since Cloud Sync Module replication is asynchronous via the multisite datalog framework.
