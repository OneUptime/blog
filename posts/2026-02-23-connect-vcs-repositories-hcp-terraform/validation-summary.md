# Validation Summary: How to Connect VCS Repositories to HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform
- Terraform Enterprise Provider (`hashicorp/tfe`)
- HCP Terraform Workspaces API
- VCS integrations for GitHub, GitLab, Bitbucket, and Azure DevOps

## Sources Consulted
- HCP Terraform VCS provider overview: https://developer.hashicorp.com/terraform/cloud-docs/vcs
- HCP Terraform GitHub.com GitHub App setup: https://developer.hashicorp.com/terraform/cloud-docs/vcs/github-app
- HCP Terraform GitHub Enterprise setup: https://developer.hashicorp.com/terraform/cloud-docs/vcs/github-enterprise
- HCP Terraform GitLab.com setup: https://developer.hashicorp.com/terraform/cloud-docs/vcs/gitlab-com
- HCP Terraform GitLab EE/CE setup: https://developer.hashicorp.com/terraform/cloud-docs/vcs/gitlab-eece
- HCP Terraform Bitbucket Cloud setup: https://developer.hashicorp.com/terraform/cloud-docs/vcs/bitbucket-cloud
- HCP Terraform Azure DevOps Services and Server setup: https://developer.hashicorp.com/terraform/cloud-docs/vcs/azure-devops-services and https://developer.hashicorp.com/terraform/cloud-docs/vcs/azure-devops-server
- HCP Terraform workspace VCS settings and automatic run triggering: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/vcs
- HCP Terraform Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- `hashicorp/tfe` `tfe_workspace` and `tfe_oauth_client` documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace and https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/data-sources/oauth_client

## Issues Found
- The post described pull request plan output as a comment and branch pushes as speculative plans. Updated the workflow description to distinguish normal runs from PR speculative plans and to describe PR feedback as VCS status checks.
- The post implied merging to `main` always applies changes. Updated this to clarify that apply behavior depends on the workspace apply method.
- The post stated that HCP Terraform only runs when files in the workspace working directory change. Updated this to clarify that path-based filtering depends on VCS trigger patterns or prefixes.
- The GitHub.com setup called the GitHub App flow an OAuth flow. Updated the wording to match HashiCorp's current GitHub App setup.
- The GitHub Enterprise callback URL and personal access token guidance was inaccurate for the documented OAuth setup. Updated the callback URL to use the value supplied by HCP Terraform and changed the optional step to SSH keys for SSH-based submodules.
- The Bitbucket Cloud permissions were too low. Updated them to the documented `Account: Write`, `Repositories: Admin`, `Pull Requests: Write`, and `Webhooks: Read and Write` permissions.
- The Azure DevOps setup merged distinct connection types into one vague step. Updated it to distinguish Azure DevOps Services OAuth, Azure DevOps Services PAT, and Azure DevOps Server PAT setup.
- The `hashicorp/tfe` and API examples did not distinguish OAuth-based VCS connections from GitHub App connections. Added a note that GitHub App connections use `github_app_installation_id` instead of `oauth_token_id`.
- Several `tfe_workspace` snippets omitted `organization`, making the examples incomplete unless the provider default organization was configured. Added `organization = var.organization` to those snippets.
- The monorepo section implied working directories alone provide workspace-specific trigger filtering. Updated it to clarify that the behavior applies when path-based VCS triggers are enabled.

## Review Notes
- The remaining HCL examples use current `hashicorp/tfe` resource and data source names and arguments. They are illustrative snippets and assume variables and VCS connections already exist.
- Trigger patterns and tag-based triggers are mutually exclusive in the `vcs_repo`/workspace configuration; the post does not combine them in a single example.
