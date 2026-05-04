# Validation Summary: How to Create Datadog Log Pipelines with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Datadog Terraform provider (DataDog/datadog ~> 3.0)
- Datadog Logs (custom pipelines, indexes, processors)
- Grok parsing
- Datadog log processors (grok_parser, category_processor, geo_ip_parser, status_remapper, trace_id_remapper, service_remapper, attribute_remapper)

## Sources Consulted
- [datadog_logs_custom_pipeline | Terraform Registry](https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/logs_custom_pipeline)
- [datadog_logs_index | Terraform Registry](https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/logs_index)
- [DataDog/terraform-provider-datadog source on GitHub](https://github.com/DataDog/terraform-provider-datadog/blob/master/datadog/resource_datadog_logs_custom_pipeline.go)
- [Datadog Pipelines documentation](https://docs.datadoghq.com/logs/log_configuration/pipelines/)
- [Manage Logs and Metrics with Terraform](https://docs.datadoghq.com/logs/guide/manage_logs_and_metrics_with_terraform/)

## Issues Found

1. **Wrong resource name `datadog_logs_pipeline`** — used in the "Web Access Logs" and "Application Logs" examples. The Datadog Terraform provider does not expose a resource called `datadog_logs_pipeline`; the correct name is `datadog_logs_custom_pipeline` (which the third example already used). Fixed both occurrences.

2. **Non-existent `json_parser` processor** — the "Custom Parsing Rules" example used a `json_parser` processor block, but `datadog_logs_custom_pipeline` does not support a `json_parser` processor type. The provider's supported processors are: arithmetic_processor, array_processor, attribute_remapper, category_processor, date_remapper, decoder_processor, geo_ip_parser, grok_parser, lookup_processor, reference_table_lookup_processor, message_remapper, pipeline, schema_processor, service_remapper, status_remapper, string_builder_processor, trace_id_remapper, url_parser, user_agent_parser, span_id_remapper. JSON parsing in a custom pipeline is performed via `grok_parser` using the `%{data::json}` matcher. Replaced the `json_parser` block with an equivalent `grok_parser` and updated the downstream `attribute_remapper` `sources` accordingly (parsed JSON keys land at the root, not under a `parsed.` prefix).

## Review Notes
- The provider version pin `~> 3.0` is current (latest 3.x is widely used in the DataDog/datadog provider line).
- The `exclusion_filter` block on `datadog_logs_index` is correctly modeled: `sample_rate = 0.9` excludes 90% of matching logs (keeps 10%), matching the inline comment.
- Field naming conventions for grok rules (e.g., `network.client.ip`, `http.method`, `http.status_code`) align with Datadog's standard log attribute naming.
- The `category_processor` ranges `[200 TO 299]`, `[300 TO 399]`, `[400 TO 599]` correctly cover 2xx/3xx/4xx-5xx categories using Datadog's Lucene-like log search query syntax.
- Pipeline ordering is not addressed in this post; in production, `datadog_logs_pipeline_order` is required to control execution order across multiple custom pipelines. This is a future enhancement, not a correctness issue.
