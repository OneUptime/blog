# Validation Summary: How to Use HCP Terraform Agents for Private Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform agents
- Terraform Cloud / HCP Terraform remote execution
- Terraform Enterprise Provider (`tfe`)
- Docker and Docker Compose
- Terraform agent hooks
- HCP Terraform API
- AWS CLI, kubectl, Ansible, Vault, and jq usage in agent environments

## Sources Consulted
- HashiCorp Developer: Install and run HCP Terraform agents - https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- HashiCorp Developer: HCP Terraform agent requirements - https://developer.hashicorp.com/terraform/cloud-docs/agents/requirements
- HashiCorp Developer: HCP Terraform agent hooks - https://developer.hashicorp.com/terraform/cloud-docs/agents/hooks
- HashiCorp Developer: Manage HCP Terraform agent pools - https://developer.hashicorp.com/terraform/cloud-docs/agents/agent-pools
- HashiCorp Developer: Agent token API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/agent-tokens
- Terraform Registry: `tfe_agent_pool` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/agent_pool
- Terraform Registry: `tfe_workspace_settings` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_settings
- Terraform Registry: `tfe_agent_pool_allowed_workspaces` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/agent_pool_allowed_workspaces
- Terraform Registry: `tfe_workspace` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- Kubernetes documentation: Install tools / kubectl on Linux - https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- AWS documentation: Install or update to the latest version of the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

## Issues Found
- The network requirements listed only `app.terraform.io`. HashiCorp's requirements also list `registry.terraform.io`, `releases.hashicorp.com`, `archivist.terraform.io`, and optional `agents.terraform.io:7146` for request forwarding and hold-your-own-key features. Updated the network requirements and architecture wording accordingly.
- The post said Terraform is "handled" by the agent. Updated this to clarify that the agent downloads the required Terraform binary.
- The agent hook examples used hook filenames such as `pre-plan` and `pre-apply` and mounted them under `/etc/tfc-agent/hooks`. HashiCorp documents hook files as `terraform-pre-plan`, `terraform-pre-apply`, etc., under the agent data directory's `hooks` subdirectory. Updated the example to use the documented filenames and Docker image pattern.
- The `pre-plan` hook exported variables directly, which would not make those values available to subsequent Terraform commands. HashiCorp requires hooks to write `KEY=value` lines to the file referenced by `$TFC_AGENT_ENV`. Updated the hook to append Vault-derived values to `$TFC_AGENT_ENV`.
- The TFE provider workspace example set `execution_mode` and `agent_pool_id` directly on `tfe_workspace`, which the current provider deprecates in favor of `tfe_workspace_settings`. Updated the example to use `tfe_workspace_settings` and added `tfe_agent_pool_allowed_workspaces` for the restricted production pool.

## Review Notes
- The Docker Compose `deploy.resources` limits are commonly used for Swarm deployments and may be ignored by some non-Swarm Compose workflows. The example remains plausible as an illustrative deployment, but a future edit could clarify the runtime target.
