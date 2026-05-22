# Validation Summary: How to Use Sensitive Resource Attributes in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform sensitive variables and outputs
- Terraform `sensitive()` and `nonsensitive()` functions
- Terraform provisioners and connection blocks
- Terraform state and S3 backend
- AWS provider resources including RDS, SSM Parameter Store, and Secrets Manager
- HashiCorp Random and TLS providers

## Sources Consulted
- Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform output command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform `sensitive` function documentation: https://developer.hashicorp.com/terraform/language/functions/sensitive
- Terraform `nonsensitive` function documentation: https://developer.hashicorp.com/terraform/language/functions/nonsensitive
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Random provider `random_password` documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- HashiCorp TLS provider `tls_private_key` documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- HashiCorp AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AWS provider `aws_ssm_parameter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- HashiCorp AWS provider `aws_secretsmanager_secret_version` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version

## Issues Found
- The description incorrectly implied that sensitive markings prevent state file exploration from revealing secrets. Updated it to say sensitive markings prevent exposure in plan output, logs, and routine terminal output.
- The provisioner section implied Terraform itself might log the sensitive provisioner value. Current Terraform documentation says sensitive values in provisioner blocks are suppressed in log output. Updated the wording to explain the remaining risk: shell commands can still write or expose secrets outside Terraform's control.
- The provisioner "better approach" example omitted the database password from the generated config file. Added the password line and a restrictive file creation command so the example still demonstrates writing the intended config.
- The S3 backend example used `dynamodb_table` for state locking. Terraform's S3 backend documentation now marks DynamoDB-based locking as deprecated, so the example was updated to use `use_lockfile = true`.
- The conclusion said to use the `sensitive` flag on locals. Locals do not support a `sensitive` argument, so the sentence now recommends `sensitive` for variables and outputs and `sensitive()` for inline expressions.

## Review Notes
- Terraform sensitive markings redact CLI display and Terraform log output, but sensitive values can still be stored in state unless ephemeral values, write-only resource arguments, or external secret-management patterns are used.
- The AWS SSM Parameter `value` argument is marked sensitive in current provider documentation, but SecureString plaintext is still stored in Terraform state unless using the write-only `value_wo` argument with a supported Terraform version.
