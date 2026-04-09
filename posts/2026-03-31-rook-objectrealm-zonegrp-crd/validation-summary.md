# Validation Summary: How to Use CephObjectRealm and CephObjectZoneGroup CRDs in Rook

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Object Storage (RGW / RADOS Gateway)
- Kubernetes CRDs (Custom Resource Definitions)
- CephObjectRealm and CephObjectZoneGroup resources
- radosgw-admin CLI
- Ceph multi-site replication

## Sources Consulted
- Rook CephObjectRealm CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-realm-crd/
- Rook CephObjectZoneGroup CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-zonegroup-crd/
- Rook Object Store Multisite guide: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/
- Ceph radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found

### 1. Incorrect pull secret name
- **What was wrong:** The post used `realm-my-realm` as the pull secret name (e.g., `kubectl get secret realm-my-realm`).
- **What was changed:** Corrected to `my-realm-keys`, following the official `<realm-name>-keys` naming convention.
- **Why:** Rook auto-creates a system user named `<realm-name>-system-user` and stores its credentials in a secret named `<realm-name>-keys`.

### 2. Incorrect pull secret data fields
- **What was wrong:** The post referenced `{.data.endpoint}` and `{.data.token}` as the secret's data fields.
- **What was changed:** Corrected to `{.data.access-key}` and `{.data.secret-key}`.
- **Why:** The Rook-generated pull secret contains `access-key` and `secret-key` fields, not `endpoint` and `token`.

### 3. Non-existent `spec.pull.secretNames` field in CephObjectRealm CRD
- **What was wrong:** The secondary cluster CRD example included `spec.pull.secretNames`, which does not exist in the CephObjectRealm CRD spec.
- **What was changed:** Replaced the single YAML block with two steps: (1) create the Kubernetes secret manually on the secondary cluster with `access-key` and `secret-key` data, and (2) create the CephObjectRealm with only `spec.pull.endpoint`. This matches the official multisite setup procedure.
- **Why:** The CephObjectRealm `spec.pull` section only supports the `endpoint` field. The secret must be created as a separate Kubernetes resource on the secondary cluster before applying the realm CRD.

## Review Notes
- The post correctly notes that deletion must be bottom-up (stores → zones → zone groups → realm). However, users should be aware that deleting these CRDs does **not** delete the underlying Ceph realm, zone group, zone, or associated pools. Manual cleanup via `radosgw-admin` in the Rook toolbox is required for full removal.
- All `radosgw-admin` commands shown are correct and match current Ceph CLI syntax.
- The hierarchy diagram and general explanations of realms, zone groups, and zones are accurate.
- The CephObjectRealm CRD also supports a `defaultRealm: true` field not mentioned in the post, but this is optional and its omission is not an error.
