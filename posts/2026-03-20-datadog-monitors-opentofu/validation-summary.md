# Validation Summary: How to Create Monitors with OpenTofu on Datadog

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- Datadog (Monitors, APM, Logs)
- HCL (HashiCorp Configuration Language)
- `DataDog/datadog` Terraform/OpenTofu provider
- Datadog monitor query language (metric, log, and APM monitors)

## Sources Consulted
- Datadog APM trace metrics namespace: https://docs.datadoghq.com/tracing/metrics/metrics_namespace/
- Datadog metric monitor types: https://docs.datadoghq.com/monitors/types/metric/
- Datadog APM monitors: https://docs.datadoghq.com/monitors/types/apm/
- Datadog Distribution / DDSketch trace metrics migration guide: https://docs.datadoghq.com/tracing/guide/ddsketch_trace_metrics/
- Datadog monitors API: https://docs.datadoghq.com/api/latest/monitors/
- DataDog/datadog Terraform provider releases: https://github.com/DataDog/terraform-provider-datadog/releases
- DataDog/datadog Terraform provider monitor resource docs: https://github.com/DataDog/terraform-provider-datadog/blob/master/docs/resources/monitor.md

## Issues Found

1. **APM Latency Monitor query used an invalid time aggregator.**
   - Original: `percentile(last_10m):p99:trace.web.request{env:${var.environment}} by {service} > 1`
   - The Datadog monitor query format is `<TIME_AGG>(<TIME_WINDOW>):<SPACE_AGG>:<METRIC>{<SCOPE>}`. Valid time aggregators are `avg`, `sum`, `min`, `max`, `last`, `change`, and `pct_change`. There is a separate `percentile(pXX)` form for distribution metrics, but it takes a percentile (e.g., `percentile(p99)`), not a time window — so `percentile(last_10m)` is malformed.
   - Fixed to: `avg(last_10m):p99:trace.web.request{env:${var.environment}} by {service} > 1` — `avg` over the 10-minute window is the canonical form for an APM p99 latency monitor on the new distribution metric.
   - The metric name `trace.web.request` was left unchanged: per Datadog's DDSketch migration guide, `trace.<SPAN_NAME>` (the distribution metric) is the recommended replacement for the legacy `trace.<SPAN_NAME>.duration` GAUGE, and percentile space aggregations (`p99`, `p95`, etc.) operate on it directly.

## Review Notes

- **Provider version pin (`~> 3.39`)**: still functional, but the latest stable Datadog provider release as of 2026-05-03 is v4.6.0 (v4.0.0 was a major release). Readers starting fresh today should consider pinning to `~> 4.0` or newer. Left unchanged because v3.39 was a real release and the post's HCL is valid for it.
- **Env vars in Deploy section**: the post exports `DD_API_KEY` / `DD_APP_KEY`, but the provider block reads from `var.datadog_api_key` / `var.datadog_app_key`. The Datadog provider does fall back to `DD_API_KEY` / `DD_APP_KEY` env vars when the explicit `api_key` / `app_key` arguments are omitted, so the export-only pattern would work if the explicit arguments were removed from the `provider "datadog"` block. As written, readers would also need `TF_VAR_datadog_api_key` / `TF_VAR_datadog_app_key` (or a `terraform.tfvars` file). Not a hard error, but a coherence gap worth noting.
- **APM latency threshold units**: `trace.<SPAN_NAME>` distribution metrics report duration in seconds, so the threshold of `> 1` correctly represents 1 second.
- **Error Rate Monitor message vs. thresholds**: the message says "above 1%" while the critical threshold is 5% and warning is 1%. Since the monitor first transitions to alerting state at the warning threshold (1%), the message is technically accurate when the alert fires.
- **`notify_no_data = true` and `no_data_timeframe = 10`**: Datadog recommends `no_data_timeframe` be at least 2× the evaluation window. With `last_10m`, a value of 10 is on the boundary — readers may want to bump to 20+ to avoid flapping. Not a correctness issue.
- **Log monitor query syntax** (`logs("...").index(...).rollup("count").last("5m") > 100`): correct per Datadog log monitor query reference.
