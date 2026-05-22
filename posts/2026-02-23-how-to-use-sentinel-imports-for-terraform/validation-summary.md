# Validation Summary: How to Use Sentinel Imports for Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Enterprise policy enforcement
- Sentinel policy language
- Sentinel Terraform imports: `tfplan/v2`, `tfconfig/v2`, `tfstate/v2`, and `tfrun`

## Sources Consulted
- HashiCorp Developer: tfplan/v2 Sentinel import: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Developer: tfconfig/v2 Sentinel import: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfconfig-v2
- HashiCorp Developer: tfstate/v2 Sentinel import: https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/import-reference/tfstate-v2
- HashiCorp Developer: tfrun Sentinel import: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfrun
- HashiCorp Developer: Sentinel Terraform feature: https://developer.hashicorp.com/sentinel/docs/features/terraform
- HashiCorp Developer: Sentinel language conditionals: https://developer.hashicorp.com/sentinel/docs/language/conditionals
- HashiCorp Developer: Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec

## Issues Found
- The Sentinel code blocks were marked as `python`. Changed them to `sentinel` so the examples are identified as Sentinel policies rather than Python code.
- The `tfrun` example used `tfrun.source`, which is not part of the current documented `tfrun` schema. Replaced the example with a documented `tfrun.is_destroy` check and updated the property list to use `tfrun.created_by`.
- The cost estimation example used `tfrun.cost_estimation.proposed_monthly_cost`, but the documented namespace is `tfrun.cost_estimate`. Updated the example and property list.
- Two examples used `if` statements inside `rule` expressions. Sentinel rules contain a single expression, and conditional statements are only valid outside rule expressions. Rewrote those examples as boolean expressions.
- The import versioning note claimed that `tfrun` is unversioned because its structure has remained stable. Removed the unsupported reason and kept the accurate statement that `tfrun` has no version suffix.

## Review Notes
The remaining import descriptions and documented fields align with HashiCorp's current import references. The examples use `contains` to match action lists, which is valid Sentinel syntax and intentionally includes replacement operations; HashiCorp's docs recommend exact list comparison when a policy must distinguish only exact create, update, or delete operations.
