# Validation Summary: How to Use State Environments vs Workspaces in Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- Terraform workspaces
- Terraform state
- Terraform S3 backend
- HCL
- Terragrunt
- AWS S3 state storage

## Sources Consulted
- Terraform CLI workspace documentation: https://docs.hashicorp.com/terraform/language/state/workspaces
- Terraform workspace command references: https://developer.hashicorp.com/terraform/cli/commands/workspace/list, https://developer.hashicorp.com/terraform/cli/commands/workspace/new, https://developer.hashicorp.com/terraform/cli/commands/workspace/select, https://developer.hashicorp.com/terraform/cli/commands/workspace/delete, https://developer.hashicorp.com/terraform/cli/commands/workspace/show
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform state pull documentation: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform state push documentation: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terragrunt remote_state block documentation: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt path_relative_to_include function documentation: https://docs.terragrunt.com/reference/hcl/functions/

## Issues Found
- The S3 backend examples used `dynamodb_table` for state locking. Terraform's S3 backend documentation now marks DynamoDB-based locking as deprecated and recommends native S3 locking with `use_lockfile = true`, so the backend examples were updated to use `use_lockfile = true`.
- The Terragrunt `remote_state` example also used `dynamodb_table`. Terragrunt documents native S3 locking with `use_lockfile = true`, so the example was updated to match current guidance.
- The environment directory comparison said there is "No risk" of accidentally applying to the wrong environment. Separate directories reduce this risk but do not eliminate all operational mistakes, so the claim was changed to "Less risk" with the reason.
- The migration example used `cd terraform/environments/production` immediately after changing into `terraform/environments/dev`, which would resolve to the wrong nested path. It was changed to `cd ../production`.

## Review Notes
The Terraform workspace commands, `terraform.workspace` usage, S3 workspace state path explanation, module examples, Terragrunt `path_relative_to_include()` usage, and `terraform state pull` / `terraform state push` commands were consistent with official documentation. The post does not pin Terraform versions; the locking updates reflect current Terraform documentation as of 2026-05-22.
