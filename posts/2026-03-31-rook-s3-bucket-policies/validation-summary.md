# Validation Summary: How to Create Bucket Policies in Rook-Ceph Object Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RADOS Gateway / RGW)
- Ceph Object Storage
- Kubernetes (Jobs, Secrets)
- AWS CLI (S3 API)
- S3-compatible bucket policies (IAM-style JSON)

## Sources Consulted
- Ceph RGW Bucket Policy documentation: https://docs.ceph.com/en/latest/radosgw/bucketpolicy/
- Rook CephObjectStore documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook CephObjectStoreUser documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/#create-a-user
- AWS S3 Bucket Policy documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html
- AWS CLI s3api reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/

## Issues Found
No technical issues found.

## Review Notes
- The Principal ARN format `arn:aws:iam:::user/<username>` (with triple colon and no account ID) is correct for Ceph RGW, which differs from AWS IAM ARNs that include an account number.
- The "Restrict to a Specific Path Prefix" example intentionally omits `s3:ListBucket`, which means the user can read/write objects under the prefix but cannot list them. This is a valid design choice but readers should be aware they may need to add `s3:ListBucket` with an appropriate `s3:prefix` condition if listing is required.
- RGW's bucket policy support covers the most common S3 policy features but not all AWS condition keys are supported. The conditions used in this post (NotIpAddress/aws:SourceIp) are supported by RGW.
- The Kubernetes Job uses `image: amazon/aws-cli:latest` which is fine for examples but in production a pinned image tag would be preferable for reproducibility.
