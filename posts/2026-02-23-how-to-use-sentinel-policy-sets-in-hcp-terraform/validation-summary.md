# Validation Summary: How to Use Sentinel Policy Sets in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform
- Terraform Cloud / Terraform Enterprise API
- Sentinel
- Sentinel policy sets
- Policy as code
- VCS-backed policy repositories

## Sources Consulted
- HCP Terraform policy set management documentation: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/manage-policy-sets
- HCP Terraform Sentinel VCS policy set documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs
- HCP Terraform / Terraform Enterprise Policy Sets API reference: https://developer.hashicorp.com/terraform/enterprise/api-docs/policy-sets
- HCP Terraform / Terraform Enterprise Policy Checks API reference: https://developer.hashicorp.com/terraform/enterprise/api-docs/policy-checks
- Sentinel configuration file syntax: https://developer.hashicorp.com/sentinel/docs/configuration
- Sentinel language parameters documentation: https://developer.hashicorp.com/sentinel/docs/language/parameters
- HCP Terraform Policy Set Parameters API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/policy-set-params
- Sentinel enforcement levels documentation: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels

## Issues Found
- The UI instructions used outdated navigation and source terminology. Updated the steps to use the current documented flow: organization settings, Policies, Connect a new policy set, and workflow selection.
- The VCS repository example placed local Sentinel policy files in a `policies/` subdirectory. HCP Terraform's Sentinel VCS documentation says local policy files must reside in the same directory as `sentinel.hcl`, so the example paths and tree were corrected.
- The repository connection comments referred to using the Terraform CLI to create a policy set. Replaced that with the HCP Terraform API or the `tfe` provider, which matches the documented automation workflows.
- The API create example included an unnecessary `organization` relationship in the request body and omitted the explicit policy framework. Removed the request relationship and added `"kind": "sentinel"`.
- The Sentinel policy example was marked as `python`. Changed the code fence to `sentinel`.
- The troubleshooting section used a non-existent `/policy-sets/:id/policy-checks` endpoint. Replaced it with the documented `/runs/:run_id/policy-checks` endpoint.
- The monitoring section referred to policy evaluations while using policy-check endpoints. Renamed the section and surrounding text to policy checks to match the API being demonstrated.

## Review Notes
HCP Terraform now distinguishes Sentinel policy checks from policy evaluations. The post focuses on standard Sentinel policy checks and does not cover agent-backed Sentinel policy evaluations or runtime version pinning.
