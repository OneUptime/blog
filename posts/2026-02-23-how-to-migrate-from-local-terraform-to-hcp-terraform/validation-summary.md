# Validation Summary: How to Migrate from Local Terraform to HCP Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- HCP Terraform
- Terraform Cloud CLI integration
- Terraform state migration
- Terraform `cloud` block
- TFE Terraform provider
- HCP Terraform workspace variables and API

## Sources Consulted
- HashiCorp Terraform CLI `login` command documentation: https://developer.hashicorp.com/terraform/cli/commands/login
- HashiCorp Terraform CLI `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform `cloud` block / CLI integration documentation: https://developer.hashicorp.com/terraform/cli/cloud/settings
- HashiCorp Terraform `terraform` block reference: https://developer.hashicorp.com/terraform/language/settings/terraform-cloud
- HashiCorp HCP Terraform workspace variables documentation: https://developer.hashicorp.com/terraform/cloud-docs/variables/managing-variables
- HashiCorp HCP Terraform workspace variables API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HashiCorp Terraform `state push` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/push
- HashiCorp TFE provider `tfe_workspace` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- HashiCorp TFE provider `tfe_workspace_settings` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_settings
- HashiCorp TFE provider `tfe_variable` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable

## Issues Found
- The setup steps implied that a user API token must be generated before running `terraform login`. The Terraform CLI can create and store a token during `terraform login`; a manually generated token is only needed for API usage. Updated the wording to make that distinction.
- The `tfe_workspace` example used `execution_mode` directly on the workspace resource. Current TFE provider documentation marks direct workspace execution-mode management as deprecated in favor of `tfe_workspace_settings`. Updated the example to use a separate `tfe_workspace_settings` resource.
- The variable migration section stated that values from `terraform.tfvars` need to be moved to workspace variables. HCP Terraform can load `terraform.tfvars` and `*.auto.tfvars` files included with uploaded configuration, although it does not persist them as workspace variables. Updated the guidance to distinguish centralized workspace variables from uploaded variable files.
- The multiple-workspace section described a "prefix pattern" while using `tags`, which was misleading because the `cloud` block does not support `prefix`. Updated the section to explain that remote backend prefixes should be replaced with tags and that CLI workspace selection uses full HCP Terraform workspace names after migration.
- The common-issues section incorrectly said HCP Terraform does not read `terraform.tfvars` during remote execution. Updated it to state that HCP Terraform can read included `terraform.tfvars` and `*.auto.tfvars` files but does not persist them as workspace variables.

## Review Notes
The remaining examples are technically plausible for CLI-driven HCP Terraform migrations. The post intentionally uses key-only workspace tags through `tag_names` and `workspaces.tags`; current HashiCorp documentation still supports key-only tags, though key-value tags are now preferred for newer tagging workflows.
