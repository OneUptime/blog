# Validation Summary: How to Configure S3 Bucket Ownership Controls

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 Object Ownership
- Amazon S3 ACLs
- Amazon S3 bucket policies and IAM policies
- AWS CLI `s3api`
- Python boto3 S3 client
- Terraform AWS provider S3 resources
- S3 Block Public Access

## Sources Consulted
- AWS S3 User Guide: Controlling ownership of objects and disabling ACLs for your bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html
- AWS S3 User Guide: Setting Object Ownership on an existing bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-ownership-existing-bucket.html
- AWS S3 User Guide: Prerequisites for disabling ACLs - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-ownership-migrating-acls-prerequisites.html
- AWS S3 User Guide: Setting Object Ownership when you create a bucket - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-ownership-new-bucket.html
- AWS CLI Command Reference: `put-bucket-ownership-controls` - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-ownership-controls.html
- AWS announcement: Amazon S3 now applies two security best practices to all new buckets by default - https://aws.amazon.com/about-aws/whats-new/2023/04/amazon-s3-security-best-practices-buckets-default/
- Terraform AWS provider: `aws_s3_bucket_ownership_controls` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_ownership_controls
- Terraform AWS provider: `aws_s3_bucket_public_access_block` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- Boto3 S3 client reference - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/index.html

## Issues Found
- The opening described cross-account object writer ownership as the default behavior without qualifying that this applies to older buckets or buckets with ACLs enabled and Object writer ownership. Updated it to avoid contradicting the current default for new buckets, where S3 Object Ownership is Bucket owner enforced.
- The explanation said ACLs override bucket policies. Updated this to say ACLs can grant access separately from bucket policies, which more accurately reflects S3 authorization behavior.
- The post said ACL headers always cause a 400 error with `BucketOwnerEnforced`. Updated this to note that S3 accepts requests with no ACL or bucket owner full control ACLs, while unsupported ACLs such as `public-read` are rejected.
- The migration steps omitted the AWS prerequisite to reset non-default bucket ACLs before applying Bucket owner enforced. Added that requirement to the enablement step.

## Review Notes
The AWS CLI and Terraform examples use valid resource names, argument names, and ownership values. The local environment did not have the AWS CLI installed, so CLI validation was performed against official AWS CLI and S3 documentation rather than local `--help` output.
