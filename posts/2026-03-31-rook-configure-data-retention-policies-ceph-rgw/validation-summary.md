# Validation Summary: How to Configure Data Retention Policies in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3 Lifecycle Configuration API
- AWS CLI (`s3api` commands)
- `radosgw-admin` CLI
- Kubernetes (`kubectl`)

## Sources Consulted
- AWS S3 API LifecycleRule documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/API_LifecycleRule.html
- AWS CLI `put-bucket-lifecycle-configuration` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS S3 API NoncurrentVersionExpiration documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/API_NoncurrentVersionExpiration.html
- Ceph RGW configuration options (rgw.yaml.in): https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- Ceph radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found
- **`ExpiredObjectDeleteMarker` placement (line 93)**: `ExpiredObjectDeleteMarker` was placed as a top-level property of the lifecycle Rule object. Per the S3 API specification, it must be nested inside the `Expiration` object. Changed `"ExpiredObjectDeleteMarker": true` to `"Expiration": {"ExpiredObjectDeleteMarker": true}`.

## Review Notes
- `rgw_enable_lc_threads` and `rgw_lifecycle_work_time` are valid Ceph configuration options, confirmed against Ceph source.
- All `radosgw-admin lc` subcommands (`list`, `get --bucket=`, `process`) are correct per the official man page.
- The `NoncurrentVersionExpiration` key `NoncurrentDays` is correct per the S3 API.
- The 7-year retention calculation of 2555 days (7 x 365) is correct.
- All `aws s3api` commands use correct syntax and flags including `--endpoint-url` for non-AWS S3-compatible endpoints.
