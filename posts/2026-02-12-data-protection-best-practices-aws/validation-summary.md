# Validation Summary: How to Implement Data Protection Best Practices on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS
- Amazon S3
- Amazon Macie
- AWS KMS
- IAM policies
- S3 Access Points
- Terraform AWS provider
- Python
- Boto3
- CloudTrail/EventBridge-style events
- Amazon SNS

## Sources Consulted
- Amazon Macie API Reference: Classification Job Creation - https://docs.aws.amazon.com/macie/latest/APIReference/jobs.html
- Amazon Macie User Guide: Creating sensitive data discovery jobs - https://docs.aws.amazon.com/macie/latest/user/discovery-jobs-create.html
- Terraform AWS provider: aws_macie2_classification_job - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/macie2_classification_job
- AWS KMS Developer Guide: AWS KMS condition keys and kms:ViaService - https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html
- Amazon S3 User Guide: Configuring MFA Delete - https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiFactorAuthenticationDelete.html
- Amazon S3 User Guide: Configuring S3 Object Lock - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html
- Amazon S3 User Guide: Lifecycle configuration elements - https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Terraform AWS provider: aws_s3_bucket - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS provider: aws_s3_bucket_versioning - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform AWS provider: aws_s3_bucket_lifecycle_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS provider: aws_s3control_access_point_policy - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3control_access_point_policy
- Amazon S3 User Guide: Managing access to shared datasets with access points - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points.html
- Boto3 S3 delete_objects documentation - https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/delete_objects.html
- OneUptime related post: How to Implement Encryption Everywhere on AWS - https://oneuptime.com/blog/post/2026-02-12-encryption-everywhere-aws/view
- OneUptime related post: How to Implement Database Security Best Practices on AWS - https://oneuptime.com/blog/post/2026-02-12-database-security-best-practices-aws/view

## Issues Found
- The Macie Terraform job used `schedule_frequency_details`, which is not the AWS provider resource block name. Changed it to `schedule_frequency` so the scheduled classification job configuration matches the provider documentation.
- The Macie snippet referenced `data.aws_caller_identity.current.account_id` without declaring the data source. Added `data "aws_caller_identity" "current" {}` so the example is complete enough to resolve the account ID.
- The S3 Object Lock configuration was applied to a bucket that did not enable Object Lock. Added `object_lock_enabled = true` to the bucket resource so the Object Lock configuration is valid.
- The S3 versioning snippet enabled MFA Delete without the required `mfa` argument. Added `mfa = var.mfa_delete_auth` with the expected AWS format so the example satisfies the provider and S3 API requirements.
- The lifecycle configuration omitted an explicit rule filter. Added `filter {}` to apply the rule to all objects and align with the current provider recommendation.
- The Python data loss prevention snippet used `os.environ` without importing `os`. Added the missing import.
- The public-access detection code treated `PutBucketAcl` and `PutBucketPolicy` the same way, so it would not detect public ACL grants. Updated the snippet to check bucket policies for public principals and bucket ACLs for the S3 global AllUsers and AuthenticatedUsers groups.

## Review Notes
The examples still assume surrounding infrastructure such as IAM roles, VPCs, buckets, variables, and SNS topics exist. The retention script deletes current object keys in batches of 1,000, which is correct for the shown Boto3 API usage, but versioned buckets and Object Lock retention need lifecycle/version-aware deletion handling.
