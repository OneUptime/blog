# Validation Summary: How to Configure allowUsersInNamespaces for Rook Object Store

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Object Store (RGW)
- Kubernetes CRDs (`CephObjectStore`, `CephObjectStoreUser`)
- Kubernetes RBAC

## Sources Consulted
- Rook CephObjectStore CRD source: `pkg/apis/ceph.rook.io/v1/types.go` in [rook/rook](https://github.com/rook/rook) — verified `ObjectStoreSpec.AllowUsersInNamespaces` field definition
- Rook CephObjectStoreUser CRD source: `pkg/apis/ceph.rook.io/v1/types.go` — verified `ObjectStoreUserSpec` fields (`Store`, `DisplayName`, `Capabilities`)
- Rook user controller source: `pkg/operator/ceph/object/user/controller.go` — verified secret naming convention (`generateCephUserSecretName`), secret key names (`AccessKey`, `SecretKey`, `Endpoint`), wildcard `"*"` handling in `userInNamespaceAllowed()`
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-store-crd/

## Issues Found
1. **Invalid capability field `object`** (line 58): The `CephObjectStoreUser` spec's `capabilities` section used `object: "*"`, but `object` is not a valid field in the `ObjectUserCapSpec` struct. Valid capability fields are: `user`, `users`, `bucket`, `buckets`, `metadata`, `usage`, `zone`, `roles`, `info`, `amz-cache`, `bilog`, `mdlog`, `datalog`, `user-policy`, `oidc-provider`, `ratelimit`. Changed `object: "*"` to `user: "*"`, which is a valid and commonly used capability for S3 user management.

## Review Notes
- The generated secret also contains an `Endpoint` key (and optionally `SSLCertSecretName` when TLS is configured) beyond the `AccessKey` and `SecretKey` mentioned in the post. This omission is not an error — the post correctly focuses on the credential keys needed for S3 access — but users may find the `Endpoint` key useful.
- The RBAC section mentions checking `rook-ceph-global` ClusterRoleBinding, which is a reasonable starting point. The exact name may vary depending on the Rook deployment method (Helm chart vs. operator manifest).
- All other technical claims verified as correct: field location under `spec`, default same-namespace restriction, secret naming convention, `AccessKey`/`SecretKey` key names, wildcard `"*"` support, `spec.store` field name, `displayName` field, and `"*"` as a valid capability value.
