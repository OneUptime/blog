# Validation Summary: How to Configure Workspace Execution Mode in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Cloud
- HCP Terraform workspaces
- HCP Terraform agents and agent pools
- TFE Terraform provider
- HCP Terraform API
- AWS dynamic provider credentials

## Sources Consulted
- HashiCorp Developer: HCP Terraform workspace settings, execution modes, and local execution behavior: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HashiCorp Developer: HCP Terraform workspaces overview and remote operations behavior: https://developer.hashicorp.com/terraform/cloud-docs/workspaces
- HashiCorp Developer: HCP Terraform remote operations and local execution mode: https://developer.hashicorp.com/terraform/cloud-docs/run/remote-operations
- HashiCorp Developer: HCP Terraform workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HashiCorp Developer: HCP Terraform workspace variables API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HashiCorp Developer: HCP Terraform agents overview: https://developer.hashicorp.com/terraform/cloud-docs/agents
- HashiCorp Developer: Manage HCP Terraform agent pools: https://developer.hashicorp.com/terraform/cloud-docs/agents/agent-pools
- HashiCorp Developer: Install and run HCP Terraform agents: https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- HashiCorp Developer: HCP Terraform agent requirements: https://developer.hashicorp.com/terraform/cloud-docs/agents/requirements
- Terraform Registry: hashicorp/tfe `tfe_workspace` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- Terraform Registry: hashicorp/tfe `tfe_workspace_settings` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_settings
- HashiCorp Developer: AWS dynamic provider credentials for Terraform Enterprise / HCP Terraform: https://developer.hashicorp.com/terraform/enterprise/dynamic-provider-credentials/aws-configuration
- HashiCorp Developer: Terraform `cloud` block reference: https://developer.hashicorp.com/terraform/language/terraform

## Issues Found
- The TFE provider examples used `execution_mode` and `agent_pool_id` directly on `tfe_workspace`. These arguments are deprecated in the current TFE provider documentation, so the examples were updated to create workspaces with `tfe_workspace` and manage execution mode / agent pool selection with `tfe_workspace_settings`.
- The post said HCP Terraform agents are available on the Business tier. Current HashiCorp documentation says agent availability depends on the HCP Terraform plan, and other official docs note that Free Edition includes one self-hosted agent. The claim was changed to plan-dependent availability.
- The post stated that agent-mode credentials stay within your network. Agent execution can keep credentials in your network when credentials are supplied from the agent environment, but workspace variables can also be used. The wording was changed to "can stay within your network" and the credential table now mentions both workspace environment variables and agent host environment.
- The post said execution mode can be switched at any time. Official docs warn that changing execution mode after a run has already been planned causes that run to error during apply. The switching section was updated to include that caveat.

## Review Notes
- The HCP Terraform API examples use current `execution-mode` and `agent-pool-id` JSON:API attribute names.
- The AWS dynamic credentials variable names `TFC_AWS_PROVIDER_AUTH` and `TFC_AWS_RUN_ROLE_ARN` match current HashiCorp documentation.
- The local execution description is accurate: the workspace stores state, while Terraform operations run wherever the CLI is invoked, and HCP Terraform does not evaluate workspace variables or variable sets in local execution mode.
