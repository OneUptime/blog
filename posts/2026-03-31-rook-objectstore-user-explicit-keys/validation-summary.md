# Validation Summary: How to Manage Explicit Keys for Object Store Users in Rook

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph Object Gateway (radosgw / RGW)
- radosgw-admin CLI
- CephObjectStoreUser CRD (ceph.rook.io/v1)
- Kubernetes Secrets
- S3-compatible object storage authentication

## Sources Consulted
- Ceph Object Gateway Admin Guide: https://docs.ceph.com/en/latest/radosgw/admin/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Rook CephObjectStoreUser CRD types (pkg/apis/ceph.rook.io/v1/types.go) — `ObjectStoreUserSpec.Keys` field and `ObjectUserKey` struct
- Rook PR #15359 (added `keys` field to CephObjectStoreUser spec, merged 2025-04-03)
- Rook object storage documentation: Documentation/Storage-Configuration/Object-Storage-RGW/object-storage.md

## Issues Found
No technical issues found.

All radosgw-admin commands (`user create`, `user info`, `key create`, `key rm`) use correct syntax and flags as documented in the official Ceph documentation. The CephObjectStoreUser CRD `keys` field with `accessKeyRef`/`secretKeyRef` referencing Kubernetes SecretKeySelectors is accurate and matches the actual CRD definition added in Rook v1.17+.

## Review Notes
- The Rook documentation notes that when `.spec.keys` is set on a CephObjectStoreUser, the operator will **not** create a Secret for the user (unlike the default auto-generated behavior), and any keypair not explicitly specified will be removed from the RGW user. The blog post does not mention this behavioral nuance, which could be worth adding in a future update to prevent surprises.
- The example access/secret keys used in the post (AKIAIOSFODNN7EXAMPLE, wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY) are the well-known AWS example credentials from AWS documentation, which is appropriate for example usage.
