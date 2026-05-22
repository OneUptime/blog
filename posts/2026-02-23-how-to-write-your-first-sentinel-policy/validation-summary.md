# Validation Summary: How to Write Your First Sentinel Policy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Sentinel
- HCP Terraform
- Terraform Enterprise
- Terraform plan policy enforcement
- Sentinel CLI testing
- AWS EC2 instance type policy checks

## Sources Consulted
- HashiCorp Sentinel install page: https://developer.hashicorp.com/sentinel/install
- HashiCorp Sentinel test command reference: https://developer.hashicorp.com/sentinel/docs/commands/test
- HashiCorp Sentinel testing documentation: https://developer.hashicorp.com/sentinel/docs/writing/testing
- HashiCorp Sentinel configuration file syntax: https://developer.hashicorp.com/sentinel/docs/configuration
- HashiCorp Sentinel language boolean expressions: https://developer.hashicorp.com/sentinel/docs/language/boolexpr
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Terraform policy tutorials: https://developer.hashicorp.com/terraform/tutorials/policy
- HashiCorp releases for Sentinel: https://releases.hashicorp.com/sentinel/

## Issues Found
- The Sentinel CLI download example used version 0.24.0, while the current official install page and release index list 0.40.0. Updated the download and unzip commands to use Sentinel 0.40.0.
- The `tfplan.resource_changes` filter did not check `rc.mode`, even though the official `tfplan/v2` reference documents resource changes for both managed resources and data sources and uses `rc.mode is "managed"` in resource examples. Added `rc.mode is "managed"` to the policy examples.
- The explanation said the filter only selected resources being created or updated, but the `contains "create"` check also includes replacement actions such as `["delete", "create"]` and `["create", "delete"]`. Updated the wording to say created, updated, or replaced.
- The local testing section referenced mock files but did not show them in the directory layout or provide a concrete mock module. Added the mock files to the directory tree and included a minimal passing `tfplan/v2` mock module that works with the policy.
- The Sentinel code blocks were labelled as Python. Updated them to use `sentinel` code fences.

## Review Notes
Verified the main policy and the added passing test mock locally with Sentinel v0.40.0 using `sentinel test restrict-instance-types.sentinel`; the test passed.
