# Validation Summary: How to Use S3 as a Terraform State Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform S3 backend
- Amazon S3
- AWS IAM
- AWS CLI
- Terraform AWS Provider

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform init command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform force-unlock command documentation: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- HashiCorp Terraform AWS Provider S3 bucket versioning resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- HashiCorp Terraform AWS Provider S3 bucket server-side encryption configuration resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS S3 default bucket encryption documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html
- AWS CLI s3api copy-object command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/copy-object.html

## Issues Found
- The post presented DynamoDB locking as the standard S3 backend locking approach. HashiCorp now documents S3 lockfile locking with `use_lockfile = true` and marks DynamoDB-based locking as deprecated. I updated the description, explanations, backend snippets, partial backend configuration, and best-practices text to use S3 lockfile locking.
- The bootstrap Terraform created a DynamoDB lock table that is no longer needed for the current S3 lockfile backend path. I removed that resource and its output.
- The backend snippet used `dynamodb_table` and a `kms_key_id` alias that was not created by the bootstrap configuration. I replaced `dynamodb_table` with `use_lockfile = true` and removed the uncreated KMS alias.
- The IAM policy mixed state-file and lock permissions and included DynamoDB permissions. Terraform's S3 backend documentation says `s3:DeleteObject` is not required for the state file, but is required for the `.tflock` object when `use_lockfile` is enabled. I split the state and lockfile object permissions and removed DynamoDB permissions.
- The stale-lock error example used DynamoDB's `ConditionalCheckFailedException`. I changed it to the generic Terraform state lock acquisition error wording used for current backend locking.
- The S3 bucket default encryption example used SSE-KMS without configuring a customer-managed key while the backend example referenced an unrelated KMS alias. I changed the bootstrap bucket encryption to SSE-S3 (`AES256`) so the example is self-contained and still encrypted.

## Review Notes
- The workspace path explanation, `terraform init -backend-config` usage, `terraform force-unlock LOCK_ID`, and AWS CLI `copy-object` version restore example are consistent with official documentation.
- If the post later wants to cover customer-managed KMS keys, it should add an explicit KMS key resource or use an existing KMS key ARN consistently in both the bucket and backend examples.
