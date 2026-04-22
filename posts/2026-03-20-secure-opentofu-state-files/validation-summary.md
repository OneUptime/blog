# Validation Summary: How to Secure OpenTofu State Files

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu
- OpenTofu S3 backend
- OpenTofu state encryption
- AWS S3
- AWS KMS
- AWS DynamoDB
- AWS IAM
- Terraform/OpenTofu HCL

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu sensitive data in state documentation: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu state and plan encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu 1.7 release documentation: https://opentofu.org/docs/v1.7/intro/whats-new/
- Terraform AWS Provider `aws_s3_bucket` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket.html.markdown
- Terraform AWS Provider `aws_s3_bucket_versioning` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_versioning.html.markdown
- Terraform AWS Provider `aws_s3_bucket_server_side_encryption_configuration` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown
- Terraform AWS Provider `aws_s3_bucket_public_access_block` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_public_access_block.html.markdown
- Terraform AWS Provider `aws_dynamodb_table` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/dynamodb_table.html.markdown
- Terraform AWS Provider `aws_kms_key` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/kms_key.html.markdown

## Issues Found
- The S3 backend example used an invalid-looking placeholder KMS key ARN (`mrk-abc123`). Replaced it with a syntactically valid UUID-style KMS key ARN placeholder.
- The IAM policy omitted `dynamodb:DescribeTable`, which OpenTofu documents as required when using DynamoDB state locking. Added `dynamodb:DescribeTable`.
- The IAM policy omitted `kms:Encrypt`, which OpenTofu documents as required when `kms_key_id` is configured for the S3 backend. Added `kms:Encrypt`.
- The IAM policy described least-privilege state access but granted S3 object permissions to every object in the bucket. Narrowed the object ARN to the specific state key used in the backend example.

## Review Notes
- OpenTofu's current S3 backend documentation says both DynamoDB locking and native S3 lockfiles are supported; S3-native locking is preferred, but DynamoDB locking is not deprecated.
- The native state encryption example is valid as a minimal configuration. For existing unencrypted state, OpenTofu's documentation recommends using the migration/fallback flow before enforcing encryption.
- The local environment did not have `tofu` or `terraform` installed, so validation was performed by reviewing the snippets against official documentation rather than running `tofu validate`.
