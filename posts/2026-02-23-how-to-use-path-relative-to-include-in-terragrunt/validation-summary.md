# Validation Summary: How to Use the path_relative_to_include Function in Terragrunt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform / OpenTofu backend configuration
- HCL
- AWS S3 remote state
- AzureRM backend
- Google Cloud Storage backend
- jq

## Sources Consulted
- Terragrunt official HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt official HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt official `render` command reference: https://docs.terragrunt.com/reference/cli/commands/render/
- Terraform official S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform official AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/settings/backends/azurerm
- Terraform official GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. Terraform's current S3 backend documentation marks DynamoDB-based locking as deprecated, so the example now uses `use_lockfile = true`.
- The multiple-includes section implied that `path_relative_to_include()` automatically resolves to the include where it is used in all cases. Terragrunt's official documentation states that when the function is used in a child config with include blocks, it requires the include name. The section now explains using `path_relative_to_include("root")` in child configurations.
- The multiple-includes example said the root result was `us-east-1/dev/app` even though the shown file path was `live/dev/app/terragrunt.hcl`. This was corrected to `dev/app`.
- The debugging command used `terragrunt render-json`, but current Terragrunt documentation uses `terragrunt render --format json` or the `--json` shortcut. The command was updated to `terragrunt render --format json`.

## Review Notes
The remaining examples align with Terragrunt's documented behavior for `path_relative_to_include()`, `find_in_parent_folders()`, `read_terragrunt_config()`, `remote_state`, `include`, and `run_cmd`, and with Terraform backend fields for S3, AzureRM, and GCS.
