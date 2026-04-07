# Validation Summary: How to Configure Multipart Upload Settings in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3 multipart upload API
- AWS CLI (`aws s3` and `aws s3api`)
- Kubernetes ConfigMaps
- S3 bucket lifecycle policies

## Sources Consulted
- Ceph RGW configuration reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- AWS S3 multipart upload documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html
- Rook Ceph configuration override docs: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- AWS CLI `s3 cp` reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- S3 lifecycle configuration reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html

## Issues Found

1. **`aws s3 cp /dev/urandom` command would hang indefinitely.**
   - **What was wrong:** The post used `aws s3 cp /dev/urandom s3://test-bucket/bigfile --expected-size 1073741824` to upload a 1 GB test object. `/dev/urandom` is an infinite stream that never produces an EOF. The `--expected-size` flag only influences multipart threshold and part size calculations — it does not limit how much data the CLI reads from the source. The command would hang forever.
   - **What was changed:** Replaced with a two-step approach: first create a 1 GB file with `dd if=/dev/urandom of=/tmp/bigfile bs=1M count=1024`, then upload the bounded file with `aws s3 cp /tmp/bigfile s3://test-bucket/bigfile`. Removed the now-unnecessary `--expected-size` flag.
   - **Why:** The original command would never complete, making it impossible for readers to follow the tutorial.

## Review Notes
- The config parameter `rgw_abort_incomplete_multipart_upload_expiration` may not exist as a native Ceph configuration option in all versions. The standard and well-documented approach for cleaning up incomplete multipart uploads is through S3 bucket lifecycle policies (which the post also covers). Readers should prefer the lifecycle policy approach.
- The parameter names `rgw_multipart_min_part_size` and `rgw_multipart_part_upload_limit` should be verified against the specific Ceph version in use, as configuration option names can vary between Ceph releases. Some versions may use `rgw_multipart_part_num_limit` instead of `rgw_multipart_part_upload_limit`.
- The Rook ConfigMap section uses `[client.rgw.my-store.a]` which is correct for targeting a specific RGW instance, but readers should adjust the section name to match their actual CephObjectStore name and daemon ID.
- The S3 spec maximum of 10,000 parts per multipart upload is correctly stated.
- The lifecycle policy JSON format and the `aws s3api put-bucket-lifecycle-configuration` command are correct.
