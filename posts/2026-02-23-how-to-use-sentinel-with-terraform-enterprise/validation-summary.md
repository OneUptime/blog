# Validation Summary: How to Use Sentinel with Terraform Enterprise

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform Enterprise
- HCP Terraform policy enforcement
- Sentinel policy language
- Sentinel policy sets and enforcement levels
- Terraform Enterprise API
- Terraform cost estimation

## Sources Consulted
- HashiCorp Terraform Enterprise Policy Sets API: https://developer.hashicorp.com/terraform/enterprise/api-docs/policy-sets
- HashiCorp Terraform Enterprise Policy Checks API: https://developer.hashicorp.com/terraform/enterprise/api-docs/policy-checks
- HashiCorp Terraform Enterprise Runs API: https://developer.hashicorp.com/terraform/enterprise/api-docs/run
- HashiCorp Sentinel VCS policy set documentation for HCP Terraform / Terraform Enterprise: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs
- HashiCorp policy set management and enforcement levels documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets
- HashiCorp `tfrun` Sentinel import reference: https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/import-reference/tfrun
- HashiCorp Terraform Enterprise cost estimation documentation: https://developer.hashicorp.com/terraform/enterprise/cost-estimation
- HashiCorp Sentinel enforcement levels documentation: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- HashiCorp Sentinel language and built-in function documentation: https://developer.hashicorp.com/sentinel/docs/language/spec and https://developer.hashicorp.com/sentinel/docs/imports/decimal

## Issues Found
- The post referred to Terraform Enterprise as the self-hosted version of Terraform Cloud. HashiCorp's current product naming is HCP Terraform, so that reference was updated.
- The Sentinel VCS policy set examples stored local policy files under a `policies/` subdirectory. Terraform Enterprise's Sentinel VCS documentation states that local policy files must reside in the same directory as `sentinel.hcl`, so the file tree and `source` paths were updated.
- The hard-mandatory enforcement description did not account for newer policy evaluations where mandatory failures can be overridden if the policy set is explicitly configured to allow mandatory overrides. The text now distinguishes legacy policy checks from policy evaluations.
- The cost estimation section implied cost data is always available and calculated the delta manually from prior and proposed cost fields. HashiCorp documents cost estimation as an optional feature, with `tfrun.cost_estimate` present only when a cost estimate exists, and recommends using `delta_monthly_cost`. The example was updated accordingly.
- The cost policy used `previous_cost.string()` style calls. The Sentinel decimal import exposes `string` as a property, not a method, so the example now uses `cost_increase.string`.
- The monitoring section included `GET /organizations/:org/policy-checks`, which is not documented in the Terraform Enterprise Policy Checks API. It now lists organization runs with the Runs API and instructs querying policy checks per run.

## Review Notes
- Cost estimation data is only available to Sentinel in legacy policy checks; HashiCorp recommends policy evaluations for newer Sentinel runtimes, but policy evaluations cannot access cost estimation data.
- The example API requests use OAuth token IDs for VCS connections, which remain documented. GitHub App installation IDs are also supported for relevant VCS connections.
