# Validation Summary: How to Set Up S3 Bucket Policies for Access Control

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon S3 bucket policies
- AWS Identity and Access Management (IAM)
- AWS CLI
- AWS CloudFront Origin Access Control (OAC)
- AWS KMS server-side encryption for S3
- S3 VPC endpoint access controls

## Sources Consulted
- Amazon S3 User Guide: Bucket policies for Amazon S3, https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html
- Amazon S3 User Guide: Examples of Amazon S3 bucket policies, https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- Amazon S3 User Guide: Bucket policy examples using condition keys, https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- Amazon S3 User Guide: Controlling access from VPC endpoints with bucket policies, https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies-vpc-endpoint.html
- Amazon S3 User Guide: Using server-side encryption with AWS KMS keys (SSE-KMS), https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin, https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CLI Command Reference: get-bucket-policy, https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-policy.html
- AWS IAM User Guide: Cross-account resource access in IAM, https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html

## Issues Found
- The VPC endpoint bucket policy used `aws:sourceVpce`. Updated it to `aws:SourceVpce` to match the AWS documented condition key spelling.
- The production policy combined `s3:ListBucket` and `s3:GetObject` in one data team statement and granted `ListBucket` on the whole bucket without a prefix condition. Split it into separate list and read statements and added an `s3:prefix` condition for `analytics/*`.
- The debugging guidance said requesters always need both IAM permission and bucket policy permission. Updated it to distinguish same-account access from cross-account access, where both sides must allow the request.
- The final `get-bucket-policy` debugging command omitted `--query Policy`, which would not reliably pipe the policy document itself to `python3 -m json.tool`. Added `--query Policy`.

## Review Notes
All JSON policy snippets and JSON heredocs were parsed successfully after the fixes. The examples remain general-purpose S3 bucket policy patterns; real deployments should still replace placeholder ARNs, bucket names, account IDs, VPC endpoint IDs, and CloudFront distribution IDs.
