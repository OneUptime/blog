# Validation Summary: How to Mark Outputs as Sensitive in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform output values
- Terraform CLI
- Terraform sensitive values
- Terraform state and plan files
- AWS S3 Terraform backend
- AWS SSM Parameter Store
- AWS Secrets Manager
- HashiCorp Random provider
- HashiCorp TLS provider

## Sources Consulted
- Terraform output command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform sensitive variables tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Random provider `random_password` resource documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- HashiCorp TLS provider `tls_private_key` resource documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- HashiCorp AWS provider `aws_ssm_parameter` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- HashiCorp AWS provider `aws_secretsmanager_secret_version` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version

## Issues Found
- The post implied that `terraform output -raw` and `terraform output -json` were the only explicit ways to reveal a sensitive output. HashiCorp's Terraform CLI documentation states that Terraform also does not redact a sensitive value when a specific output is queried by name with `terraform output NAME`. Updated the Querying Sensitive Outputs section to include `terraform output database_password` and adjusted the explanation accordingly.

## Review Notes
- Terraform was not installed in the local workspace, so CLI behavior was verified against current official HashiCorp documentation rather than local `terraform --help` output.
- The post's warning that sensitive values remain in state and saved plan files is correct. Current Terraform versions also support ephemeral values in some contexts for avoiding state and plan storage, but that is outside the scope of this post.
