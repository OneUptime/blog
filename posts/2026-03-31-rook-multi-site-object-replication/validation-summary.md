# Validation Summary: How to Configure Rook-Ceph for Multi-Site Object Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RadosGW (RGW) multi-site replication
- Kubernetes CRDs (CephObjectRealm, CephObjectZoneGroup, CephObjectZone, CephObjectStore)
- S3-compatible object storage
- radosgw-admin CLI

## Sources Consulted
- Rook documentation for multi-site object storage: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/
- Rook CRD reference for CephObjectRealm, CephObjectZoneGroup, CephObjectZone, CephObjectStore
- Ceph documentation for RGW multisite: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph documentation for sync policy: https://docs.ceph.com/en/latest/radosgw/multisite-sync-policy/
- Validated sibling blog posts in this repo: `rook-radosgw-multisite`, `rook-rgw-multisite-two-zones`

## Issues Found

1. **Mermaid diagram realm name inconsistency**: The diagram labeled the realm as "global" while all CRDs used "us-realm". Fixed to "us-realm" for consistency.

2. **Step 5 - Incorrect credential export method**: The original post showed `radosgw-admin realm pull` as running on the master to "export" a realm token. `realm pull` is a command run on the *secondary* to pull config from the master, and is not needed in the CRD-based approach. Also, `kubectl get cephobjectrealm ... -o jsonpath='{.status.info.token}'` is not a valid field path on the CephObjectRealm CRD. Fixed to show the correct approach: creating a system user via `radosgw-admin user create --system` and extracting access/secret keys.

3. **Step 5 - Incorrect Secret format**: The pull secret used `token` and `endpoint` fields. Rook expects `access-key` and `secret-key` fields. Fixed to use `kubectl create secret generic` with the correct field names.

4. **Step 6 - Incorrect CephObjectRealm pull spec**: The secondary realm used `spec.pull.secret.name` (single secret reference). Rook's CRD uses `spec.pull.secretNames` (a list). Fixed to match the correct CRD schema.

5. **Sync policy section - Invalid CRD field**: `syncPolicy.bucketPolicyScope` is not a valid field on the CephObjectZone CRD. Sync policies are configured via `radosgw-admin sync group` commands, not through Rook CRDs. Replaced with correct `radosgw-admin` commands for creating sync groups, flows, and pipes.

6. **Summary - Misleading "automatic failover" claim**: Ceph multi-site replication is asynchronous and does not provide automatic failover. Clients must be manually redirected or use external tooling (e.g., DNS). Fixed to clarify that failover requires manual intervention.

## Review Notes
- The overall structure and workflow (realm -> zonegroup -> zone -> object store) is correct and well-organized.
- The post mixes CRD-based and CLI-based approaches, which is valid but could be clearer about when each is needed. The CRD approach handles most setup; CLI commands are mainly for verification and sync policy configuration.
- The prerequisite of Rook operator version 1.9+ is reasonable, though the CRD-based multi-site features matured significantly in 1.10+.
