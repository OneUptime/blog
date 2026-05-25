# Validation Summary: How to Configure Custom Worker Pools in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform
- HCP Terraform agents and agent pools
- HCP Terraform API
- Docker
- Kubernetes
- systemd
- curl and jq

## Sources Consulted
- HCP Terraform agent pools documentation: https://developer.hashicorp.com/terraform/cloud-docs/agents/agent-pools
- HCP Terraform install and run agents documentation: https://developer.hashicorp.com/terraform/cloud-docs/agents/agents
- HCP Terraform agent requirements documentation: https://developer.hashicorp.com/terraform/cloud-docs/agents/requirements
- HCP Terraform agents and agent pools API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/agents
- HCP Terraform agent token API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/agent-tokens
- HCP Terraform workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform workspace settings documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HCP Terraform agent changelog: https://developer.hashicorp.com/terraform/cloud-docs/agents/changelog
- HashiCorp tfc-agent releases: https://releases.hashicorp.com/tfc-agent/

## Issues Found
- The binary installation example pinned `tfc-agent` 1.15.0, which is outdated. Updated the example to 1.28.8, the latest release listed by HashiCorp at validation time.
- The Docker section created a custom image but then ran `hashicorp/tfc-agent:latest`, so the installed tools would not be present in the running container. Added a `docker build` command and changed the run command to use the custom image.
- The Dockerfile installed AWS CLI with `pip3 install awscli`, which is fragile on current Debian/Ubuntu-based images because system Python environments may reject global pip installs. Changed it to install `awscli` with `apt-get`.
- The agent status list omitted current documented statuses. Added `errored` and `exited` to match HashiCorp's agent status documentation and API behavior.

## Review Notes
- The API endpoint paths, JSON API payload structure, workspace `execution-mode: "agent"`, `agent-pool-id`, agent token creation, agent environment variables, and Kubernetes environment variable usage were consistent with current HashiCorp documentation.
- HCP Terraform's official documentation now recommends the HCP Terraform Operator for Kubernetes for managing and automatically scaling agents on Kubernetes. The Deployment example remains technically valid as a direct container deployment pattern, but using the operator would be preferable for a production-focused future revision.
