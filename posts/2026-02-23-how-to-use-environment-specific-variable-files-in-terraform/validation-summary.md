# Validation Summary: How to Use Environment-Specific Variable Files in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform input variables and `.tfvars` variable definition files
- Terraform workspaces
- Terraform S3 backend configuration
- Bash wrapper and validation scripts
- AWS Secrets Manager and Vault CLI usage patterns

## Sources Consulted
- Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform `destroy` command documentation: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Terraform workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Related OneUptime URL checked for availability: https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-tfvars-vs-variables-tf-properly/view

## Issues Found
- The S3 backend examples used `dynamodb_table` for state locking. Terraform's S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 lockfile-based locking with `use_lockfile = true`, so both backend examples were updated to use `use_lockfile = true`.
- The `validate-envs.sh` example iterated over every `envs/*.tfvars` file, which would include `envs/shared.tfvars` from the earlier shared-values pattern and incorrectly fail because that file does not define environment-specific required variables. The loop now skips `envs/shared.tfvars`.

## Review Notes
- Terraform was not installed in the local workspace, so CLI behavior was checked against official HashiCorp documentation rather than local `terraform --help` output.
- The article's `-var-file` usage, variable precedence explanation, workspace references, `TF_VAR_` environment variable pattern, and `terraform init -backend-config` usage match current Terraform documentation.
