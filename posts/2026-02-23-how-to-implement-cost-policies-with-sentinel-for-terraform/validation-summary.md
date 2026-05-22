# Validation Summary: How to Implement Cost Policies with Sentinel for Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform / Terraform Enterprise policy enforcement
- Sentinel policy language
- Terraform `tfplan/v2` and `tfrun` Sentinel imports
- Terraform Enterprise (`tfe`) provider resources
- Terraform policy sets and Sentinel policy parameters
- AWS resource attributes for EC2, EBS, RDS, and tagging

## Sources Consulted
- HashiCorp Sentinel Terraform integration: https://developer.hashicorp.com/sentinel/docs/terraform
- HCP Terraform policy sets and enforcement levels: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/manage-policy-sets
- HCP Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- HCP Terraform `tfrun` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/sentinel/import/tfrun
- Terraform Enterprise cost estimation and Sentinel policies: https://developer.hashicorp.com/terraform/enterprise/cost-estimation
- Sentinel language built-in `append` function: https://developer.hashicorp.com/sentinel/docs/functions/append
- Sentinel language loops and set operators: https://developer.hashicorp.com/sentinel/docs/language/loops
- Sentinel `decimal` import: https://developer.hashicorp.com/sentinel/docs/imports/decimal
- Terraform `tfe_policy_set` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/policy_set
- Terraform `tfe_sentinel_policy` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/sentinel_policy
- Terraform `tfe_policy_set_parameter` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/policy_set_parameter

## Issues Found
- The Sentinel examples were labeled as `python` code blocks. Changed them to `sentinel` so the snippets are correctly identified as Sentinel policy code.
- The instance type policy imported `strings` but did not use it. Removed the unused import to keep the policy accurate and minimal.
- The cost threshold policy used strict `less_than` comparisons, which would fail when the cost increase or total cost exactly matched the configured maximum. Changed these to `less_than_or_equals` to match the stated "maximum" threshold behavior and HashiCorp's cost-estimation policy example.
- The storage encryption section claimed unencrypted storage often misses cheaper storage tiers that require encryption. Replaced that with a compliance and cost-allocation statement because the original claim is not generally true for AWS storage services.
- The deployment snippet created individual `tfe_sentinel_policy` resources but did not attach them to the `tfe_policy_set`. Added `policy_ids` to the policy set.
- The deployment snippet set `global = false` while also setting `workspace_ids`. The `tfe_policy_set` resource documents these arguments as mutually exclusive, so `global = false` was removed.
- The deployment snippet omitted the encryption policy from the managed policies even though the post defined it. Added a `tfe_sentinel_policy.require_encryption` resource and included it in `policy_ids`.
- The post described cost-estimate policies without noting the current HCP Terraform distinction between policy checks and policy evaluations. Added that policies using cost estimates must run as standard Sentinel policy checks because policy evaluations cannot access cost estimation data.
- Updated technical references from "Terraform Cloud" to "HCP Terraform" where appropriate, with the first occurrence noting that Terraform Cloud is the former name.

## Review Notes
Local `sentinel` and `terraform` binaries were not installed in the workspace, so validation was performed against official HashiCorp documentation rather than by executing the snippets locally. The policies are illustrative and still assume AWS provider schemas where these resources expose `tags`, `encrypted`, `storage_encrypted`, and `instance_type` attributes in the Terraform plan.
