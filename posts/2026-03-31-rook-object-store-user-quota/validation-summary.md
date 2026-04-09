# Validation Summary: How to Configure Quota on Object Store User in Rook

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph Object Gateway (RGW)
- Kubernetes (CRDs, kubectl)
- radosgw-admin CLI
- S3-compatible object storage

## Sources Consulted
- Rook CephObjectStoreUser CRD documentation (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-user-crd/)
- Rook source code: `pkg/apis/ceph.rook.io/v1/types.go` (ObjectUserQuotaSpec struct)
- Rook source code: `pkg/operator/ceph/object/user/controller.go` (createOrUpdateCephUser function confirming auto-enable behavior)
- Ceph radosgw-admin man page (`doc/man/8/radosgw-admin.rst`) for CLI flag verification
- go-ceph library structs: `QuotaSpec` (`rgw/admin/quota.go`) and `UserStat` (`rgw/admin/user.go`) for output format verification

## Issues Found

1. **Invalid `--rgw-admin-url` flag on `radosgw-admin`**: The "View and Update Quotas via CLI" section showed running `radosgw-admin` with a `--rgw-admin-url` flag pointing to the RGW HTTP endpoint. This flag does not exist. `radosgw-admin` connects directly to the Ceph cluster via RADOS (librados) and must be run from a pod with access to `ceph.conf`, such as the Rook toolbox. Removed the invalid command and the associated unused credential extraction (ADMIN_ACCESS/ADMIN_SECRET variables), and consolidated all CLI examples into the toolbox approach.

2. **Misleading section title "Create User with Bucket-Level Quota"**: The YAML in this section configured user-level quotas via the `quotas` field in `CephObjectStoreUser`, not bucket-level quotas. Bucket-level quotas are a separate concept configured via `radosgw-admin` with `--quota-scope=bucket` (shown correctly later in the post). Renamed the section to "Create User with Quota and Read Capabilities" to accurately reflect its content.

3. **Fabricated example JSON output**: The example output combined quota info and usage stats into a single JSON object that doesn't match the output of any `radosgw-admin` command. Also used the incorrect field name `size_actual` (correct field is `size_rounded`). Split into two separate example outputs matching the actual format of `radosgw-admin quota get` and `radosgw-admin user stats`.

4. **Inaccurate summary statement about enabling quotas**: The summary said "Always explicitly enable quotas after setting them," which is incorrect for CRD-managed users. The Rook operator automatically sets `Enabled: true` when the `quotas` field is populated in `CephObjectStoreUser`. Updated the summary to distinguish between CRD-managed quotas (auto-enabled) and CLI-managed quotas (must manually enable).

## Review Notes
- The first YAML example sets all `capabilities` values to empty strings (`""`), which is effectively a no-op — it grants no permissions. This is technically valid YAML and won't cause errors, but readers may mistakenly think they are configuring capabilities. Consider using meaningful values like `"read"` or `"*"` in future revisions, or removing the capabilities block from the example if default permissions are intended.
- The `quotas` spec in the CRD also supports a `maxBuckets` field (limiting the number of buckets a user can create), which is not mentioned in the post. This is not an error but could be a useful addition.
- The `radosgw-admin user stats` command benefits from the `--sync-stats` flag to ensure up-to-date statistics. Without it, stats may be stale. Consider mentioning this in future revisions.
