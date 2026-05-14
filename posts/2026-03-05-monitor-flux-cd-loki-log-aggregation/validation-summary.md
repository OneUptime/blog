# Validation Summary: How to Monitor Flux CD with Loki for Log Aggregation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- Grafana Loki
- Grafana Alloy
- Grafana
- LogQL

## Sources Consulted
- Grafana Loki Helm chart installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki Kubernetes Monitoring Helm tutorial: https://grafana.com/docs/loki/latest/send-data/k8s-monitoring-helm/
- Grafana Loki Promtail installation documentation: https://grafana.com/docs/loki/latest/send-data/promtail/installation/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki labels documentation: https://grafana.com/docs/loki/latest/get-started/labels/
- Grafana Loki LogQL metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux controller manifests and controller documentation: https://github.com/fluxcd/flux2, https://github.com/fluxcd/kustomize-controller

## Issues Found
- The post used the deprecated `grafana/loki-stack` chart with Promtail. Promtail reached end-of-life on March 2, 2026, and `loki-stack` is deprecated, so I updated the setup to use the current Loki Helm chart and Grafana Alloy through the Kubernetes Monitoring Helm chart.
- The post claimed Promtail automatically collected the Flux logs. I changed this to Alloy collection through the Kubernetes Monitoring chart and added the required values to collect pod logs from `flux-system`.
- The LogQL examples filtered on `app` without defining a collector label configuration. I updated the collector values and controller-specific queries to use the Flux `app.kubernetes.io/component` label as `app_kubernetes_io_component`.
- The dashboard aggregation query grouped by the old `app` label. I updated it to aggregate by `app_kubernetes_io_component`.
- The alert query returned per-stream counts while the description described a total threshold. I wrapped it in `sum(...)` so the query matches the stated behavior.
- The retention example used deprecated Table Manager settings. I replaced it with Compactor-based retention using `limits_config.retention_period`, `limits_config.max_query_lookback`, and `compactor.retention_enabled`.
- The structured log fields listed `controller`, but Flux's documented JSON examples use `controllerGroup`. I updated the field name.

## Review Notes
- Helm and kubectl are not installed in this local environment, so CLI behavior was verified against official documentation rather than local `--help` output.
- The embedded YAML snippets were syntax-checked successfully with Python's YAML parser.
