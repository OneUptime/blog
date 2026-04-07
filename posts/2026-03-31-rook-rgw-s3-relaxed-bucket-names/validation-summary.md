# Validation Summary: How to Configure S3 Relaxed Bucket Names in Ceph RGW

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3-compatible object storage
- Python boto3 / botocore
- AWS CLI (s3api)
- Kubernetes ConfigMaps

## Sources Consulted
- Ceph official documentation for `rgw_relaxed_s3_bucket_names` configuration option (https://docs.ceph.com/en/latest/radosgw/config-ref/)
- AWS S3 bucket naming rules (https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html)
- Rook documentation for Ceph config overrides via ConfigMap (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/)
- boto3 / botocore documentation for Config class (https://botocore.amazonaws.com/v1/documentation/api/latest/reference/config.html)

## Issues Found
1. **Incorrect boto3 Config import**: The Python code example used `boto3.session.Config(...)` which does not exist. The `Config` class is in `botocore.config`, not `boto3.session`. Fixed by importing `from botocore.config import Config` and using `Config(s3={'addressing_style': 'path'})` directly.

## Review Notes
- The claim that `rgw_relaxed_s3_bucket_names` allows uppercase letters may depend on the Ceph version. In some versions, the relaxed mode primarily allows underscores and relaxes certain character restrictions, but uppercase handling can vary. The post's claim is reasonable for recent Ceph releases but users should test with their specific version.
- The "length limits may be extended" claim is vague. In practice, relaxed mode primarily changes allowed characters rather than length limits. This is not strictly incorrect but could be more precise.
- The `ceph config get/set` commands and the Rook ConfigMap override approach are both correct and current.
- The warning about virtual-hosted-style URL breakage is accurate and important.
