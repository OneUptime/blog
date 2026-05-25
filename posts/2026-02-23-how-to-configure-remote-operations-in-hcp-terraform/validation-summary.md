# Validation Summary: How to Configure Remote Operations in HCP Terraform

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform CLI
- HCP Terraform
- Terraform Cloud / Terraform Enterprise concepts
- HashiCorp `tfe` Terraform provider
- HCP Terraform remote operations, workspaces, variables, run triggers, and notifications

## Sources Consulted
- HashiCorp Developer: Remote operations in HCP Terraform: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/remote-operations
- HashiCorp Developer: Use HCP Terraform with the Terraform CLI: https://developer.hashicorp.com/terraform/cli/cloud
- HashiCorp Developer: Run modes and options in HCP Terraform: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/modes-and-options
- HashiCorp Developer: Workspace settings in HCP Terraform: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HashiCorp Developer: Workspace API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HashiCorp Developer: Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Developer: Terraform `destroy` command reference: https://developer.hashicorp.com/terraform/cli/commands/destroy
- HashiCorp Developer: Remote backend and `.terraformignore`: https://developer.hashicorp.com/terraform/language/backend/remote
- HashiCorp `terraform-provider-tfe` official docs for `tfe_workspace`, `tfe_workspace_settings`, `tfe_variable`, `tfe_run_trigger`, and `tfe_notification_configuration`: https://github.com/hashicorp/terraform-provider-tfe

## Issues Found
- The post configured `execution_mode` and `agent_pool_id` directly on `tfe_workspace`. Those arguments are deprecated in the current `tfe` provider documentation. Updated examples to use `tfe_workspace_settings` for execution mode and agent pool assignment.
- The auto-apply section described `auto_apply_run_trigger` as applying only to VCS-triggered runs. The provider documentation states it applies to runs created by run triggers from another workspace. Updated the wording.
- The auto-apply section implied workspace auto-apply controls all applies. HCP Terraform workspace settings document that CLI-driven runs use `-auto-approve` to control auto-approval for a specific run. Added that caveat and narrowed the comment to UI, API, and VCS runs.
- The Terraform version section used `terraform_version = "latest"`. Current HCP Terraform and `tfe_workspace` docs describe exact versions or version constraints, with latest as the default when the setting is omitted. Updated the example to omit `terraform_version`.
- The remote operations flow implied applies happen after a standalone `terraform plan` approval. Updated the wording to clarify that `terraform apply` follows the same upload-and-run process and then waits for approval unless auto-approved.

## Review Notes
The local environment did not have the Terraform CLI installed, so CLI flags were verified against official HashiCorp command documentation rather than local `terraform --help` output. The targeted plan, destroy, replace, run trigger, variable, notification, working directory, and `.terraformignore` examples were otherwise consistent with official documentation.
