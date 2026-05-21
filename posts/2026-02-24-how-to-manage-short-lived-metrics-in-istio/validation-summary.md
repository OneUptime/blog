# Validation Summary: How to Manage Short-Lived Metrics in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh metrics
- Prometheus and PromQL
- Prometheus Operator PodMonitor and PrometheusRule resources
- Kubernetes Jobs and CronJobs
- kube-state-metrics
- Prometheus Pushgateway

## Sources Consulted
- Prometheus querying basics and staleness behavior: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions, including `rate()` and `absent()`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus HTTP API, including `delete_series` and `clean_tombstones`: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Prometheus Pushgateway guidance: https://prometheus.io/docs/practices/pushing/
- Prometheus pushing metrics documentation: https://prometheus.io/docs/instrumenting/pushing/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio sidecar startup annotation documentation: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio Prometheus integration and sidecar metrics endpoint documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Prometheus Operator API reference for PodMonitor and PrometheusRule fields: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Corrected the Prometheus staleness explanation. The post incorrectly described a universal 5-minute staleness period after target disappearance; Prometheus marks missing series stale when a scrape no longer returns them or soon after a target disappears, while the default 5-minute lookback behavior mainly applies in cases such as explicit timestamps.
- Replaced the stale-series filtering PromQL example. The original joined `istio_requests_total` to `up` on `destination_workload`, but `up` does not normally carry Istio workload labels. The example now uses `kube_pod_status_phase` and explicitly notes the required compatible pod labels.
- Fixed Kubernetes Job manifests. The original snippets used `apiVersion: apps/v1` for `kind: Job` and omitted `restartPolicy`; Jobs use `batch/v1`, and their pod templates require `restartPolicy: Never` or `OnFailure`.
- Corrected the Pushgateway section. The original wording implied Envoy can be configured to push metrics to Pushgateway and pushed the full Istio/Envoy scrape output. The revised text limits the recommendation to service-level final job outcome metrics and warns against per-pod or per-instance labels.
- Corrected the sidecar shutdown explanation. Calling `/quitquitquit` lets the Istio proxy exit so the Job can complete, but it does not itself flush Prometheus-scraped metrics.
- Fixed the alert expression so a missing current series can evaluate to zero with `or vector(0)` while still checking that the service had traffic in the offset window.
- Updated the Prometheus admin API guidance to mention that `--web.enable-admin-api` is required, and changed the `delete_series` example to the documented query-parameter form with `curl -g`.

## Review Notes
The remaining examples are version-sensitive to local Prometheus scrape configuration, especially label names such as `pod`, `namespace`, and Istio scrape job names. The post now calls out the label-alignment assumption where it matters.
