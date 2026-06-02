# Validation Summary: How to Use Terraform State with S3 Backend and DynamoDB Locking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform S3 backend
- Terraform state locking
- AWS S3
- AWS DynamoDB
- AWS IAM
- Terraform AWS provider

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform remote state documentation: https://docs.hashicorp.com/terraform/language/state/remote
- Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform `init` command documentation: https://developer.hashicorp.com/terraform/cli/init
- Terraform `force-unlock` command documentation: https://docs.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS provider `aws_s3_bucket_server_side_encryption_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS provider `aws_dynamodb_table` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform sensitive variables/state guidance: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables

## Issues Found
- The post described S3 plus DynamoDB as the standard current AWS backend locking approach. Current Terraform S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 lockfiles via `use_lockfile`. Updated the wording and backend configuration to use `use_lockfile = true`, leaving `dynamodb_table` only as a commented legacy compatibility option.
- The locking explanation stated that Terraform acquires a lock in DynamoDB for `plan` or `apply`. Updated it to explain S3 `.tflock` locking for the current configuration and DynamoDB locking only when the deprecated setting is used.
- The IAM example omitted `dynamodb:DescribeTable`, which Terraform requires when using deprecated DynamoDB locking. Added it and split S3 permissions so `s3:DeleteObject` is scoped to lockfiles rather than the state object.

## Review Notes
The DynamoDB table setup remains technically valid for older Terraform versions or migration compatibility, but new Terraform S3 backend configurations should prefer `use_lockfile = true`. The Terraform CLI was not installed in the local environment, so HCL examples were reviewed against official documentation rather than executed with `terraform validate`.
