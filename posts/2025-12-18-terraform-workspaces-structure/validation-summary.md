# Validation Summary: How to Structure Terraform Workspaces Properly

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform HCL
- Terraform S3 backend
- Terraform AzureRM backend
- AWS provider examples
- GitHub Actions
- Make

## Sources Consulted
- Terraform workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform workspace command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace
- Terraform workspace select command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform workspace new command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/new
- Terraform workspace delete command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/delete
- Terraform workspace list command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/list
- Terraform workspace show command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/show
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform AzureRM backend implementation: https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/azure/backend_state.go
- Terraform backend block overview: https://developer.hashicorp.com/terraform/language/backend

## Issues Found
- The opening workspace diagram implied exact state filenames such as `dev.tfstate`. Changed the labels to generic state labels because backend-specific workspace state paths vary.
- The S3 backend example used `dynamodb_table` for locking. Current Terraform S3 backend documentation marks DynamoDB-based locking as deprecated, so this was changed to `use_lockfile = true`.
- The S3 workspace state path comments were incorrect. For non-default workspaces, the S3 backend stores state at `<workspace_key_prefix>/<workspace_name>/<key>`, so the comments now show `env:/dev/infrastructure/terraform.tfstate` and matching staging/prod paths.
- The AzureRM workspace state path comments were incorrect. The AzureRM backend stores the default workspace at the configured key and non-default workspaces at `<key>env:<workspace>`, so the comments now show `infrastructure.tfstate`, `infrastructure.tfstateenv:dev`, `infrastructure.tfstateenv:staging`, and `infrastructure.tfstateenv:prod`.

## Review Notes
- Terraform CLI was not installed in the local environment, so command verification was performed against official Terraform CLI documentation instead of local `terraform --help` output.
- The `null_resource` validation examples are syntactically valid, but they fail during apply-time provisioner execution rather than during planning. Terraform variable validation, preconditions, or `terraform_data` may be preferable in future revisions.
