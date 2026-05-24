# Validation Summary: How to Export and Analyze Run Data from HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform (Terraform Cloud) API v2
- curl
- jq
- Bash scripting
- Python 3 (datetime, json, collections)
- JSON:API specification (pagination, includes)

## Sources Consulted
- HCP Terraform Runs API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform API list-runs-in-an-organization endpoint documentation
- HCP Terraform API list-runs-in-a-workspace endpoint documentation
- JSON:API specification for pagination (`meta.pagination`) and includes

## Issues Found

1. **`include=created-by` should be `include=created_by`** (kebab-case → snake_case)
   - The HCP Terraform API uses snake_case relationship names for the `include` query parameter (e.g., `created_by`, `cost_estimate`, `configuration_version`).
   - Although attribute names in responses use kebab-case (e.g., `created-at`), the `include` parameter expects the relationship name as defined in the docs.
   - Fixed in the Audit Log Export section.

2. **`filter[from]` is not a valid query parameter** on the org runs endpoint.
   - The HCP Terraform API only supports these filters: `filter[operation]`, `filter[status]`, `filter[agent_pool_names]`, `filter[workspace_names]`, `filter[source]`, `filter[status_group]`, `filter[timeframe]`. There is no `filter[from]` for date-based filtering.
   - Fixed by switching the weekly-export script to fetch runs and filter by `created-at` client-side using `jq`, with a comment explaining the limitation.

## Review Notes

- `datetime.utcnow()` used in the Python scripts is deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`. It still works correctly and produces the same result, so it was left as-is, but future iterations could update it.
- The post simplifies run `source` values ("VCS, CLI, API, UI") but the actual API values are prefixed (`tfe-api`, `tfe-ui`, `tfe-configuration-version`, etc.). The descriptive labeling is reasonable for an introductory section.
- Pagination handling (`meta.pagination["next-page"]`) is correct per HCP Terraform's JSON:API responses.
- Run attribute names (`status`, `source`, `created-at`, `message`, `has-changes`, `auto-apply`, `is-destroy`, `status-timestamps`) verified against the official Run API docs.
- Run status values (`applied`, `planned_and_finished`, `errored`, `discarded`, `canceled`) are valid per HCP Terraform's documented run states.
- The weekly-export script no longer filters server-side; for very busy orgs, users may need to paginate through results before client-side filtering.
