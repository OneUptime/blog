# Validation Summary: How to Use Ceph RGW for Media Asset Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- AWS CLI (S3 and S3API commands)
- Python boto3 SDK
- S3-compatible object storage
- Ceph BlueStore compression
- S3 lifecycle policies

## Sources Consulted
- AWS CLI v2 `s3 cp` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI S3 configuration reference: https://docs.aws.amazon.com/cli/latest/topic/s3-config.html
- Ceph RGW configuration reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- boto3 S3 client `generate_presigned_url` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/generate_presigned_url.html
- AWS CLI `s3api put-bucket-lifecycle-configuration` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- Ceph pool compression documentation: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/

## Issues Found
1. **`--multipart-chunksize` is not a valid CLI flag for `aws s3 cp`**: The multipart chunk size is an S3 transfer configuration setting, not a direct command-line option. Fixed by splitting into two steps: first configuring the chunk size via `aws configure set default.s3.multipart_chunksize 64MB`, then running the `aws s3 cp` command without the invalid flag.

## Review Notes
- The `--expected-size` flag is valid for `aws s3 cp` and helps the CLI optimize multipart upload planning for large files.
- The Ceph RGW config options (`rgw_max_chunk_size`, `rgw_put_obj_min_window_size`, `rgw_max_put_size`) are valid. The values used (4MB chunk size, 16MB put window, 128GB max put size) are reasonable for media workloads.
- The Python boto3 code correctly uses `signature_version='s3v4'` which is recommended for Ceph RGW compatibility.
- The lifecycle configuration JSON uses the correct S3 format with `Filter` (rather than the deprecated `Prefix` at the rule level).
