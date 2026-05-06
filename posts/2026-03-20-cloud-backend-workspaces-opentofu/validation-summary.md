# Validation Summary: How to Configure Cloud Backend Workspaces in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu `cloud` configuration
- HCP Terraform workspaces
- HCP Terraform Workspaces API
- HCP Terraform Variable Sets API
- HCP Terraform Run Triggers API
- HCL
- Bash and `curl`

## Sources Consulted
- OpenTofu: Cloud Configuration - https://opentofu.org/docs/language/settings/tf-cloud/
- OpenTofu: Using the Cloud Backend with OpenTofu CLI - https://opentofu.org/docs/cli/cloud/
- OpenTofu: Cloud Backend Settings - https://opentofu.org/docs/v1.11/cli/cloud/settings/
- OpenTofu: Backend Type `remote` - https://opentofu.org/docs/language/settings/backends/remote/
- OpenTofu: Managing Workspaces - https://opentofu.org/docs/cli/workspaces/
- OpenTofu: `workspace list` command - https://opentofu.org/docs/cli/commands/workspace/list/
- HCP Terraform: Workspaces API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform: Variable sets API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/variable-sets
- HCP Terraform: Run triggers API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run-triggers
- HCP Terraform: Run triggers - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/run-triggers
- HCP Terraform: Manage variables and variable sets - https://developer.hashicorp.com/terraform/cloud-docs/variables/managing-variables
- HCP Terraform: Manage workspace state - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/state
- Terraform: `terraform_remote_state` data source - https://developer.hashicorp.com/terraform/language/state/remote-state-data

## Issues Found
- The OpenTofu `cloud` block examples omitted `hostname`, but the OpenTofu cloud backend documentation requires the hostname to be configured for the target cloud backend. I added `hostname = "app.terraform.io"` to the single-workspace and tag-based examples.
- The tag-based workspace selection section claimed that `tofu init` prompts for workspace selection. That behavior was not supported by the OpenTofu command documentation, so I changed the example to the documented flow using `tofu init`, `tofu workspace list`, `tofu workspace select`, and `TF_WORKSPACE`.
- The workspace creation script used `execution-mode = "local"` for non-production workspaces even though later sections relied on workspace variables, variable sets, and run triggers. HCP Terraform does not evaluate workspace variables or variable sets in local execution mode, so I changed the script to create remote-execution workspaces consistently.
- The workspace creation script used `tag-names` directly in the create-workspace payload. Current HCP Terraform API documentation documents flat string workspace tags through the workspace tags relationship endpoint, so I updated the example to create the workspace first and then attach flat tags with `POST /workspaces/:workspace_id/relationships/tags`.
- The variable set section implied assigning a variable set to workspaces by tag. The documented Variable Sets API applies variable sets to specific workspaces or projects, not to a tag query, so I corrected that wording.
- The run trigger example used the wrong endpoint and payload shape. The documented API creates a run trigger with `POST /workspaces/:workspace_id/run-triggers` and only requires the `sourceable` relationship in the request body. I fixed the snippet accordingly and clarified that the trigger fires after a successful apply.
- The remote state example omitted a required access prerequisite. HCP Terraform requires the source workspace to allow remote state access for the consuming workspace unless broader sharing is enabled, so I added that prerequisite note and made the backend hostname explicit.
- The post referred to Terraform Cloud throughout, while the current product documentation uses HCP Terraform. I updated the descriptive prose to use the current product name where it affected technical context.

## Review Notes
- The updated workspace creation script now uses `jq` to read the workspace ID from the create-workspace API response before attaching flat tags.
- The `terraform_remote_state` example is technically valid, but HCP Terraform documentation recommends the `tfe_outputs` data source as a more secure alternative when consuming outputs from HCP Terraform workspaces.
- Static AWS credentials in variable sets remain supported, but HCP Terraform documentation also recommends considering dynamic provider credentials for stronger security posture.
