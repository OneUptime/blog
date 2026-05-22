# Validation Summary: How to Organize Sentinel Policies for Large Organizations

## Status
validated

## Post Type
Guide

## Technologies Covered
- HashiCorp Sentinel
- HCP Terraform policy sets
- Terraform plan imports (`tfplan/v2`)
- Terraform run imports (`tfrun`)
- Sentinel policy parameters and modules
- Git release tagging

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel parameters documentation: https://developer.hashicorp.com/sentinel/docs/language/parameters
- HashiCorp Sentinel CLI configuration syntax: https://developer.hashicorp.com/sentinel/docs/configuration
- HCP Terraform Sentinel VCS policy set configuration: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs
- HCP Terraform `tfplan/v2` import reference: https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/import-reference/tfplan-v2
- HCP Terraform `tfrun` import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfrun
- HashiCorp Sentinel enforcement levels: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- Git tag documentation: https://git-scm.com/docs/git-tag

## Issues Found
- The shared functions example imported `lib/common-functions` directly but the HCP Terraform policy set configuration did not declare a corresponding module. Added a `module "common-functions"` block to `sentinel.hcl` and updated the policy import to `import "common-functions" as common`, matching HCP Terraform's documented module pattern.
- The policy set examples used filenames such as `sentinel-security.hcl` and `sentinel-hipaa.hcl`. HCP Terraform VCS-backed Sentinel policy sets expect a `sentinel.hcl` configuration file in the configured policy set path. Updated the comments to describe separate policy sets, each using `sentinel.hcl`.
- The monitoring snippet referenced `tfrun.workspace.name` without importing `tfrun`. Added `import "tfrun"` to make the snippet technically complete.
- Sentinel examples were labeled as `python` code fences. Updated them to `sentinel` to avoid misidentifying the language.

## Review Notes
The remaining examples are conceptual organization patterns rather than a complete runnable policy repository. HCP Terraform policy sets can target different workspaces or projects, and Sentinel enforcement levels (`advisory`, `soft-mandatory`, `hard-mandatory`) are current. The repository layout should be implemented with a valid policy set path containing the relevant `sentinel.hcl` file for each HCP Terraform policy set.
