# Validation Summary: How to Set Multisite Sync Settings in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph multisite replication (realm, zonegroup, zone hierarchy)
- radosgw-admin CLI
- ceph config CLI
- cephadm orchestrator
- Rook Ceph Operator (CephObjectRealm, CephObjectZoneGroup, CephObjectZone CRDs)

## Sources Consulted
- Ceph official documentation: Multisite configuration (https://docs.ceph.com/en/latest/radosgw/multisite/)
- Ceph official documentation: radosgw-admin CLI reference (https://docs.ceph.com/en/latest/radosgw/admin/)
- Rook documentation: CephObjectZone, CephObjectZoneGroup, CephObjectRealm CRDs (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/)

## Issues Found
1. **Missing master zone credential update in Step 3**: After creating the system user for sync, the post omitted the critical step of updating the master zone with the system user's access key and secret via `radosgw-admin zone modify` followed by `radosgw-admin period update --commit`. Without this, sync authentication between zones would fail. Added the missing commands.

2. **Misleading comment in Step 5**: The comment "must be done from the master zone" was misleading because the command shown uses `--url` to route the period commit through the master zone from the secondary. Clarified the comment to "Commit the period through the master zone" to accurately describe the behavior.

## Review Notes
- The realm/zonegroup/zone hierarchy explanation is accurate and well-structured.
- All `radosgw-admin` command flags and syntax are correct.
- The `ceph config set` syntax and `ceph.conf` format are both correct.
- The Rook CRD manifests use the correct apiVersion (`ceph.rook.io/v1`) and spec fields for CephObjectRealm, CephObjectZoneGroup, and CephObjectZone.
- The sync monitoring commands (`radosgw-admin sync status`, `data sync status`, `metadata sync status`) are correct.
- The post describes an active-active setup but does not cover sync policy configuration (e.g., per-bucket sync enable/disable), which is fine for an introductory tutorial.
