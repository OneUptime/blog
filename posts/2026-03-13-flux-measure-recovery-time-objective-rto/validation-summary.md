# Validation Summary: How to Measure Recovery Time Objective (RTO) with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes custom resources
- Prometheus and PromQL
- Prometheus Operator PodMonitor
- Grafana dashboards
- Bash scripting
- jq

## Sources Consulted
- Flux CLI documentation for `flux bootstrap github`: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitHub bootstrap guide: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics with kube-state-metrics: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Prometheus `histogram_quantile` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The monitoring example used a `ServiceMonitor` with `endpoints` for Flux controllers. Flux's monitoring documentation uses a `PodMonitor` to scrape controller pods on the `http-prom` port, so the snippet was changed to `kind: PodMonitor` with `podMetricsEndpoints`.
- The metrics list described `gotk_reconcile_duration_seconds_bucket` as "time since last successful reconciliation" and used `gotk_source_duration_seconds`, which is not the documented Flux metric. The examples were corrected to use `gotk_reconcile_duration_seconds_bucket` for Kustomization and GitRepository reconciliation duration, and `gotk_resource_info` for readiness from kube-state-metrics custom resource metrics.
- The Grafana dashboard used `count(gotk_reconcile_condition...)`, which counts time series rather than active not-ready resources, and used `time() - gotk_reconcile_duration_seconds_sum{type='Ready',status='True'}`, which treats a cumulative duration metric as a timestamp. The dashboard queries were corrected to use aggregated histogram quantiles and `gotk_resource_info` readiness.
- The `flux bootstrap github` command used `--token-env=GITHUB_TOKEN`, which is not a current documented flag. The flag was removed; Flux uses `GITHUB_TOKEN` directly when it is set.
- The `jq` report used invalid slice syntax `[-2:]`. The trend expression was corrected to use `.[-1]` and `.[-2]`, with an `insufficient_data` result when there is only one measurement.

## Review Notes
Local `flux` and `kubectl` binaries were not installed in the review environment, so those commands were verified against official documentation rather than local `--help` output. The post assumes kube-state-metrics is configured with Flux custom resource metrics before `gotk_resource_info` queries will return data.
