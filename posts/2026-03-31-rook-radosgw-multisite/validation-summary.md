# Validation Summary: How to Set Up Ceph RADOSGW Multisite with Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph RADOSGW (RGW) — object storage gateway
- Rook — Kubernetes operator for Ceph
- Kubernetes CRDs: `CephObjectRealm`, `CephObjectZoneGroup`, `CephObjectZone`, `CephObjectStore`
- `radosgw-admin` CLI
- AWS S3 CLI (`aws s3`)

## Sources Consulted
- https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/
- https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-realm-crd/
- https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-zone-crd/
- https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-zonegroup-crd/
- https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- https://docs.ceph.com/en/latest/radosgw/multisite/
- https://github.com/rook/rook/blob/master/design/ceph/object/realm.md

## Issues Found

### Issue 1: Non-existent `radosgw-admin realm pull-token` command
**What was wrong:** The post showed a `radosgw-admin realm pull-token` command with `--url`, `--access-key`, and `--secret-key` flags. This subcommand does not exist in `radosgw-admin`. The relevant commands for realm operations are `radosgw-admin realm pull` (to pull a realm config) and `ceph rgw realm tokens` (RGW manager module). The intent of this section was to obtain credentials for the secondary cluster to use.

**What was changed:** Removed the invalid command entirely. Restructured section 6 ("Export Realm Pull Token" → "Export Realm Credentials") to only show the correct approach: creating a system user with `radosgw-admin user create --system` and retrieving its credentials with `radosgw-admin user info`. Added a clarifying comment explaining these credentials feed the secondary cluster's pull secret.

### Issue 2: Incorrect Kubernetes secret field names for realm pull
**What was wrong:** The secondary cluster's realm pull secret was created with `--from-literal=endpoint=...` and `--from-literal=token="<access-key>:<secret-key>"`. The Rook operator expects the secret to contain `access-key` and `secret-key` as separate fields, not a combined `token` field, and does not look for an `endpoint` field inside the secret (the endpoint is specified directly in the `CephObjectRealm` spec).

**What was changed:** Fixed the `kubectl create secret` command to use `--from-literal=access-key=...` and `--from-literal=secret-key=...`, matching what Rook actually reads from the secret referenced via `secretNames`.

## Review Notes
- The `CephObjectRealm` pull spec fields (`endpoint`, `secretNames` as an array) are correct per the Rook CRD schema.
- The `CephObjectZoneGroup`, `CephObjectZone`, and `CephObjectStore` CRD field names and structures are all accurate.
- The `radosgw-admin zonegroup modify --master`, `zone modify --master`, and `period update --commit` commands are correct for promoting the master zone group and zone.
- The `radosgw-admin sync status`, `radosgw-admin sync status --rgw-zone=us-west`, and `radosgw-admin metadata sync status` commands are all valid.
- The expected sync status output format shown is representative and accurate.
- The overall multisite topology (realm → zone group → zones → object stores) and the primary/secondary setup sequence are architecturally correct.
- Readers should be aware that `--from-literal` values in the example secret contain placeholder strings like `<access-key-from-system-user>` that must be replaced with real values from `radosgw-admin user info` output.
