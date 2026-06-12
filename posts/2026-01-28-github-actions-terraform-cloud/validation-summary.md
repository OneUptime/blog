# Validation Summary: How to Use GitHub Actions with Terraform Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Terraform CLI
- Terraform Cloud / HCP Terraform
- Terraform remote runs and remote state
- Sentinel and Open Policy Agent policy enforcement

## Sources Consulted
- HashiCorp Developer: Automate Terraform with GitHub Actions - https://developer.hashicorp.com/terraform/tutorials/automation/github-actions
- HashiCorp Developer: Use HCP Terraform with the Terraform CLI - https://developer.hashicorp.com/terraform/cli/cloud
- HashiCorp Developer: The CLI-driven remote run workflow for HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/cli
- HashiCorp Developer: Remote operations in HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/remote-operations
- HashiCorp Developer: Manage API tokens for HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/api-tokens
- HashiCorp Developer: Policies API reference for HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/policies
- HashiCorp setup-terraform action README - https://github.com/hashicorp/setup-terraform
- Terraform CLI apply command reference - https://developer.hashicorp.com/terraform/cli/commands/apply

## Issues Found
- The post said to set a VCS provider or use API-driven runs while the example workflow runs `terraform apply` from GitHub Actions. HCP Terraform does not support CLI remote applies for VCS-linked workspaces because the VCS repository is the source of truth. Updated the workspace guidance to use a CLI-driven or API-driven workspace when GitHub Actions will run `terraform apply`.
- The post referred to the "Terraform Cloud CLI." HashiCorp documents this as the Terraform CLI integration with HCP Terraform/Terraform Cloud, not as a separate Terraform Cloud CLI. Updated the heading and explanation.
- The token guidance used a personal user token as the only path. User tokens can work if permissions allow them, but HashiCorp's GitHub Actions guidance recommends a team token for CI and workspace permissions for plan/apply. Updated the wording to prefer a CI team token or an appropriately permissioned user token.
- The workflow used `terraform apply -auto-approve tfplan`. Terraform accepts saved plan mode, but the CLI documentation states `-auto-approve` is ignored when a saved plan file is passed because passing the plan file is considered approval. Updated the command to `terraform apply tfplan`.

## Review Notes
- The example uses Terraform CLI `1.6.6`. Saved plan runs from the CLI with HCP Terraform require Terraform CLI `1.6.0` or newer, so the version is compatible. Future updates could use a newer pinned Terraform version after testing.
- HashiCorp documentation now generally refers to Terraform Cloud as HCP Terraform. The post's terminology remains understandable, but future editorial updates may want to align naming with current HashiCorp docs.
