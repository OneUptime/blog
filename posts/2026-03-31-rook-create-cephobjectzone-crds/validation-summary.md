# Validation Summary: How to Create CephObjectZone CRDs in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph multi-site object storage (RGW)
- Kubernetes CRDs (CephObjectZone, CephObjectStore, CephObjectRealm, CephObjectZoneGroup)
- radosgw-admin CLI
- kubectl

## Sources Consulted
- Rook CephObjectZone CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-zone-crd/
- Rook Object Store Multisite documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph Multi-Site documentation: https://docs.ceph.com/en/latest/radosgw/multisite/

## Issues Found
No technical issues found.

## Review Notes
- The CephObjectZone CRD spec correctly uses `spec.zoneGroup`, `spec.metadataPool`, `spec.dataPool`, and `spec.preservePoolsOnDelete` with valid values. The API version `ceph.rook.io/v1` is correct.
- Pool specifications use the correct structure with `failureDomain: host` and `replicated.size: 3` at the proper nesting levels.
- The CephObjectStore binding to a zone via `spec.zone.name` correctly omits `metadataPool` and `dataPool` from the store spec, since those are defined in the CephObjectZone.
- All radosgw-admin commands (`sync status`, `zone list`, `zone get --rgw-zone=zone-a`) use correct subcommands and flag syntax.
- The multisite hierarchy explanation (realm > zone group > zone > object store) is accurate.
- The deployment order (realm first, then zone group, then zone, then object store) is correctly described.
- The CephObjectZone CRD also supports optional fields like `customEndpoints` and `sharedPools` which are not mentioned, but these are not needed for a basic tutorial and their omission is not an error.
