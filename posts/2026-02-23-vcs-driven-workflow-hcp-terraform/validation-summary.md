# Validation Summary: How to Configure VCS-Driven Workflow in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform
- Terraform Enterprise Provider (`hashicorp/tfe`)
- Version control system integrations
- GitHub and GitLab merge protections

## Sources Consulted
- HCP Terraform UI and VCS-driven run workflow: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/ui
- HCP Terraform run modes and speculative plans: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/modes-and-options
- HCP Terraform workspace settings: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HCP Terraform VCS connection settings and automatic run triggering: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/vcs
- HCP Terraform workspaces and health assessments: https://developer.hashicorp.com/terraform/cloud-docs/workspaces
- Terraform state locking: https://developer.hashicorp.com/terraform/language/state/locking
- `hashicorp/tfe` `tfe_workspace` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- `hashicorp/tfe` `tfe_run_trigger` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/run_trigger
- `hashicorp/tfe` `tfe_workspace_settings` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_settings
- GitHub protected branch and required status check documentation: https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
- GitLab merge checks documentation: https://docs.gitlab.com/user/project/merge_requests/auto_merge/

## Issues Found
- `queue_all_runs` was described as a setting that skips intermediate commits and only processes the latest commit. The `hashicorp/tfe` provider and HCP Terraform API document it as controlling whether VCS-driven runs begin automatically immediately after workspace creation. Updated the comment and explanation to describe the initial-run behavior.
- `trigger_patterns` was described as the only thing preventing every commit on the branch from triggering a run. HCP Terraform also applies default run trigger filtering when a VCS-backed workspace has a working directory. Updated the explanation and best practice to clarify that trigger patterns are primarily needed to include shared module paths or tune monorepo filtering.

## Review Notes
- The remaining Terraform and `hashicorp/tfe` snippets use current resource names and arguments. The examples are illustrative and reference data sources, variables, and workspaces that would need to exist in a complete configuration.
- Health assessments may require an eligible HCP Terraform edition and workspace settings, and can also be managed with `tfe_workspace_settings`; the existing `tfe_workspace` attribute is still documented.
