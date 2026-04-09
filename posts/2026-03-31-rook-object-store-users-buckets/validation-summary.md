# Validation Summary: How to Configure Rook-Ceph Object Store Users and Buckets

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Rook-Ceph (Kubernetes operator for Ceph)
- Ceph RADOS Gateway (RGW)
- CephObjectStoreUser Custom Resource Definition
- radosgw-admin CLI
- Kubernetes Secrets
- AWS CLI (for S3 bucket creation)

## Sources Consulted
- Rook CephObjectStoreUser CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-store-user-crd/
- Rook Object Storage overview: https://rook.io/docs/rook/v1.12/Storage-Configuration/Object-Storage-RGW/object-storage/
- Ceph radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph RGW Admin Guide: https://docs.ceph.com/en/latest/radosgw/admin/
- Ceph radosgw-admin source (GitHub): https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst

## Issues Found

1. **Invalid "list" capability value (lines 43-47)**: The `capabilities` field in the CephObjectStoreUser CR used `"read, write, list"` for all capability types. "list" is not a valid RGW admin capability permission. The only valid values are `read`, `write`, and `*`. Changed all five capability values from `"read, write, list"` to `"read, write"`.

2. **Wrong quota flag name (lines 135-141, 180-189)**: The blog used `--quota-type=user` and `--quota-type=bucket` in radosgw-admin commands. The correct flag per official Ceph documentation is `--quota-scope`, not `--quota-type`. Changed all four occurrences of `--quota-type` to `--quota-scope`.

3. **Incorrect usage trim command (lines 236-238)**: The description said "Trim usage logs older than 30 days" but the command used `--start-date=2026-01-01`, which trims data FROM that date forward (potentially deleting recent data). To trim old data, `--end-date` should be used instead. Changed to `radosgw-admin usage trim --end-date=2026-03-01` and clarified the description.

## Review Notes
- The `radosgw-admin user enable` and `user suspend` commands were verified as valid subcommands in the radosgw-admin man page.
- The Kubernetes Secret naming pattern `rook-ceph-object-user-<store>-<user>` and secret data keys (`AccessKey`, `SecretKey`, `Endpoint`) are correct per Rook documentation.
- The CephObjectStoreUser CRD field names use singular form (`user`, `bucket`) in the YAML spec, while `radosgw-admin --caps` uses plural form (`users`, `buckets`). The blog correctly uses the appropriate form in each context.
- The `--max-size` values using `GiB` format (e.g., `10GiB`, `5GiB`) are accepted by radosgw-admin's size parser.
- The `maxSize: 20Gi` in the CRD spec uses valid Kubernetes resource quantity format.
