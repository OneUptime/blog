# Validation Summary: How to Create S3 Bucket with Versioning in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon S3
- S3 Versioning
- S3 Lifecycle configuration
- S3 MFA Delete
- S3 Bucket Keys and SSE-KMS
- S3 Storage Lens
- AWS CLI

## Sources Consulted
- Terraform AWS Provider `aws_s3_bucket_versioning` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform AWS Provider `aws_s3_bucket_lifecycle_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS Provider `aws_s3_bucket_server_side_encryption_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS Provider `aws_s3control_storage_lens_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3control_storage_lens_configuration
- AWS S3 User Guide, Configuring MFA Delete: https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiFactorAuthenticationDelete.html
- AWS S3 User Guide, Lifecycle configuration elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- AWS CLI Command Reference, `s3api put-bucket-versioning`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html

## Issues Found
- The fixed-version lifecycle example used `newer_noncurrent_versions` without a `filter {}` block. Amazon S3 requires a filter when retaining a number of newer noncurrent versions, so an empty filter was added to apply the rule to all objects.
- The MFA Delete Terraform example set `mfa_delete = "Enabled"` but did not provide the required top-level `mfa` argument. The example now includes the MFA string and clarifies that root credentials and a current MFA code are required.
- The MFA Delete section did not mention that MFA Delete cannot be used with lifecycle configurations. A short caveat was added to avoid suggesting that users combine it with the earlier lifecycle examples.
- The replication section called the bucket-versioning snippet a complete replication setup, but it did not include an `aws_s3_bucket_replication_configuration` resource or IAM role/policy. The wording now says it is the required bucket versioning setup.
- The S3 Storage Lens example used `bucket_arn`, but the current Terraform AWS provider expects `arn` and also requires `account_id` for `s3_bucket_destination`. The snippet was updated to use `arn` and add `data "aws_caller_identity" "current"`.

## Review Notes
- The S3 versioning, delete marker, suspend-versioning, lifecycle transition, SSE-KMS bucket key, and AWS CLI object-version commands were consistent with current AWS and Terraform documentation.
- The lifecycle rules intentionally apply to all objects. Current Terraform provider documentation recommends explicit `filter {}` for new configurations in some cases, but omitting it remains documented as compatible behavior when no filter or prefix is specified.
