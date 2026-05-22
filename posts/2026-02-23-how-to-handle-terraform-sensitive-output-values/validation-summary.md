# Validation Summary: How to Handle Terraform Sensitive Output Values

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform language
- Terraform CLI
- Terraform state and plan files
- AWS S3 backend
- AWS IAM
- AWS RDS
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- HashiCorp Vault
- Terraform random provider

## Sources Consulted
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform output command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform write-only arguments documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data/write-only
- HashiCorp tutorial for RDS write-only password and SSM storage: https://developer.hashicorp.com/terraform/tutorials/aws/rds-upgrade
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_secretsmanager_secret_version` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- AWS provider `aws_ssm_parameter` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Vault provider `vault_generic_secret` data source documentation: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/generic_secret
- Random provider ephemeral password documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/ephemeral-resources/password
- Referenced OneUptime related post: https://oneuptime.com/blog/post/2026-02-23-how-to-handle-secret-rotation-with-terraform/view

## Issues Found
- The S3 backend example used `dynamodb_table` for locking. Current Terraform documentation marks DynamoDB-based S3 backend locking as deprecated, so the example now uses `use_lockfile = true`.
- The S3 IAM example did not include `s3:DeleteObject`, which is needed for S3 lockfile cleanup when `use_lockfile` is enabled. Added `s3:DeleteObject` to the example policy.
- The secret manager section implied that using AWS Secrets Manager, Vault, or SSM by itself keeps secrets out of Terraform state. Added a caveat that Terraform-created or Terraform-read secret values can still be stored in state unless ephemeral values, write-only arguments, or service-managed secrets are used.
- The AWS Secrets Manager example used a managed `random_password` resource and standard secret/RDS password arguments, which would store secret values in state. Updated the example to use an ephemeral `random_password` and write-only `secret_string_wo` and `password_wo` arguments.
- The SSM Parameter Store example used the standard `value` argument, which stores the value in state. Updated it to use `value_wo` and `value_wo_version`.
- The RDS examples omitted `allocated_storage`, which is required for normal `aws_db_instance` creation unless using another supported source such as a snapshot or replica. Added `allocated_storage = 20` to the relevant examples.
- The Vault example did not warn that `vault_generic_secret` data source values are written to Terraform state. Added a short inline comment noting this limitation.

## Review Notes
Terraform CLI is not installed in the local environment, so CLI behavior was verified against official Terraform CLI documentation rather than local `terraform --help` output.
