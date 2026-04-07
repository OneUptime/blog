# Validation Summary: How to Use AWS CLI with Ceph RGW S3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CLI v2
- Ceph RADOS Gateway (RGW)
- Rook Ceph Operator
- S3-compatible object storage
- Kubernetes

## Sources Consulted
- AWS CLI v2 `s3` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/
- AWS CLI v2 `s3api` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/
- AWS CLI v2 environment variables documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- Ceph `radosgw-admin` documentation: https://docs.ceph.com/en/latest/radosgw/admin/
- Rook Ceph Object Store documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/

## Issues Found
- **Environment variable section used a custom variable instead of the built-in one.** The section titled "Environment Variable Shortcut" defined a custom `S3_ENDPOINT` variable and still required passing `--endpoint-url $S3_ENDPOINT` on every command. AWS CLI v2 (since v2.13.0) supports the built-in `AWS_ENDPOINT_URL` environment variable, which automatically applies to all AWS CLI commands without needing `--endpoint-url`. Updated the section to use `AWS_ENDPOINT_URL` and simplified the example command to `aws s3 ls` (no flag needed).

## Review Notes
- All `radosgw-admin`, `aws s3`, and `aws s3api` commands use correct syntax and valid flags.
- The Kubernetes service DNS endpoint format (`rook-ceph-rgw-my-store.rook-ceph:80`) is correct for a Rook CephObjectStore named "my-store" in the `rook-ceph` namespace.
- The `--metadata` shorthand syntax `env=production,version=1.0` is valid AWS CLI map shorthand for `s3api put-object`.
- The post could optionally mention `AWS_ENDPOINT_URL_S3` for an S3-specific override, but the global `AWS_ENDPOINT_URL` is sufficient for this use case.
