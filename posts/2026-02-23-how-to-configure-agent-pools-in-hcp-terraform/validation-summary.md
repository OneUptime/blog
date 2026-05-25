# Validation Summary: How to Configure Agent Pools in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform
- Terraform Cloud / Terraform Enterprise provider (`hashicorp/tfe`)
- HCP Terraform agent pools and agent tokens
- HCP Terraform API
- Docker and Docker Compose
- systemd

## Sources Consulted
- HashiCorp Developer: HCP Terraform Agents - https://developer.hashicorp.com/terraform/cloud-docs/agents
- HashiCorp Developer: Install and run HCP Terraform agents - https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- HashiCorp Developer: HCP Terraform agent requirements - https://developer.hashicorp.com/terraform/cloud-docs/agents/requirements
- HashiCorp Developer: Manage HCP Terraform agent pools - https://developer.hashicorp.com/terraform/cloud-docs/agents/agent-pools
- HashiCorp Developer: Agents and agent pools API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/agents
- HashiCorp Developer: Agent token API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/agent-tokens
- HashiCorp Developer: Workspaces API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- Terraform Registry: `tfe_agent_pool` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/agent_pool
- Terraform Registry: `tfe_agent_token` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/agent_token
- Terraform Registry: `tfe_agent_pool_allowed_workspaces` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/agent_pool_allowed_workspaces
- Terraform Registry: `tfe_workspace_settings` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_settings
- HashiCorp releases: `tfc-agent` versions - https://releases.hashicorp.com/tfc-agent/

## Issues Found
- The prerequisites incorrectly stated that agents require the Business tier and are unavailable on Free or Teams plans. Updated this to require enough self-hosted agent capacity, because current HCP Terraform documentation states that agent availability depends on plan capacity and that Free includes one self-hosted agent.
- The networking guidance stated that only outbound HTTPS to `app.terraform.io:443` is required. Updated it to include other documented outbound services that agents and Terraform runs may need, including `registry.terraform.io`, `releases.hashicorp.com`, `archivist.terraform.io`, provider APIs, and private managed endpoints.
- The systemd binary installation commands downloaded a zip archive to `/usr/local/bin/tfc-agent` and then tried to unzip that same path, which could leave the archive and binary paths confused. Updated the example to download to `/tmp/tfc-agent.zip`, unzip both required binaries into `/usr/local/bin`, and mark `tfc-agent` and `tfc-agent-core` executable.
- The systemd service used `User=tfc-agent` and `Group=tfc-agent` without creating that account. Added an idempotent `useradd` command before the service definition.
- The binary download example pinned the old `tfc-agent` version `1.15.0`. Updated it to `1.28.10`, the latest release listed by HashiCorp releases at validation time.

## Review Notes
The remaining API paths, JSON API payload types, TFE provider resource names and arguments, Docker image name, agent token behavior, agent pool scoping, workspace assignment, and one-run-per-agent concurrency claim match current official documentation. The Docker Compose `deploy.resources` block is valid Compose syntax, but resource-limit behavior can vary by Docker Compose implementation and deployment mode.
