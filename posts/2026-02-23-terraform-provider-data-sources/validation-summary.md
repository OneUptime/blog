# Validation Summary: How to Implement Data Sources in Terraform Provider

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform data sources
- Terraform Plugin Framework
- Terraform Plugin SDKv2
- Go
- HCL

## Sources Consulted
- Terraform Plugin Framework data sources documentation: https://developer.hashicorp.com/terraform/plugin/framework/data-sources
- Terraform Plugin Framework data source tutorial: https://developer.hashicorp.com/terraform/tutorials/providers-plugin-framework/providers-plugin-framework-data-source-read
- Terraform Plugin Framework data source configuration validation documentation: https://developer.hashicorp.com/terraform/plugin/framework/data-sources/validate-configuration
- Terraform Plugin Framework migrating data sources documentation: https://developer.hashicorp.com/terraform/plugin/framework/migrating/data-sources
- Terraform language data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform Plugin SDKv2 schema behavior documentation: https://developer.hashicorp.com/terraform/plugin/sdkv2/schemas/schema-behaviors

## Issues Found
- The post said data sources are read during every plan and apply and that Terraform does not track their state for drift detection. The current Terraform language documentation says Terraform attempts to query data sources during planning, but may defer reads to apply when arguments are unknown, and data source values are still written to state. I updated the wording to reflect plan-time reads, apply-time deferral, and the fact that data sources are not managed for drift remediation.
- The basic Plugin Framework Go example used `time.RFC3339`, `attr.Value`, and `api.Server` without importing `time`, `attr`, or an API package. I added the missing imports and a placeholder `yourservice/internal/api` import so the snippet is structurally complete.
- The list data source Go example used `api.ServerFilters` without importing an API package. I added the same placeholder API import.
- The list data source converted tag filters with `ElementsAs` but continued even if diagnostics were added. I added a diagnostics check before assigning the filters.
- The SDKv2 example did not handle a nil server result and ignored errors from `d.Set`. I added a not-found diagnostic and returned `diag.FromErr` for failed state writes.
- The best-practice note said Terraform expects every data source to have an ID and recommended synthetic IDs for list data sources. That is SDKv2-centric and not generally required in the Plugin Framework. I changed it to recommend exposing an ID when useful, using a natural ID for single-item lookups, and using a convenience list of IDs for list data sources.

## Review Notes
The examples are intentionally provider-specific and use placeholder `APIClient` and `yourservice/internal/api` types. They are technically consistent with current Terraform Plugin Framework and SDKv2 patterns, but a real provider would need to replace those placeholders with its actual client package and may prefer declarative config validators such as framework validator packages for `id`/`name` lookup rules.
