# Validation Summary: How to Send Dapr Metrics to New Relic

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (sidecar metrics, control plane metrics)
- New Relic (Prometheus Remote Write, NRQL, dashboards, alerts)
- Prometheus (scrape config, remote write, Kubernetes SD)
- Kubernetes (pod annotations, Helm, ConfigMaps)
- Terraform (New Relic provider, `newrelic_one_dashboard` resource)
- New Relic CLI (`newrelic-cli`)

## Sources Consulted
- Dapr metrics reference documentation (https://docs.dapr.io/operations/observability/metrics/)
- New Relic Prometheus Remote Write integration docs (https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-remote-write/set-your-prometheus-remote-write-integration/)
- New Relic Kubernetes integration Helm chart (https://github.com/newrelic/helm-charts)
- New Relic CLI documentation (https://github.com/newrelic/newrelic-cli)
- Prometheus `authorization` configuration reference (https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)

## Issues Found

### 1. Incorrect Dapr metric label name in NRQL query
- **What was wrong:** The first NRQL query used `dapr_app_id` as the label name (`WHERE dapr_app_id IS NOT NULL` and `FACET dapr_app_id`).
- **What was changed:** Replaced `dapr_app_id` with `app_id` to match Dapr's actual label name.
- **Why:** Dapr exposes the application identifier as the `app_id` label, not `dapr_app_id`. The second NRQL query in the post already correctly used `app_id`, making this also an internal inconsistency.

### 2. Incorrect Dapr metric name for HTTP latency
- **What was wrong:** The second NRQL query referenced `dapr_http_server_latency_ms`.
- **What was changed:** Replaced with `dapr_http_server_latency`.
- **Why:** Dapr's HTTP server latency histogram metric is named `dapr_http_server_latency` without a `_ms` suffix. The unit (milliseconds) is implicit in the metric, not encoded in the name.

### 3. Invalid New Relic CLI command for alert creation
- **What was wrong:** The command `newrelic alerts conditions create` with flags `--type "static"`, `--metric`, `--threshold`, `--threshold-duration`, `--threshold-occurrences` does not match any valid New Relic CLI subcommand or flag set.
- **What was changed:** Replaced with `newrelic nrql alertscondition create` using correct flags: `--accountId`, `--nrql` (with an actual NRQL query), `--critical-threshold`, `--critical-threshold-duration`, and `--critical-threshold-occurrences`.
- **Why:** The New Relic CLI uses `nrql alertscondition create` (not `alerts conditions create`) for NRQL-based alert conditions. Alert thresholds require the `--critical-` prefix, and the condition is defined by a NRQL query (`--nrql`) rather than a `--metric` flag.

## Review Notes
- The Prometheus Remote Write URL, authorization config, and Helm chart details for the New Relic Kubernetes integration are all correct and current.
- The Terraform `newrelic_one_dashboard` resource structure is syntactically correct for the New Relic Terraform provider.
- The Kubernetes SD relabel config correctly translates the `dapr.io/enabled` annotation to `__meta_kubernetes_pod_annotation_dapr_io_enabled`.
- The New Relic CLI command syntax for alerts may continue to evolve; readers should verify against the latest `newrelic-cli` documentation for their installed version.
- The post only covers the US datacenter endpoint (`metric-api.newrelic.com`). EU customers would need `metric-api.eu.newrelic.com`. This is not an error but could be noted for completeness.
