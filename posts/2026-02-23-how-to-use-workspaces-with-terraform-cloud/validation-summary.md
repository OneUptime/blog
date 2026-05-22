# Validation Summary: How to Use Workspaces with Terraform Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform Cloud / HCP Terraform workspaces
- Terraform `cloud` block
- HCP Terraform remote, local, and agent execution modes
- HCP Terraform VCS-driven workflows and speculative plans
- HCP Terraform workspace variables and variable sets
- HashiCorp `tfe` Terraform provider
- HCP Terraform run triggers and team access controls

## Sources Consulted
- HashiCorp Terraform `cloud` block reference: https://developer.hashicorp.com/terraform/language/block/terraform#cloud
- HashiCorp Terraform CLI workspace documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- HCP Terraform workspace overview: https://developer.hashicorp.com/terraform/cloud-docs/workspaces
- HCP Terraform workspace settings and execution modes: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HCP Terraform CLI-driven run workflow: https://developer.hashicorp.com/terraform/cloud-docs/run/cli
- HCP Terraform run modes and speculative plans: https://developer.hashicorp.com/terraform/cloud-docs/run/modes-and-options
- HCP Terraform VCS settings and automatic run triggering: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/vcs
- HCP Terraform run triggers tutorial: https://developer.hashicorp.com/terraform/tutorials/cloud/cloud-run-triggers
- HCP Terraform workspace variables API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HashiCorp `tfe` provider `tfe_workspace` resource docs: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- HashiCorp `tfe` provider `tfe_variable` resource docs: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable
- HashiCorp `tfe` provider `tfe_variable_set` resource docs: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable_set
- HashiCorp `tfe` provider `tfe_workspace_variable_set` resource docs: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_variable_set
- HashiCorp `tfe` provider `tfe_run_trigger` resource docs: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/run_trigger
- HashiCorp `tfe` provider `tfe_team_access` resource docs: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_access

## Issues Found
- The post said Terraform Cloud workspaces replace CLI workspaces entirely and that `terraform workspace select` is not used. This is only true for a single named workspace in the `cloud` block. I updated the text to explain that tag-based `cloud` workspace selection can still use Terraform CLI workspace commands to select among matching HCP Terraform workspaces.
- The `tfe_workspace` example referenced `tfe_project.application.id` without declaring the project. I added a minimal `tfe_project` resource so the example is internally complete.
- The VCS example set `working_directory = "terraform/app"` but only listed `terraform/modules/` in `trigger_prefixes`, which could prevent app directory changes from triggering runs when trigger filtering is configured. I added `terraform/app/` to the prefixes.
- The VCS workflow steps described a feature branch push as creating a speculative plan. HCP Terraform creates automatic speculative plans for pull requests or merge requests against the tracked branch when that feature is enabled. I corrected the wording.
- The run trigger section described downstream workspaces as doing `plan + apply` automatically. HCP Terraform run triggers queue downstream runs after a successful source apply; downstream applies require manual confirmation unless run-trigger auto-apply is enabled. I corrected the wording and diagram.
- The local execution mode example omitted an important caveat: HCP Terraform workspace variables and variable sets are not evaluated in local execution mode. I added this note.

## Review Notes
Terraform CLI was not installed in the local environment, so command behavior was verified against official HashiCorp documentation instead of local `terraform --help` output. The post still uses the Terraform Cloud name; HashiCorp's current documentation commonly uses HCP Terraform, but the underlying feature references remain technically valid.
