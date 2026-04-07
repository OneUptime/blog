# Validation Summary: How to Set Up Ceph RGW Multisite with Two Zones

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph Multisite (realm, zone group, zone)
- Rook Ceph Operator (CephObjectStore, CephObjectZone, CephObjectZoneGroup, CephObjectRealm CRDs)
- Kubernetes
- radosgw-admin CLI

## Sources Consulted
- Ceph official documentation: Multisite configuration (https://docs.ceph.com/en/latest/radosgw/multisite/)
- Rook documentation: CephObjectStore multisite (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/)
- radosgw-admin CLI reference (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)

## Issues Found

1. **Primary zone create missing `--endpoints` flag (Step 1)**: The `radosgw-admin zone create` for us-east did not include `--endpoints`. Without this, the secondary zone has no endpoint URL to sync from. Added `--endpoints=http://rgw-us-east.example.com`.

2. **Missing zone modify after sync user creation (Step 2)**: After creating the system user, the primary zone must be updated with the system user's credentials via `radosgw-admin zone modify --access-key=... --secret=...` followed by `period update --commit`. Without this, the primary zone cannot authenticate incoming sync requests from the secondary. Added the missing commands.

3. **Wrong flag `--secret-key` on secondary zone create (Step 4)**: `radosgw-admin zone create` accepts `--secret`, not `--secret-key`. The `--secret-key` flag is specific to `radosgw-admin user create`. Changed to `--secret=sync-secret-key`.

4. **Wrong endpoint on secondary zone create (Step 4)**: The `--endpoints` flag was set to `http://rgw-us-east.example.com` (the primary), but `--endpoints` specifies the endpoints for the zone being created. Changed to `http://rgw-us-west.example.com` so the secondary zone advertises its own endpoint.

## Review Notes
- The post mixes manual `radosgw-admin` commands (Steps 1-2, 4) with Rook CRD-based configuration (Step 3). In practice, when using Rook, one would typically use either the CRD approach (letting Rook manage realm/zonegroup/zone creation) or the manual approach, but not both. The mixed approach can work if the CRD names match the manually created resources, but it may confuse readers. A future revision could clarify which approach is recommended.
- The CephObjectStore in Step 3 includes `metadataPool` and `dataPool` specs alongside a `zone.name` reference. In Rook multisite, pool configuration is managed by the CephObjectZone CR, and the pool specs in CephObjectStore are ignored when a zone is specified. This is not an error but is redundant and potentially misleading.
- The post does not mention restarting RGW daemons after configuration changes, which is typically required for multisite setup changes to take effect.
