# Validation Summary: How to Configure API-Driven Workflow in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform
- Terraform Cloud API
- Configuration versions
- Runs and applies
- Workspace variables
- Bash and curl
- Python requests

## Sources Consulted
- HCP Terraform API-driven run workflow: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/api
- HCP Terraform Configuration Versions API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/configuration-versions
- HCP Terraform Runs API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform Plans API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/plans
- HCP Terraform Workspaces API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform Workspace Variables API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables

## Issues Found
- The authentication section said organization, team, or user tokens could be used generally. Updated it to recommend team or user tokens for the API-driven workflow and note that organization tokens cannot create configuration versions or apply runs.
- The packaging example only archived top-level `.tf` and `.tfvars` files. Updated it to archive the whole configuration directory with that directory at the tar root, matching the HCP Terraform API-driven workflow requirement.
- The run status list omitted `planned_and_finished` and `force_canceled`. Added both so no-op plans and force-canceled runs are represented correctly.
- The plan output example used `GET /runs/$RUN_ID/plan` and `/plans/$PLAN_ID/log`, which are not the documented plan-log retrieval flow. Updated it to read the plan ID from the run relationship, fetch the plan with `GET /plans/:id`, and then download from the returned `log-read-url`.
- The automation examples only auto-approved `planned` runs. Updated them to also handle `policy_checked`, which is another confirmable state documented by the Runs API.
- The Bash and Python automation examples did not treat no-op plans as successful terminal runs. Added `planned_and_finished` handling.
- The Python example did not check upload, polling, or apply response status consistently. Added `raise_for_status()` calls for those API requests.

## Review Notes
The workspace creation, workspace variable, configuration version creation, upload, run creation, and apply endpoints are otherwise aligned with the current HCP Terraform API documentation. The examples still use Terraform version `1.7.0`, which is older than current Terraform releases but remains valid as an example version string.
