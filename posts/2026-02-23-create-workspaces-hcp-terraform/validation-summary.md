# Validation Summary: How to Create Workspaces in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- HCP Terraform workspaces
- HCP Terraform Workspaces API
- Terraform `cloud` block
- HashiCorp `tfe` Terraform provider
- HCP Terraform VCS workflow and run triggers

## Sources Consulted
- HCP Terraform workspaces overview: https://developer.hashicorp.com/terraform/cloud-docs/workspaces
- Create workspaces in HCP Terraform: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/create
- Terraform CLI-driven run workflow for HCP Terraform: https://developer.hashicorp.com/terraform/cloud-docs/run/cli
- Terraform `cloud` block reference: https://developer.hashicorp.com/terraform/language/block/terraform
- HCP Terraform Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform workspace settings: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HCP Terraform VCS settings and automatic run triggering: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/vcs
- `tfe` provider documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs
- `tfe_workspace` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- `tfe_workspace_settings` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_settings
- `tfe_notification_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/notification_configuration

## Issues Found
- The post claimed it covered every available workspace creation method. Official documentation also lists no-code provisioning, so the statement was changed to "the most common methods."
- The CLI example showed an interactive prompt for a missing `workspaces.name` workspace and referenced tag matching. Official CLI-driven workflow documentation says `terraform init` implicitly creates a missing named workspace and reports that creation in the output, so the example was corrected.
- The main `tfe` provider example referenced `var.organization` and `tfe_project.projects` without defining them. Added a minimal `organization` variable and `tfe_project` resources derived from the workspace map so the example is internally complete.
- The execution mode example configured `execution_mode` directly on `tfe_workspace`, which the current `tfe` provider marks as deprecated. Changed the example to use `tfe_workspace_settings` with `workspace_id`.
- Several standalone `tfe_workspace` snippets omitted `organization`, which is only optional if configured in the provider. Added `organization = var.organization` to make the examples clearer and portable.
- The commented `trigger_prefixes` example used a leading slash. Provider and HCP Terraform documentation describe trigger prefixes as repository-root-relative paths, so the example was changed to omit the leading slash.

## Review Notes
- `tag_names` is still supported for key-only workspace tags, but current provider examples emphasize key/value `tags` maps. A future update could migrate the post to key/value tags if the intended tagging strategy supports them.
- The notification example uses `url`, which is still supported. The current provider documentation recommends `url_wo` for avoiding webhook URLs in Terraform state when using Terraform 1.11.0 or later.
