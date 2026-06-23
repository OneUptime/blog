# Validation Summary: How to Understand What terraform refresh Actually Does

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- Terraform state and refresh-only planning
- Terraform S3 backend
- AWS provider examples
- GitHub Actions drift detection workflow

## Sources Consulted
- HashiCorp Terraform CLI `refresh` command documentation: https://developer.hashicorp.com/terraform/cli/commands/refresh
- HashiCorp Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform resource configuration documentation for operation timeouts: https://developer.hashicorp.com/terraform/language/resources/configure#define-operation-timeouts
- HashiCorp Terraform import command documentation: https://developer.hashicorp.com/terraform/cli/commands/import
- HashiCorp Terraform import resources overview: https://developer.hashicorp.com/terraform/language/import

## Issues Found
- The post described refresh as updating the local state file. This is only always true for local state; remote backends store state remotely. Changed the wording to say Terraform updates the state.
- The S3 backend examples used `dynamodb_table` for state locking. HashiCorp now marks DynamoDB-based S3 backend locking arguments as deprecated and recommends S3 lockfiles. Updated the examples to use `use_lockfile = true`.
- The S3 refresh workflow said Terraform acquires a state lock "if using DynamoDB." Updated this to "if locking is enabled" so it is accurate for S3 lockfile locking and other backend locking mechanisms.
- The timeout troubleshooting example showed `default_tags`, which does not increase Terraform operation timeouts. Replaced it with a resource-level `timeouts` block using the AWS database instance example pattern from the Terraform documentation.

## Review Notes
- The post correctly states that `terraform refresh` is deprecated, that it is effectively an auto-approved refresh-only apply, and that `terraform plan -refresh-only` / `terraform apply -refresh-only` are the modern workflow.
- `-target` is valid with planning, but HashiCorp recommends using resource targeting only in exceptional circumstances. The post already frames it as a partial refresh technique for large infrastructures, but future revisions could add that caveat.
- Terraform was not installed in the local environment, so command behavior was validated against official HashiCorp documentation rather than local `terraform --help` output.
