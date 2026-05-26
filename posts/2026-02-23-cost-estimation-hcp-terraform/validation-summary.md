# Validation Summary: How to Use Cost Estimation in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform
- Terraform Enterprise / HCP Terraform API
- Terraform `tfe` provider
- Sentinel policy language
- Open Policy Agent (OPA)
- Rego
- AWS, Azure, and GCP cost estimation
- Bash, curl, and jq

## Sources Consulted
- HashiCorp Developer: Cost estimation overview - https://developer.hashicorp.com/terraform/enterprise/workspaces/cost-estimation
- HashiCorp Developer: Cost estimates API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/cost-estimates
- HashiCorp Developer: Runs API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HashiCorp Developer: tfrun Sentinel import reference - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfrun
- HashiCorp Developer: Define OPA policies for HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/define-policies/opa
- HashiCorp Developer: View policy enforcement results - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/view-results
- HashiCorp Developer: Run modes and options - https://developer.hashicorp.com/terraform/cloud-docs/run/modes-and-options
- HashiCorp Developer: Organization settings reference - https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/organizations/settings
- Terraform Registry: `tfe_organization` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/organization
- Sentinel language specification - https://developer.hashicorp.com/sentinel/docs/language/spec

## Issues Found
- The post stated cost estimation is available on Team and Business tiers. Those are legacy plan names, and current HashiCorp documentation describes cost estimation as an organization setting that is disabled by default. I changed the wording to avoid outdated tier names.
- The API examples used `GET /runs/:run_id/cost-estimate`, which is not the documented Cost Estimates API. I updated the examples to get the cost estimate ID from the run relationship and then call `GET /cost-estimates/:id`.
- The cost estimate API response example used a single `data` object, while the official sample response uses a `data` array. I updated the example and the reporting script's `jq` path accordingly.
- The Sentinel examples compared `tfrun.cost_estimate.delta_monthly_cost` directly as a number, but the `tfrun` import exposes cost values as strings. I updated the policies to use the `decimal` import and decimal comparison methods.
- The Sentinel code blocks were labeled as Python. I changed the code fence language to `sentinel`.
- The tiered Sentinel example imported `tfconfig/v2` but did not use it. I replaced it with the `decimal` import needed for cost comparisons.
- The OPA example attempted to read cost estimate data from `input.run`, but HCP Terraform evaluates OPA policies before cost estimation. I replaced the example with a note that OPA cannot directly enforce cost estimate data in HCP Terraform and that Sentinel should be used for `tfrun.cost_estimate` policies.
- The PR workflow section said the PR status check includes cost information. Current documentation describes VCS checks as linking to HCP Terraform run details, so I changed this to say reviewers can inspect cost information through the linked run.

## Review Notes
The supported-resource lists in the post are intentionally high level. HashiCorp documents supported AWS, Azure, and GCP resources in separate provider-specific pages, and support varies by resource and attribute values.
