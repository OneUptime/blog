# Validation Summary: How to Use the tfrun Import in Sentinel

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCP Terraform
- Terraform Enterprise
- Sentinel
- Terraform Sentinel imports
- Policy as Code

## Sources Consulted
- HashiCorp Developer: tfrun Sentinel import reference - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfrun
- HashiCorp Developer: Sentinel language rules - https://developer.hashicorp.com/sentinel/docs/language/rules
- HashiCorp Developer: Sentinel language conditionals - https://developer.hashicorp.com/sentinel/docs/language/conditionals
- HashiCorp Developer: Sentinel language specification - https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Developer: Sentinel time import - https://developer.hashicorp.com/sentinel/docs/imports/time
- HashiCorp Developer: Terraform Enterprise cost estimation overview - https://developer.hashicorp.com/terraform/enterprise/cost-estimation

## Issues Found
- The post used the undocumented `tfrun.source` property and listed trigger-source values such as `tfe-vcs`, `tfe-api`, `tfe-ui`, and `tfe-cli`. Replaced that section and related examples with documented run metadata fields: `tfrun.created_by`, `tfrun.commit_sha`, `tfrun.message`, and `tfrun.workspace.vcs_repo`.
- The post used `tfrun.cost_estimation`, but the documented namespace is `tfrun.cost_estimate`. Updated all references and examples.
- Several examples placed `if` statements directly inside `rule` blocks. Sentinel rules contain a single expression, while conditional statements belong outside rule expressions or inside functions. Rewrote those rules as boolean expressions or helper functions.
- The time-based restrictions section said `tfrun` does not directly provide timestamps. The official reference documents `tfrun.created_at` as an RFC3339 timestamp. Updated the section to use `tfrun.created_at` with the Sentinel `time` import.
- Code fences were marked as `python` even though the snippets are Sentinel policies. Updated them to `sentinel`.

## Review Notes
Cost estimate values are strings in the `tfrun` import. The examples use `float()` for simple comparisons, which is valid, but HashiCorp documents the `decimal` import as a more accurate option for currency math. I could not run local Sentinel syntax validation because the `sentinel` CLI is not installed in this environment.
