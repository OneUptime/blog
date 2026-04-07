# Validation Summary: How to Use the S3 API with Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook-Ceph (Kubernetes operator)
- Amazon S3 API
- AWS CLI (`aws s3` and `aws s3api` subcommands)
- Python boto3 SDK
- kubectl

## Sources Consulted
- AWS CLI S3 command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/index.html
- AWS CLI S3API command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/index.html
- boto3 S3 client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html
- Ceph RGW S3 API compatibility: https://docs.ceph.com/en/latest/radosgw/s3/
- Rook-Ceph Object Store documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- AWS S3 Bucket Policy documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html

## Issues Found
No technical issues found.

## Review Notes
- The `--expected-size` flag in the multipart upload example is redundant when uploading a local file (the CLI can determine the size automatically), but it is not incorrect and serves as a useful illustration of the option for cases involving piped/streamed input.
- The `create_bucket(Bucket='mybucket')` call in boto3 omits `CreateBucketConfiguration` which would fail on real AWS for regions other than `us-east-1`, but this is correct behavior for Ceph RGW which does not enforce AWS region-specific bucket creation rules.
- The post correctly recommends `signature_version='s3v4'` for boto3, which is the recommended signature version for Ceph RGW.
