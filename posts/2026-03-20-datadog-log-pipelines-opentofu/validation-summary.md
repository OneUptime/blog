# Validation Summary: How to Manage Datadog Log Pipelines with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- Datadog Logs Pipelines
- Datadog `DataDog/datadog` Terraform/OpenTofu provider (v3.39+)
- Datadog log processors: grok_parser, status_remapper, url_parser, category_processor, string_builder_processor
- Datadog log indexes and exclusion filters

## Sources Consulted
- [DataDog/terraform-provider-datadog source: resource_datadog_logs_custom_pipeline.go](https://github.com/DataDog/terraform-provider-datadog/blob/master/datadog/resource_datadog_logs_custom_pipeline.go) — verified processor schemas (grok_parser with nested `grok` block containing `support_rules`/`match_rules`, status_remapper, url_parser including `normalize_ending_slashes`, category_processor with nested `category`/`filter`/`name`, string_builder_processor with `template`/`target`/`is_replace_missing`).
- [DataDog/terraform-provider-datadog source: resource_datadog_logs_index.go](https://github.com/DataDog/terraform-provider-datadog/blob/master/datadog/resource_datadog_logs_index.go) — verified `datadog_logs_index` schema: `name` (required), `daily_limit`, `retention_days`, top-level `filter` block (Required) with `query`, and `exclusion_filter` containing `name`/`is_enabled`/nested `filter { query, sample_rate }`.
- [DataDog/terraform-provider-datadog provider.go resource registration](https://github.com/DataDog/terraform-provider-datadog/blob/master/datadog/provider.go) — confirmed the resource name is `datadog_logs_custom_pipeline` (no `datadog_logs_pipeline` resource exists).
- [Terraform Registry — datadog_logs_custom_pipeline](https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/logs_custom_pipeline)
- [Terraform Registry — datadog_logs_index](https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/logs_index)
- [Datadog Logs RBAC Permissions](https://docs.datadoghq.com/logs/guide/logs-rbac-permissions/) — confirmed `logs_write_pipelines` permission name.
- [Datadog Log Pipelines docs](https://docs.datadoghq.com/logs/log_configuration/pipelines/)
- [Datadog Log Indexes docs](https://docs.datadoghq.com/logs/log_configuration/indexes/)

## Issues Found

1. **Wrong resource name `datadog_logs_pipeline`** — Used in two `resource` declarations (Nginx pipeline and Application Logs pipeline). The Datadog provider does not export a resource called `datadog_logs_pipeline`; the correct resource name is `datadog_logs_custom_pipeline`. Verified via the provider source (`provider.go` resource map and `resource_datadog_logs_custom_pipeline.go`). Fixed by renaming both occurrences to `datadog_logs_custom_pipeline`.

2. **Missing required top-level `filter` block on `datadog_logs_index`** — The `indexSchema` in `resource_datadog_logs_index.go` marks the top-level `filter` block as `Required: true` (with a `query` attribute). The original example only included an `exclusion_filter` and would have failed validation/apply with an error about a missing required block. Fixed by adding `filter { query = "*" }` to the `datadog_logs_index.main` resource. The `*` query matches all logs, which pairs with the post's intent of using the exclusion filter to drop a subset.

## Review Notes

- The post pins the provider to `~> 3.39`. As of May 2026 the latest version is 4.6.0 (April 2026), and the v3.x line ended at 3.91.0. The pin still works for the example but is several minor versions behind; readers running fresh installations may want to bump the constraint. Schemas referenced in this post (custom pipeline, logs index) are consistent across these versions, so no code changes are required for newer versions.
- The post does not mention `datadog_logs_pipeline_order`, which Datadog's provider documentation states should be used in conjunction with `datadog_logs_custom_pipeline` to control pipeline ordering. Not strictly an error (custom pipelines work without an explicit ordering resource), but worth noting for completeness.
- The grok pattern in the Nginx example is syntactically valid Datadog grok and uses correct matchers (`%{ip:...}`, `%{date(...):...}`, `%{word:...}`, `%{notSpace:...}`, `%{number:...}`, `%{integer:...}`).
- The `category_processor` example places `name` outside the inline `filter { query = ... }` block and uses `target` correctly per the schema.
- The `string_builder_processor` `template = "%{env}"` is valid Datadog template syntax for substituting the `env` log attribute.
- The `logs_write_pipelines` permission name is correct per Datadog's RBAC docs.
- `tofu init` / `tofu validate` / `tofu apply` are valid OpenTofu CLI commands. The `DD_API_KEY` / `DD_APP_KEY` env vars are recognized by the provider as alternatives to `var.datadog_api_key` / `var.datadog_app_key`.
