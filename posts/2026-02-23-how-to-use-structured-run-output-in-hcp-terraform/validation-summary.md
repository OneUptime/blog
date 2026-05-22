# Validation Summary: How to Use Structured Run Output in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform
- Terraform CLI
- HCP Terraform API
- Terraform JSON plan output
- jq
- curl
- Slack incoming webhooks

## Sources Consulted
- HCP Terraform Plans API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/plans
- HCP Terraform Runs API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform Comments API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/comments
- HCP Terraform Cost Estimates API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/cost-estimates
- Terraform JSON Output Format: https://developer.hashicorp.com/terraform/internals/json-format
- HCP Terraform Run States and Stages: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/states

## Issues Found
- The plan JSON endpoint was shown as returning a JSON:API document under `.data.attributes`. The official Plans API documents `/plans/:id/json-output` and `/runs/:id/plan/json-output` as temporary redirects to the raw Terraform JSON plan. Updated examples to use `curl --location` and parse the raw JSON directly.
- The examples fetched the plan from `GET /runs/$RUN_ID/plan`. The official documentation states that the plan ID is available in the run object's `relationships.plan` property. Updated examples to fetch the run and extract `.data.relationships.plan.data.id`.
- The `output_changes` JSON example omitted the required `change` object wrapper. Updated the example to match Terraform's documented JSON plan structure.
- The Slack summary counted only exact `["create"]` and `["delete"]` action arrays, which misses replacement actions such as `["delete","create"]`. Updated the add and destroy counts to use `contains(["create"])` and `contains(["delete"])`.
- The cost estimation section described cost data as part of structured output and used `GET /runs/$RUN_ID/cost-estimate`. The official API exposes cost estimates through a cost estimate relationship on the run and `GET /cost-estimates/:id`. Updated the wording and command sequence accordingly, and noted that cost estimation must be enabled.
- The post stated that structured UI output is enabled by default for all workspaces. Narrowed this to supported runs to avoid overclaiming beyond the documented support constraints.

## Review Notes
The plan JSON endpoint requires a completed supported plan and returns `204 No Content` while plan JSON is not ready. HCP Terraform also documents that plan JSON output cannot be accessed with organization tokens; callers need a user token or a team token with admin access to the workspace.
