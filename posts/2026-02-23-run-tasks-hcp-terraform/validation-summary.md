# Validation Summary: How to Use Run Tasks in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform run tasks
- Terraform Enterprise / HCP Terraform API
- HashiCorp `tfe` Terraform provider
- Terraform HCL
- Python Flask
- Snyk IaC
- Checkov / Bridgecrew
- Infracost

## Sources Consulted
- HashiCorp Developer: HCP Terraform run tasks - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/run-tasks
- HashiCorp Developer: HCP Terraform run tasks API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run-tasks/run-tasks
- HashiCorp Developer: HCP Terraform run tasks integration API - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run-tasks/run-tasks-integration
- HashiCorp Developer: HCP Terraform run states and stages - https://developer.hashicorp.com/terraform/cloud-docs/run/states
- Terraform Registry: `tfe_workspace_run_task` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_run_task
- HashiCorp Developer tutorial: Configure Snyk run task in HCP Terraform - https://developer.hashicorp.com/terraform/tutorials/cloud/cloud-run-tasks-snyk
- Snyk User Docs: Terraform Cloud integration for Snyk IaC using Run Tasks - https://docs.snyk.io/scm-ide-and-ci-cd-integrations/snyk-ci-cd-integrations/terraform-cloud-integration-for-snyk-iac-using-run-tasks/set-up-the-terraform-cloud-integration-for-iac
- Infracost Docs: HCP Terraform integration - https://www.infracost.io/docs/integrations/hcp-terraform/

## Issues Found
- The introduction described run tasks as always sending plan data and returning a "pass, fail, or advisory result." Updated it to describe stage-based run data and the valid callback statuses: `passed`, `failed`, and `running`. Advisory and mandatory are enforcement levels, not result statuses.
- The lifecycle described only post-plan behavior and omitted post-apply. Updated the lifecycle and phase list to include stage-specific triggering and the `post_apply` stage.
- The `tfe_workspace_run_task` examples used the deprecated singular `stage` argument. Updated all examples to use `stages = ["post_plan"]`, which matches the current `tfe` provider documentation.
- The API create-run-task example omitted the required `category` attribute. Added `"category": "task"`.
- The Snyk example hard-coded an endpoint URL. Current Snyk and HashiCorp guidance says Snyk provides the endpoint URL and HMAC key from the integration settings. Replaced the hard-coded URL with `var.snyk_endpoint_url`.
- The Infracost example hard-coded an outdated-looking endpoint. Current Infracost docs describe a generated endpoint URL. Replaced it with `var.infracost_endpoint_url`.

## Review Notes
The custom Flask callback example matches the HCP Terraform integration API shape at a minimal level, including HMAC verification, callback URL usage, bearer token usage, and valid task result statuses. In a production handler, the callback response should be checked for errors and long-running scans should send `running` updates before the 10-minute progress timeout.
