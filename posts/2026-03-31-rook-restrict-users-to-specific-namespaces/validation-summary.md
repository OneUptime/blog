# Validation Summary: How to Restrict Users to Specific Namespaces in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RADOS, CephX authentication, RBD)
- Rook (CephBlockPool CRD, rook-ceph-tools)
- Kubernetes (namespaces, kubectl)

## Sources Consulted
- Ceph official documentation: User Management / Authorization (Capabilities) — https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph official documentation: rados man page — https://docs.ceph.com/en/latest/man/8/rados/
- Ceph official documentation: rbd man page (namespace create) — https://docs.ceph.com/en/latest/man/8/rbd/
- Linux errno definitions (EPERM vs EACCES)

## Issues Found
- **Incorrect error code for CephX authorization denial**: The post stated that a namespace-restricted user attempting cross-namespace access would see `RADOS returned error: -13 (Permission denied)`. CephX capability/authorization failures return EPERM (errno 1, "Operation not permitted"), not EACCES (errno 13, "Permission denied"). Fixed the error output to `error listing shared-pool/tenant2-ns: (1) Operation not permitted`.

## Review Notes
- The RBD namespace section uses `osd 'allow rwx pool=mypool namespace=mynamespace'` which works but is not the documented best practice. The recommended approach for RBD is `osd 'profile rbd pool=mypool namespace=mynamespace'` which includes the specific class methods needed for RBD operations. This is not incorrect per se (rwx does grant the needed permissions), so it was left as-is, but could be improved in a future update.
- RADOS namespaces (implicit, no creation needed) and RBD namespaces (must be explicitly created with `rbd namespace create`) are correctly distinguished in the post.
