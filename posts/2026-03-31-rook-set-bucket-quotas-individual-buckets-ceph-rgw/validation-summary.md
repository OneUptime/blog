# Validation Summary: How to Set Bucket Quotas for Individual Buckets in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- radosgw-admin CLI
- Ceph bucket and user quota management
- S3-compatible object storage

## Sources Consulted
- Ceph official documentation on RGW quota management: https://docs.ceph.com/en/latest/radosgw/admin/#quota-management
- Ceph radosgw-admin CLI reference: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found
No technical issues found.

## Review Notes
- All `radosgw-admin quota set`, `quota enable`, `quota disable`, and `bucket stats` commands use correct syntax and flags.
- The `--quota-scope=bucket` and `--quota-scope=user` values are correct for per-bucket and per-user quotas respectively.
- The `--max-size` parameter correctly accepts byte values; 10737418240 bytes = 10 GiB as stated.
- The use of `-1` to mean "unlimited/disabled" for a specific limit is correct.
- The `bucket_quota` JSON output structure (enabled, check_on_raw, max_size, max_size_kb, max_objects) accurately reflects the actual `bucket stats` output.
- The QuotaExceeded error message matches what S3 clients (e.g., AWS CLI, boto3) return when RGW enforces a quota.
- The Python snippet to parse bucket stats output is syntactically correct and references the right JSON paths (`usage.rgw.main` for usage data, `bucket_quota` for quota config).
- Note: `radosgw-admin` also accepts human-readable size suffixes (e.g., `10G`) for `--max-size`, which the post doesn't mention but this is not an error — using raw bytes is perfectly valid.
