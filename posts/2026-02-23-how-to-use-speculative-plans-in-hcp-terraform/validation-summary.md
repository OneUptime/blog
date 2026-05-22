# Validation Summary: How to Use Speculative Plans in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform
- Terraform Cloud / Terraform Enterprise APIs
- hashicorp/tfe Terraform provider
- VCS-driven Terraform workflows
- Sentinel policy checks
- GitHub pull request status checks

## Sources Consulted
- HCP Terraform run modes and options: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/modes-and-options
- HCP Terraform workspace VCS settings: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/vcs
- HCP Terraform overview and CLI integration notes: https://developer.hashicorp.com/terraform/cloud-docs/overview
- HCP Terraform configuration versions API: https://developer.hashicorp.com/terraform/enterprise/api-docs/configuration-versions
- HCP Terraform runs API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- hashicorp/tfe provider tfe_workspace resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- HCP Terraform tfplan/v2 Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2

## Issues Found
- The post stated that speculative plans do not create a new run in workspace history. HCP Terraform documentation says plan-only runs can be found in the workspace run list, so this was corrected to say they appear as plan-only runs.
- The post said speculative plan results may appear as a comment or status check on the pull request. Official HCP Terraform documentation describes pull request checks, so the wording was narrowed to status checks.
- The pull request example appended only an `aws_elasticache_cluster` resource while the shown plan output claimed both an ElastiCache subnet group and cluster would be created. The example was updated to include the subnet group resource.
- The subnet IDs in the sample plan used non-hex characters. They were replaced with valid-looking AWS subnet ID placeholders.
- The troubleshooting section said speculative plans wait for active runs to complete. HCP Terraform documentation says plan-only runs ignore the per-workspace run queue and can proceed while another run is in progress, so the troubleshooting note was corrected.

## Review Notes
The API example follows the documented configuration-version workflow for speculative runs by setting `speculative` to `true` and `auto-queue-runs` to `false`, then creating a run with the uploaded configuration version. The post uses HCP Terraform naming while some official API pages still include Terraform Enterprise paths or legacy Terraform Cloud terminology; the documented API behavior is the same for the covered endpoints.
