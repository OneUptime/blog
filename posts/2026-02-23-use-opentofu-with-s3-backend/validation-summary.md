# Validation Summary: How to Use OpenTofu with S3 Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible HCL
- AWS S3 backend
- AWS DynamoDB state locking
- AWS KMS encryption
- AWS IAM
- AWS provider resources for S3 and DynamoDB
- AWS CLI S3 API commands

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu state locking documentation: https://opentofu.org/docs/language/state/locking/
- OpenTofu state push command documentation: https://opentofu.org/docs/cli/commands/state/push/
- OpenTofu state storage and locking documentation: https://opentofu.org/docs/language/state/backends/
- OpenTofu 1.10 release notes for native S3 state locking: https://opentofu.org/docs/v1.10/intro/whats-new/
- OpenTofu Registry AWS provider docs for S3 server-side encryption configuration: https://search.opentofu.org/provider/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- OpenTofu Registry AWS provider docs for S3 lifecycle configuration: https://search.opentofu.org/provider/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- OpenTofu Registry AWS provider docs for DynamoDB table: https://search.opentofu.org/provider/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS S3 bucket encryption documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html

## Issues Found
- The post implied DynamoDB is required for S3 backend state locking. Current OpenTofu supports DynamoDB locking and native S3 lockfiles, so I updated the wording to make DynamoDB locking optional and specific to the setup shown.
- The cross-account backend example used the deprecated top-level `role_arn` argument. I changed it to the preferred `assume_role = { role_arn = ... }` configuration.
- The DynamoDB IAM policy example omitted `dynamodb:DescribeTable`, which OpenTofu documents as required for DynamoDB locking. I added that action.
- The KMS backend example did not mention that `kms_key_id` requires KMS permissions. I added a sentence noting the required `kms:Encrypt`, `kms:Decrypt`, and `kms:GenerateDataKey` permissions.

## Review Notes
- The post remains focused on DynamoDB-based locking, which is still supported, but OpenTofu 1.10 and later can use `use_lockfile = true` for native S3 locking.
- The local environment did not have the `tofu` CLI installed, so CLI behavior was verified against official OpenTofu documentation rather than local `--help` output.
