# Validation Summary: How to Configure Object Store Multisite with Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway) multisite replication
- Kubernetes CRDs: CephObjectRealm, CephObjectZoneGroup, CephObjectZone, CephObjectStore
- kubectl CLI
- radosgw-admin CLI

## Sources Consulted
- Rook official multisite documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/
- Rook CRD Go source types: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook multisite example manifests: https://github.com/rook/rook/tree/master/deploy/examples (object-multisite-realm.yaml, object-multisite-pull-realm.yaml, object-multisite-zone.yaml, object-multisite-zonegroup.yaml)
- Rook multisite design documentation: https://github.com/rook/rook/blob/master/design/ceph/object/realm.md
- Ceph upstream RGW multisite documentation: https://docs.ceph.com/en/latest/radosgw/multisite/

## Issues Found
1. **Missing CephObjectZoneGroup YAML for secondary cluster.** Step 6 said "Create matching ZoneGroup and a secondary Zone" but only showed the CephObjectZone YAML. The secondary cluster also needs a CephObjectZoneGroup resource applied before the zone can be created. Added the ZoneGroup YAML manifest for the secondary cluster.

2. **Missing CephObjectStore for secondary cluster.** The secondary cluster also requires a CephObjectStore resource referencing the secondary zone (`us-east-2`) to deploy RGW gateway pods. Without this, the secondary zone has no running RGW instances. Added the CephObjectStore YAML for the secondary cluster.

## Review Notes
- The blog mentions "Transfer these secrets to the secondary cluster" in Step 5 but does not show the explicit commands to copy and re-create the `my-realm-keys` secret on the secondary cluster (editing the namespace in the YAML and applying it). This is mentioned but not demonstrated — users unfamiliar with the process may need to consult Rook docs for the exact steps.
- All CRD apiVersions (`ceph.rook.io/v1`), kinds, and spec field names are correct and current.
- The `radosgw-admin sync status` output format is accurate. The placeholder UUIDs (12345678, etc.) are obviously illustrative rather than real Ceph UUIDs, which is appropriate for a tutorial.
- The multisite hierarchy (Realm -> ZoneGroup -> Zone) is correctly described.
- Pool specs omit optional fields like `failureDomain` and `requireSafeReplicaSize`, which is acceptable for a tutorial — they use sensible defaults.
