# Validation Summary: How to Use Terraform Enterprise API for Automation

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform Enterprise API
- HCP Terraform API-compatible endpoints
- Terraform workspaces
- Terraform runs and configuration versions
- Workspace variables and variable sets
- GitHub Actions
- Bash, curl, jq, tar

## Sources Consulted
- HashiCorp Terraform Enterprise API overview: https://developer.hashicorp.com/terraform/enterprise/api-docs
- HashiCorp Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HashiCorp Workspace variables API reference: https://developer.hashicorp.com/terraform/enterprise/api-docs/workspace-variables
- HashiCorp Variable sets API reference: https://developer.hashicorp.com/terraform/enterprise/api-docs/variable-sets
- HashiCorp Runs API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HashiCorp Configuration versions API reference: https://developer.hashicorp.com/terraform/enterprise/api-docs/configuration-versions

## Issues Found
- Organization token caveat was incomplete for run automation. HashiCorp documents that organization tokens cannot perform plans or applies, so I added comments clarifying that run creation and apply examples require a user or team token.
- The wait script described polling until a terminal state but exited successfully on `planned`, which is not a final state. I updated the comment and status handling to account for approval-ready states, soft-failed policy override, no-op terminal runs, and successful applies.
- The rate limiting section listed `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers that are not documented for Terraform Enterprise. I replaced that with the documented 30 requests-per-second-per-user guidance and the documented `x-ratelimit-limit` header on throttled responses.

## Review Notes
The API examples use valid JSON:API payload shapes and current endpoint paths for workspace creation, workspace filtering, workspace variables, variable sets, runs, run apply actions, and API-driven configuration uploads. The examples intentionally use placeholder hostnames, organization names, workspace IDs, variable set IDs, OAuth token IDs, and credentials.
