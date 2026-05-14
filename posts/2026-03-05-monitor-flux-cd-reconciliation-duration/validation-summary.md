# Validation Summary: How to Monitor Flux CD Reconciliation Duration

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Flux CD
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Grafana dashboards

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Prometheus `histogram_quantile()` function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The recording rule named `flux:reconcile:avg_duration_seconds` aggregated by `kind`, which made the later "Slowest Resources Table" query unable to list individual resources. I changed it to retain the Flux metric's `kind`, `name`, and `namespace` labels and updated the dashboard's "Average Duration by Kind" panel query to aggregate explicitly with `avg by (kind)`.
- The P99 recording rule aggregated only by `kind`, while the P50 and P95 rules retained `kind` and `namespace`. I updated the P99 rule to keep `namespace` as well, so the percentile recording rules have consistent label dimensions.
- The `flux:reconcile:max_duration_seconds` rule was described as a maximum observed duration but actually calculated the maximum average duration. I changed it to use `histogram_quantile(1, ...)`, which Prometheus documents as the estimated maximum value stored in a histogram.
- The Grafana "Duration by Namespace" panel used invalid PromQL syntax: `flux:reconcile:p95_duration_seconds by (namespace)`. I changed it to `avg by (namespace) (flux:reconcile:p95_duration_seconds)`.
- The Flux CLI commands used `-o wide`, but the current official Flux CLI docs for `flux get kustomizations` and `flux get sources git` do not list an output flag for these commands. I removed `-o wide`.

## Review Notes
The core Flux metric name and labels are correct according to the Flux monitoring documentation. The Prometheus histogram percentile examples correctly include the `le` label when aggregating classic histogram buckets. The alert thresholds are examples and should be tuned per cluster size, controller concurrency, repository layout, and workload expectations.
