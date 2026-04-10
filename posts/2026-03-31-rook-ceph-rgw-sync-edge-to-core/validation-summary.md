# Validation Summary: How to Set Up Ceph RGW Sync for Edge-to-Core Data Transfer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph multi-site replication
- radosgw-admin CLI
- Rook Ceph Operator (CephObjectStore CRD)
- Prometheus (monitoring metrics)

## Sources Consulted
- Ceph official documentation: Multi-Site configuration (https://docs.ceph.com/en/latest/radosgw/multisite/)
- Ceph official documentation: radosgw-admin CLI reference (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- Rook documentation: CephObjectStore CRD for multi-site (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/)
- Ceph documentation: RGW Sync Policy (https://docs.ceph.com/en/latest/radosgw/multisite-sync-policy/)

## Issues Found

1. **Missing `zone modify` step to attach system user keys (Step 1)**: After creating the system user with `radosgw-admin user create`, the post did not include the required `radosgw-admin zone modify` command to store the system user's access and secret keys in the master zone configuration. Without this step, the secondary zone cannot authenticate with the master zone during sync. Added the `zone modify` command with placeholder keys between the user creation and period commit steps.

2. **Incorrect metadata sync status in expected output (Verifying Sync Status)**: The expected output showed `metadata sync no sync (zone is master)` for edge-zone. However, edge-zone is the secondary zone, not the master zone (core-zone is the master). On a secondary zone, metadata sync should show that it is actively syncing from the master. Corrected the output to show `metadata sync syncing` with full sync and incremental sync shard progress.

3. **Incorrect sync status output format (Verifying Sync Status)**: The expected output used `docs behind: 0` which is not the actual output format of `radosgw-admin sync status`. The real output shows shard-based sync progress with `full sync: X/Y shards` and `incremental sync: X/Y shards` lines. Corrected the output format to match the actual CLI output.

## Review Notes
- The Prometheus metric `ceph_rgw_sync_fullsync_index_count` should be verified against the actual Ceph version being deployed, as metric names can vary between releases.
- The selective bucket sync commands (`radosgw-admin bucket sync disable/enable`) may vary in syntax or availability depending on the Ceph version. Newer releases (Pacific and later) recommend using the sync policy framework (`radosgw-admin sync group` and `sync group pipe` commands) for more granular control.
- The tutorial mixes manual CLI-based multi-site topology setup (Steps 1-2) with Rook-managed RGW deployment (Step 3). This is a valid approach but assumes the Ceph multi-site topology is configured outside of Rook. Rook also provides `CephObjectRealm`, `CephObjectZoneGroup`, and `CephObjectZone` CRDs for fully declarative multi-site setup.
- The architecture diagram labels `[realm: global]` under the edge site and `[zonegroup: main]` under the core datacenter, which could be misleading since both the realm and zonegroup span all sites.
