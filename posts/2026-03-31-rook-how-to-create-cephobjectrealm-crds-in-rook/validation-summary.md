# Validation Summary: How to Create CephObjectRealm CRDs in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway) multisite replication
- CephObjectRealm CRD
- CephObjectZoneGroup CRD
- CephObjectZone CRD
- Kubernetes (kubectl)
- radosgw-admin CLI

## Sources Consulted
- Rook CephObjectRealm CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-realm-crd/
- Rook CephObjectZoneGroup CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-zonegroup-crd/
- Rook Object Store Multisite documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/
- Ceph radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph Multi-Site documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- Cross-referenced with other validated Rook CRD blog posts in this repository (e.g., `2026-03-31-rook-objectrealm-zonegrp-crd`)

## Issues Found

1. **Incorrect claim about master zone designation**: The post stated that when creating a CephObjectRealm, the operator "Designates the local cluster as the master zone." This is incorrect — realms are top-level namespaces and do not designate master zones. Master zone designation happens at the zone group or zone level. Removed this bullet point from the operator behavior list.

2. **Incorrect `radosgw-admin` flag format (two occurrences)**: The post used `--rgwrealm=my-realm` in both the `realm get` and `realm export` commands. The correct flag is `--rgw-realm` (with hyphens). Changed both occurrences to `--rgw-realm=my-realm`.

3. **Missing `spec` field in CephObjectRealm YAML**: The CephObjectRealm manifest was missing the `spec: {}` field. While Kubernetes may accept a resource without an explicit spec, including it is correct practice and consistent with the Rook documentation. Added `spec: {}` to the YAML example.

## Review Notes
- The overall structure and flow of the post is accurate: realm is the top-level container, referenced by zone groups, which are referenced by zones.
- The CephObjectZoneGroup and CephObjectZone YAML examples are correct with proper field names (`spec.realm`, `spec.zoneGroup`, `spec.metadataPool`, `spec.dataPool`).
- The `radosgw-admin realm list` output format with `default_info` and `realms` keys is accurate.
- The deletion order (store -> zone -> zonegroup -> realm) is correct.
- For secondary/pull clusters, the CephObjectRealm spec would need a `pull.endpoint` field pointing to the primary cluster's RGW endpoint — the post doesn't cover this but it's outside the stated scope of creating a realm on the primary cluster.
