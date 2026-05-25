# Validation Summary: How to Create a New Workspace with terraform workspace new

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform workspaces
- Terraform local, S3, AzureRM, and GCS backends
- Terraform state management
- Bash scripting for Terraform automation

## Sources Consulted
- HashiCorp Terraform CLI documentation: `terraform workspace new` - https://developer.hashicorp.com/terraform/cli/commands/workspace/new
- HashiCorp Terraform CLI workspaces documentation - https://developer.hashicorp.com/terraform/cli/workspaces
- HashiCorp Terraform state workspaces documentation - https://developer.hashicorp.com/terraform/language/state/workspaces
- HashiCorp Terraform local backend documentation - https://developer.hashicorp.com/terraform/language/settings/backends/local
- HashiCorp Terraform S3 backend documentation - https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform AzureRM backend documentation - https://developer.hashicorp.com/terraform/language/backend/azurerm
- HashiCorp Terraform GCS backend documentation - https://developer.hashicorp.com/terraform/language/backend/gcs

## Issues Found
- The post said `terraform workspace new` has one useful flag, `-state`. HashiCorp documents additional supported options, including `-lock=false` and `-lock-timeout=DURATION`, so the wording was updated to mention the locking options.
- The GCS backend section did not distinguish the default workspace from named workspaces. HashiCorp documents GCS workspace objects as `<prefix>/<name>.tfstate`, so the text now explicitly notes that `default` uses `terraform/state/default.tfstate` and named workspaces use the same pattern with their workspace name.
- The `-state` section suggested cloning an environment by copying state. Copying state does not clone real infrastructure; it can cause two workspaces to manage the same resources if used carelessly. The examples were revised to describe migration, recovery, and moving existing state into a named workspace, with a note to avoid continuing to manage the same resources from the old `default` workspace state.
- The first Bash script did not detect the current workspace because `terraform workspace list` prefixes it with `*`, and it used regex matching on the workspace name. The check was changed to strip Terraform's list marker and use fixed-string matching.
- The post said to always use `terraform.workspace` in resource names. That is too broad because the actual requirement is unique naming where resources require globally or account-unique names. The wording now recommends making resource names unique per workspace and presents `terraform.workspace` as one common method.
- The conclusion said each workspace starts with empty state, which is not true when `-state` is used. The sentence now includes that exception.

## Review Notes
Terraform was not installed in the local environment, so local `terraform --help` verification could not be run. The review used current HashiCorp documentation instead.
