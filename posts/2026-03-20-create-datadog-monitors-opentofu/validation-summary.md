# Validation Summary: How to Create Datadog Monitors with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered

- OpenTofu / Terraform
- Datadog (monitors)
- Datadog Terraform provider (`DataDog/datadog`)
- HCL configuration language

## Sources Consulted

- Datadog Terraform provider index: https://github.com/DataDog/terraform-provider-datadog/blob/master/docs/index.md
- `datadog_monitor` resource documentation: https://github.com/DataDog/terraform-provider-datadog/blob/master/docs/resources/monitor.md
- Terraform Registry listing: https://registry.terraform.io/providers/DataDog/datadog/latest
- Datadog provider release notes: https://github.com/DataDog/terraform-provider-datadog/releases

## Issues Found

The original post was a generic placeholder template that did not contain any Datadog-specific content. Every Datadog detail was stubbed with literal placeholder strings (e.g. `provider_name`, `provider-namespace/provider-name`, `provider_example_resource`, `PROVIDER_API_KEY`, `PROVIDER_API_SECRET`). The post claimed to be a Datadog Monitors tutorial while presenting nothing usable for Datadog. The following technical corrections were made (section structure preserved):

- **Provider Installation**: Replaced the placeholder `provider_name` / `provider-namespace/provider-name` block with the real Datadog provider source `DataDog/datadog` and a sensible `~> 3.0` version constraint. The `required_version = ">= 1.6.0"` is compatible with the provider's documented minimum (Terraform 1.1.5+).
- **Authentication**: Replaced the made-up `PROVIDER_API_KEY` / `PROVIDER_API_SECRET` environment variables with the provider's actual env vars: `DD_API_KEY` and `DD_APP_KEY`. Updated the `provider "datadog"` block to mention `api_key`, `app_key`, and `api_url` (the real arguments documented in the provider index), including the EU site URL as an example.
- **Example Resource**: Replaced the placeholder `provider_example_resource` with a real `datadog_monitor` resource using a valid `type` value (`"metric alert"`), the four required arguments (`name`, `type`, `message`, `query`), a documented `monitor_thresholds` block, `include_tags`, and `tags` — all matching the schema in the Datadog Terraform provider docs.
- **Outputs**: Updated `output "resource_id"` to reference `datadog_monitor.main.id` instead of the placeholder resource type.
- **Introduction / Conclusion**: Replaced "Datadog Monitors resources" phrasing (which read as an artifact of the placeholder template) with the more natural "Datadog monitors".

## Review Notes

- The Datadog Terraform provider's latest major version is v4 (v4.6.0 released April 2026). v4 introduced breaking changes; the post pins `~> 3.0` for a more conservative, widely-deployed baseline. If readers want the newest features, they can move to `~> 4.0` after reviewing the v4 upgrade guide.
- `monitor_thresholds` accepts additional fields (`warning_recovery`, `critical_recovery`, `ok`, `unknown`); the example uses only `warning` and `critical` to keep it minimal.
- The provider also supports cloud-provider-based authentication (AWS) in Preview as an alternative to API/APP keys; not covered here as it's still in Preview.
- The hyphen used in "secrets manager-never" in the Best Practices bullet is unusual punctuation but is preserved from the original template — it's not a technical error, just stylistic.
