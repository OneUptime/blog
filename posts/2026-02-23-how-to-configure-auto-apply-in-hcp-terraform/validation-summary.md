# Validation Summary: How to Configure Auto-Apply in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform
- Terraform Cloud / Terraform Enterprise API
- HashiCorp `tfe` Terraform provider
- Sentinel policies
- Open Policy Agent (OPA) / Rego
- HCP Terraform run tasks and notifications
- Bash, curl, and jq

## Sources Consulted
- HCP Terraform run modes and options: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/modes-and-options
- HCP Terraform Runs API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform CLI-driven remote run workflow: https://developer.hashicorp.com/terraform/cloud-docs/run/cli
- HCP Terraform run triggers tutorial: https://developer.hashicorp.com/terraform/tutorials/cloud/cloud-run-triggers
- HashiCorp `tfe_workspace` provider documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- HashiCorp `tfe_workspace_run_task` provider documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_run_task
- HashiCorp `tfe_organization_run_task` provider documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/organization_run_task
- HashiCorp `tfe_notification_configuration` provider documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/notification_configuration
- HCP Terraform Sentinel `tfrun` import reference: https://developer.hashicorp.com/terraform/enterprise/policy-enforcement/import-reference/tfrun
- HCP Terraform Sentinel `tfplan/v2` import reference: https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/import-reference/tfplan-v2
- HCP Terraform OPA policy documentation: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/define-policies/opa
- Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec

## Issues Found
- The run-trigger description said auto-apply runs could be triggered via CLI in the same flow as VCS and API runs. Updated the workflow step to mention VCS and API calls only, matching HCP Terraform documentation that auto-apply immediately applies successful VCS/API workflow runs, while CLI-driven `terraform apply` has its own approval behavior unless using CLI flags such as `-auto-approve`.
- The `tfe_workspace` examples used `execution_mode = "remote"`, which is deprecated on the current `tfe_workspace` resource. Removed those lines because remote execution is not required to demonstrate the `auto_apply` and `auto_apply_run_trigger` settings.
- The `tfe_workspace_run_task` example used the deprecated singular `stage` argument. Updated it to `stages = ["post_plan"]`, matching the current provider schema.

## Review Notes
The `tfe_notification_configuration` example uses the supported `url` argument. Current provider documentation recommends the write-only `url_wo` alternative for Terraform 1.11.0 or later to avoid storing sensitive webhook URLs in state, but `url` remains valid.
