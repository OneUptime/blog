# Validation Summary: How to Set Up Ceph RGW Multisite Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph multisite replication (realms, zone groups, zones)
- radosgw-admin CLI
- Rook Ceph Operator (Kubernetes)
- Rook CRDs: CephObjectRealm, CephObjectZoneGroup, CephObjectZone
- AWS CLI (for S3 verification)

## Sources Consulted
- Ceph official documentation on multisite configuration: https://docs.ceph.com/en/latest/radosgw/multisite/
- Rook official multisite example manifests: https://github.com/rook/rook/tree/master/deploy/examples (object-multisite.yaml, object-multisite-pull-realm.yaml)
- Rook documentation on CephObjectZone CRD: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-multisite-crd/

## Issues Found

1. **Missing `--endpoints` on master zonegroup and zone create commands (Step 1)**: The `radosgw-admin zonegroup create` and `radosgw-admin zone create` commands for the master zone were missing the `--endpoints` flag. The official Ceph docs require endpoints on both commands so that secondary zones know how to reach the master for sync. Added `--endpoints=http://master-rgw-host:80` to both commands.

2. **Missing `zone modify` step after system user creation (Step 2)**: After creating the system sync user, the master zone must be updated with the user's access key and secret via `radosgw-admin zone modify --rgw-zone=us-east --access-key=... --secret=...`, followed by `radosgw-admin period update --commit`. Without this step, the master zone has no system user credentials attached, and inter-zone sync authentication will fail. Added both commands to Step 2.

## Review Notes
- The Rook CRD examples are correct but only show the master-side resources (CephObjectRealm, CephObjectZoneGroup, CephObjectZone). On the secondary Rook cluster, the CephObjectRealm would need `spec.pull.endpoint` configured to pull from the master. This is not shown but is outside the scope of the basic setup the post covers.
- The post does not mention restarting the RGW service after configuration changes, which the official Ceph docs recommend. This is not strictly an error but is worth noting for completeness.
- The section title "Rook: Multisite via CephObjectStore" is slightly misleading since the content shows CephObjectRealm/ZoneGroup/Zone CRDs rather than CephObjectStore, but this is a minor stylistic point rather than a technical error.
