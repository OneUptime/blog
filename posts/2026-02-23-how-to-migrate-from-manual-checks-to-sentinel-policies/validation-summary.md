# Validation Summary: How to Migrate from Manual Checks to Sentinel Policies

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Enterprise
- HashiCorp Sentinel
- Sentinel policy sets and enforcement levels
- Sentinel `tfplan/v2` import
- Sentinel CLI testing

## Sources Consulted
- HashiCorp Sentinel enforcement levels: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- HCP Terraform policy set management and enforcement levels: https://developer.hashicorp.com/terraform/enterprise/policy-enforcement/manage-policy-sets
- HCP Terraform Sentinel VCS policy set configuration: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs
- HCP Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Sentinel testing tutorial: https://developer.hashicorp.com/sentinel/tutorials/get-started/testing
- HashiCorp Sentinel `test` command reference: https://developer.hashicorp.com/sentinel/docs/commands/test
- HashiCorp Sentinel language maps and set operators: https://developer.hashicorp.com/sentinel/docs/language/maps
- HashiCorp Sentinel language lists and `append`: https://developer.hashicorp.com/sentinel/docs/language/lists

## Issues Found
- The post described `soft-mandatory` as equivalent to advisory mode. This was incorrect: Sentinel has separate `advisory`, `soft-mandatory`, and `hard-mandatory` enforcement levels. Updated the rollout and prioritization language so advisory policies are described as non-blocking, while soft-mandatory is treated as overrideable enforcement.
- The sample tags policy claimed to check only taggable resources, but the filter included every managed create or update and would fail resources without a `tags` attribute. Updated the text and policy filter to target planned managed resources whose `after` object contains `tags`.
- The Sentinel code block was marked as Python. Updated the fence language to `sentinel`.
- The post used the legacy Terraform Cloud name in user-facing instructions. Updated those references to HCP Terraform while keeping Terraform Enterprise where relevant.
- The hard-mandatory exception guidance was too absolute for current HCP Terraform behavior. Updated it to distinguish standard Sentinel policy checks from Sentinel policy evaluations that can allow overrides when configured.

## Review Notes
The Sentinel CLI was not installed in the local environment, so commands were verified against the official Sentinel CLI documentation instead of local `--help` output. The test snippets are structurally consistent with Sentinel's documented test framework, but the referenced mock data files are illustrative and not included in the post.
