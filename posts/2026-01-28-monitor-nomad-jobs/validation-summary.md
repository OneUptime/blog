# Validation Summary: How to Monitor Nomad Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Nomad
- Prometheus
- Prometheus alerting rules
- Grafana
- Nomad CLI

## Sources Consulted
- HashiCorp Nomad telemetry configuration: https://developer.hashicorp.com/nomad/docs/configuration/telemetry
- HashiCorp Nomad metrics HTTP API: https://developer.hashicorp.com/nomad/api-docs/metrics
- HashiCorp Nomad metrics reference: https://developer.hashicorp.com/nomad/docs/reference/metrics
- HashiCorp Nomad Prometheus monitoring tutorial: https://developer.hashicorp.com/nomad/tutorials/manage-clusters/prometheus-metrics
- HashiCorp Nomad `alloc logs` command reference: https://developer.hashicorp.com/nomad/commands/alloc/logs
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Grafana Labs Nomad dashboards catalog: https://grafana.com/grafana/dashboards/?search=nomad
- HashiCorp Discuss note on Nomad Grafana dashboards: https://discuss.hashicorp.com/t/official-grafana-dashboard/64614

## Issues Found
- The telemetry block enabled `prometheus_metrics` but did not enable `publish_allocation_metrics` or `publish_node_metrics`, even though the post recommends tracking task CPU/memory and node health metrics. Added both settings so those runtime metrics are published.
- The Prometheus scrape example only listed targets on port `4646`. Prometheus defaults to `/metrics`, but Nomad exposes Prometheus-formatted metrics at `/v1/metrics?format=prometheus`. Added `metrics_path: /v1/metrics` and `params: format: ["prometheus"]`, and clarified the endpoint sentence.
- The allocation shortage alert used `nomad_job_summary_running` and `nomad_job_summary_desired`. The documented Prometheus metric names include the `nomad_nomad_job_summary_*` prefix, and `desired` is not a documented job summary metric. Replaced the example with a queued-allocation alert using `nomad_nomad_job_summary_queued > 0`.
- The post said Nomad publishes official Grafana dashboards. HashiCorp documentation and community discussion indicate there is no official HashiCorp Nomad Grafana dashboard, though Grafana Labs and community dashboards exist. Updated the sentence accordingly.

## Review Notes
The `nomad alloc logs <alloc-id>` command is correct when the allocation has a single task; for multi-task allocations, Nomad requires the task name or `-task` option.
