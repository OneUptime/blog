# Validation Summary: How to Use Policy Enforcement in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform policy enforcement
- Terraform Enterprise/HCP Terraform `tfe` provider
- Sentinel policy language and `tfplan/v2` import
- Open Policy Agent (OPA)
- Rego
- Terraform HCL

## Sources Consulted
- HCP Terraform policy enforcement overview: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement
- HCP Terraform policy set management and enforcement levels: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/manage-policy-sets
- HCP Terraform run states and policy stages: https://developer.hashicorp.com/terraform/cloud-docs/run/states
- HCP Terraform OPA policy definition and input schema: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/define-policies/opa
- HCP Terraform OPA VCS policy set configuration: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/opa-vcs
- Terraform Registry `tfe_policy_set` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/policy_set
- Terraform Registry `tfe_oauth_client` data source documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/data-sources/oauth_client
- Sentinel Terraform integration documentation: https://developer.hashicorp.com/sentinel/docs/terraform
- Sentinel `tfplan/v2` import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- Sentinel language specification and built-in functions: https://developer.hashicorp.com/sentinel/docs/language/spec
- Open Policy Agent Rego policy language documentation: https://www.openpolicyagent.org/docs/policy-language

## Issues Found
- The run-order explanation treated policy checks as a single stage after cost estimation. HCP Terraform evaluates OPA policy sets after a successful plan and before cost estimation, while Sentinel policy checks that use cost estimation run after cost estimation. Updated the text and flow diagram to distinguish OPA policy evaluations from Sentinel policy checks.
- The enforcement-level explanation listed Sentinel enforcement levels as if they applied to both Sentinel and OPA. Updated the text to identify Sentinel's `hard-mandatory`, `soft-mandatory`, and `advisory` levels separately from OPA's `mandatory` and `advisory` levels.
- The Sentinel encryption example declared an `s3_buckets` collection and described checking S3 public access, but the policy never used that collection and the example was about encryption. Removed the unused S3 block and narrowed the description to RDS and EBS encryption.
- The Sentinel examples were fenced as `python` even though the snippets use Sentinel syntax. Updated the code fences to `sentinel`.

## Review Notes
The local environment did not include the `opa` or `sentinel` CLIs, so syntax validation was performed against official documentation rather than local parser execution. The OPA examples use the policy shape shown in current HCP Terraform documentation, where policy queries return a collection that is empty when the policy passes.
