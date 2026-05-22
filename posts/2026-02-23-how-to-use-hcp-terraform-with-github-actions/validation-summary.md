# Validation Summary: How to Use HCP Terraform with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- HCP Terraform / Terraform Cloud
- HCP Terraform API
- GitHub Actions
- HashiCorp setup-terraform GitHub Action
- HashiCorp tfc-workflows-github actions
- Terraform Enterprise provider (`tfe`)

## Sources Consulted
- HashiCorp setup-terraform GitHub Action README: https://github.com/hashicorp/setup-terraform
- HCP Terraform `cloud` block documentation: https://developer.hashicorp.com/terraform/language/block/terraform#cloud
- HCP Terraform configuration versions API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/configuration-versions
- HCP Terraform runs API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HashiCorp tfc-workflows-github README and action metadata: https://github.com/hashicorp/tfc-workflows-github
- Terraform Enterprise provider `tfe_team_access` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_access
- HCP Terraform API token documentation: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/api-tokens

## Issues Found
- The integration approaches section said there were two approaches while the post separately described CLI-driven and API-driven workflows. Updated it to list VCS-driven, CLI-driven, and API-driven workflows distinctly.
- The `setup-terraform` examples used `@v3` and Terraform `1.7.0`. Updated examples to `hashicorp/setup-terraform@v4` and Terraform `1.14.6`, matching current official action documentation.
- The API-driven workflow created a run but did not confirm/apply it when the run paused after planning. Added an apply confirmation call for applyable paused states while preserving the no-change final state.
- The multi-environment workflow used `TF_WORKSPACE` as if it would override a hardcoded `cloud.workspaces.name`. Added the required caveat and moved `TF_WORKSPACE` to job-level environment variables so both `init` and subsequent Terraform commands use the same workspace selection.
- The multi-environment workflow masked `terraform plan -detailed-exitcode` errors because `continue-on-error` was set but exit code `1` was not failed afterward. Added explicit plan status checks.
- The production plan job depended only on the staging apply job, so it would be skipped when staging had no changes. Updated dependencies and condition so production planning still runs after a successful no-change staging plan.
- The official HCP Terraform action example used `@v1.3.0` and referenced a non-existent `has_changes` output from `create-run`. Updated to `@v1.3.2` and removed the invalid condition; the current `apply-run` action supports a no-op result.
- The `tfe_team_access` custom permissions block was missing current required fields. Added `sentinel_mocks` and `run_tasks`.

## Review Notes
Local validation with `terraform` was not possible because Terraform CLI is not installed in this workspace. Local YAML parsing with Ruby was also unavailable. The review was performed against current official HashiCorp and GitHub-hosted action documentation.
