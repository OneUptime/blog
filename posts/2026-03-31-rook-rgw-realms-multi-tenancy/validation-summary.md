# Validation Summary: How to Set Up Ceph RGW Realms for Multi-Tenancy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook Ceph Operator
- Kubernetes (kubectl, Ingress)
- radosgw-admin CLI
- CephObjectStore CRD

## Sources Consulted
- Ceph official documentation: RGW Multisite configuration (https://docs.ceph.com/en/latest/radosgw/multisite/)
- Rook documentation: CephObjectStore CRD (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- Kubernetes Ingress API reference for networking.k8s.io/v1 (https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-v1/)
- radosgw-admin CLI reference (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)

## Issues Found

1. **Missing zone creation for Tenant B**: The post created a realm and zonegroup for Tenant B but omitted the `radosgw-admin zone create` command for the `tenant-b-primary` zone. This zone was referenced in the CephObjectStore YAML but would not exist, causing the RGW deployment to fail. Added the missing `zone create` command.

2. **Missing `period update --commit`**: After creating realms, zonegroups, and zones in a multisite configuration, `radosgw-admin period update --commit` must be run for changes to take effect. Without this step, the RGW daemons would not pick up the new multisite configuration. Added `period update --commit` commands for both realms.

3. **Ingress YAML missing required fields**: The Ingress spec used `networking.k8s.io/v1` but omitted the `path` and `pathType` fields, which are required in the v1 API. Without these fields, the Ingress resource would fail validation when applied. Added `path: /` and `pathType: Prefix` to both path entries.

## Review Notes
- The post correctly distinguishes RGW realms (infrastructure-level isolation) from RGW tenants (the `--tenant` flag for namespace-level isolation within a single realm). Both are valid multi-tenancy approaches, but realms provide stronger isolation.
- Using different gateway ports (8080 vs 8081) across CephObjectStores works but is not strictly necessary since each store gets its own Kubernetes Service. Using the same port for both would also work.
- For production deployments, access keys and secret keys should not be hardcoded as shown in the user creation examples. Consider noting that these are for demonstration purposes only.
