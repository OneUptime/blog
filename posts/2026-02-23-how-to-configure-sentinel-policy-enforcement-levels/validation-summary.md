# Validation Summary: How to Configure Sentinel Policy Enforcement Levels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform
- Terraform Enterprise
- Sentinel
- Sentinel policy sets
- HCP Terraform API

## Sources Consulted
- HashiCorp Sentinel enforcement levels: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- HashiCorp Sentinel CLI configuration file syntax: https://developer.hashicorp.com/sentinel/docs/configuration
- HCP Terraform policy enforcement results and overrides: https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/view-results
- HCP Terraform policy and policy set management: https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/manage-policy-sets
- HCP Terraform Policies API: https://developer.hashicorp.com/terraform/enterprise/api-docs/policies
- HCP Terraform Policy Checks API: https://developer.hashicorp.com/terraform/enterprise/api-docs/policy-checks
- HCP Terraform Teams API: https://developer.hashicorp.com/terraform/enterprise/api-docs/teams
- HCP Terraform tfrun Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfrun
- Sentinel tfplan/v2 import reference: https://developer.hashicorp.com/sentinel/docs/features/terraform/tfplan-v2
- Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec

## Issues Found
- The post stated that hard-mandatory policies cannot be overridden by anyone. Updated this to clarify that this is true for the standard Sentinel policy check workflow, while HCP Terraform policy-set override settings and policy evaluations can allow mandatory failures to be overridden.
- The post described `sentinel.hcl` as the primary way to configure enforcement levels without context. Updated it to specify VCS-backed Sentinel policy sets, since managed policies can also be configured through the UI and API.
- The workflow steps said developers run `terraform plan`, which implies local Terraform CLI policy enforcement. Updated the steps to say the developer triggers a Terraform run in HCP Terraform, where Sentinel runs after plan and before apply.
- The soft-mandatory CLI prompt used a yes/no override prompt. Updated the example to use the documented `override` response for Terraform CLI-driven Sentinel overrides.
- The override permissions section incorrectly referred to "Manage Policies" as the override permission. Updated it to "Manage Policy Overrides" or equivalent project/workspace policy override permissions.
- The audit API example used a non-documented global `/policy-checks?filter[result]=overridden` endpoint. Updated it to the documented per-run `GET /runs/:run_id/policy-checks` endpoint and instructed readers to inspect entries with status `overridden`.
- The Sentinel example code block was labeled `python`. Updated it to `sentinel`.

## Review Notes
- The Sentinel policy syntax and imports are consistent with the official `tfrun`, `tfplan/v2`, and Sentinel language documentation. The Sentinel CLI was not installed locally, so syntax validation was performed against official documentation rather than by executing `sentinel`.
- The Terraform CLI was not installed locally, so CLI behavior was verified against the official HCP Terraform policy enforcement documentation.
