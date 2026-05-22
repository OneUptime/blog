# Validation Summary: How to Initialize Terraform Backend with -backend-config

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform backend configuration
- Terraform S3 backend
- Terraform AzureRM backend
- Terraform PostgreSQL backend
- GitHub Actions
- GitLab CI
- Jenkins Pipeline

## Sources Consulted
- HashiCorp Terraform CLI `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform backend block configuration overview: https://developer.hashicorp.com/terraform/language/backend
- HashiCorp Terraform backend configuration overview: https://developer.hashicorp.com/terraform/language/settings/backends/configuration
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp Terraform PostgreSQL backend documentation: https://developer.hashicorp.com/terraform/language/backend/pg
- HashiCorp Terraform JSON configuration syntax: https://developer.hashicorp.com/terraform/language/syntax/json

## Issues Found
- The AzureRM backend example omitted the required `key` configuration. Added `-backend-config="key=prod.terraform.tfstate"` because the AzureRM backend requires `storage_account_name`, `container_name`, and `key`, plus an authentication method.
- The S3 examples used `dynamodb_table` for state locking. Current Terraform documentation marks DynamoDB-based locking as deprecated and recommends S3 lockfile-based locking with `use_lockfile = true`. Replaced `dynamodb_table` and related CI variables with `use_lockfile`.
- The post described `-backend-config` as a way to keep secrets safe and recommended credentials in `-backend-config`. HashiCorp warns that backend config values can be stored in `.terraform/terraform.tfstate` and plan files, and command-line values can also appear in shell history. Updated the guidance to prefer environment variables for credentials when supported.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was verified against current official HashiCorp documentation rather than local `terraform init -help` output.
- The examples assume the root Terraform configuration already declares the backend type, which is required for partial backend configuration.
