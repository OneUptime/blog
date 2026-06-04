# Validation Summary: How to configure Grafana recording rules in Mimir

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Mimir
- Mimir ruler
- Prometheus recording rules
- PromQL
- Mimir HTTP ruler configuration API
- Terraform
- Amazon S3 rule storage

## Sources Consulted
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir ruler component documentation: https://grafana.com/docs/mimir/latest/references/architecture/components/ruler/
- Grafana Mimir HTTP API reference: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana Mimirtool documentation: https://grafana.com/docs/mimir/latest/manage/tools/mimirtool/
- Grafana data source-managed recording rules documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-recording-rules/create-data-source-managed-recording-rules/
- fgouteroux Mimir Terraform provider documentation: https://registry.terraform.io/providers/fgouteroux/mimir/latest/docs
- Grafana Mimir official mixin ruler dashboard source: https://github.com/grafana/mimir/blob/main/operations/mimir-mixin/dashboards/ruler.libsonnet

## Issues Found
- The Mimir ruler configuration included `enable_sharding` twice and `external_labels` under `ruler`. Current Mimir configuration does not document those fields. Replaced them with the documented ruler ring `kvstore` configuration and kept `enable_api`, `rule_path`, and `evaluation_interval`.
- The "Get a specific rule group" API example used only `/rules/{namespace}`. The Mimir HTTP API requires `/rules/{namespace}/{groupName}` for a single rule group, so the URL now includes both `http_metrics` namespace and group name.
- The Terraform example used `source = "grafana/mimir"` and omitted the `/prometheus` prefix from `ruler_uri`. Updated it to the current `fgouteroux/mimir` provider, version constraint `~> 1.0`, `ruler_uri = "http://mimir:8080/prometheus"`, and added the required `namespace`.
- The monitoring section used non-existent ruler metric names such as `cortex_ruler_group_evaluation_duration_seconds` and `cortex_ruler_group_samples`. Replaced them with Mimir ruler metrics used by the official Mimir mixin, including `cortex_prometheus_rule_evaluation_duration_seconds_*`, `cortex_prometheus_rule_evaluation_failures_total`, `cortex_prometheus_rule_group_iterations_missed_total`, and `cortex_prometheus_rule_group_rules`.
- The failure-handling explanation implied missing query results are a rule failure and that `or vector(0)` prevents per-label gaps. Updated the wording to describe real failure modes and clarify that `or vector(0)` creates a single unlabeled default when the whole query is empty.

## Review Notes
The remaining PromQL and YAML examples are syntactically plausible and consistent with Prometheus/Mimir recording rule behavior. In production, users should still verify label cardinality and tenant-specific limits such as maximum rules per group and maximum rule evaluation results before deploying high-cardinality recording rules.
