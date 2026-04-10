# Validation Summary: How to Create CephObjectStoreUser CRDs in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway / Object Storage)
- Kubernetes Custom Resource Definitions (CRDs)
- S3-compatible object storage
- kubectl CLI
- radosgw-admin CLI

## Sources Consulted
- Rook CephObjectStoreUser CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-store-user-crd/
- Rook CRD Go type definitions (authoritative source for field names and JSON tags): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook example manifests: https://github.com/rook/rook/blob/master/deploy/examples/object-user.yaml
- Ceph radosgw-admin documentation: https://docs.ceph.com/en/latest/radosgw/admin/

## Issues Found
No technical issues found.

All code examples, YAML manifests, CLI commands, and technical claims were verified against the official Rook source code and documentation:

- **API version and kind**: `ceph.rook.io/v1` / `CephObjectStoreUser` confirmed correct.
- **Spec fields**: `store`, `displayName`, `capabilities`, `quotas` all verified in Go types.
- **Capabilities field names**: `user`, `bucket`, `usage`, `zone`, `info`, `roles`, `amz-cache`, `bilog`, `datalog`, `mdlog`, `oidc-provider`, `ratelimit` — all confirmed as valid JSON tags in `ObjectUserCapSpec`. Note: the Rook documentation has a typo listing `odic-provider`, but the actual CRD code correctly uses `oidc-provider` as shown in the blog.
- **Capability values**: `read`, `write`, `*` confirmed correct.
- **Quotas fields**: `maxBuckets` (int), `maxSize` (resource.Quantity — `"10Gi"` is valid), `maxObjects` (int64) all verified.
- **Secret name format**: `rook-ceph-object-user-<store>-<username>` confirmed.
- **Secret keys**: `AccessKey` and `SecretKey` confirmed.
- **kubectl and radosgw-admin commands**: All syntactically correct with proper flags.

## Review Notes
- The CRD also supports `buckets` (plural) and `users` (plural) as separate capability fields alongside `bucket`/`user`. The blog uses the singular forms which are valid. It also omits `metadata` and `user-policy` capabilities, but the blog doesn't claim to be an exhaustive reference — the example adequately demonstrates the concept.
- The CRD has additional spec fields not covered in the blog (`clusterNamespace`, `opMask`, `accountRef`), which is fine for a tutorial-level post.
- The Rook documentation page lists `odic-provider` (a typo), but the actual Go source code uses `oidc-provider`. The blog correctly uses `oidc-provider`.
