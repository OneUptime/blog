# Validation Summary: How to Configure Prometheus for Dapr Metrics

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Dapr (sidecar metrics, control plane metrics)
- Prometheus (scrape configs, relabeling, PromQL)
- Kubernetes (pod annotations, service discovery, port-forwarding)
- Helm (kube-prometheus-stack chart)
- Prometheus Operator (PodMonitor CRD)

## Sources Consulted
- Dapr official documentation on observability and metrics: https://docs.dapr.io/operations/observability/metrics/
- Dapr documentation on Prometheus integration: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr sidecar annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Prometheus documentation on Kubernetes service discovery: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config
- Prometheus relabeling documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
- Prometheus Operator PodMonitor CRD reference: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PodMonitor
- kube-prometheus-stack Helm chart values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack

## Issues Found

1. **Incorrect control plane target: `dapr-dashboard.dapr-system:8080`**
   - **What was wrong:** The Dapr Dashboard is a web UI and does not expose Prometheus metrics. It was listed as a scrape target alongside actual metrics-exporting control plane components.
   - **What was changed:** Replaced `dapr-dashboard.dapr-system:8080` with `dapr-sidecar-injector.dapr-system:9090`. The sidecar injector is the fourth Dapr control plane component that exposes Prometheus metrics (alongside the operator, sentry, and placement server).
   - **Why:** Scraping the dashboard on port 8080 would either fail or return HTML, not Prometheus metrics. The sidecar injector is the missing control plane component.

2. **Incorrect PromQL metric name: `dapr_http_server_latency_ms_bucket`**
   - **What was wrong:** The histogram bucket metric name included `_ms` which is not part of the actual Dapr metric name.
   - **What was changed:** Changed to `dapr_http_server_latency_bucket`.
   - **Why:** Dapr exposes the HTTP latency histogram as `dapr_http_server_latency` (measured in milliseconds, but without `_ms` in the name). Prometheus automatically creates `_bucket`, `_sum`, and `_count` suffixes from that base name.

3. **Incorrect PromQL label name: `status_code`**
   - **What was wrong:** The error rate query used `status_code` as the label name for filtering HTTP status codes.
   - **What was changed:** Changed to `status`.
   - **Why:** Dapr HTTP server metrics use `status` (not `status_code`) as the label for HTTP response status codes.

## Review Notes
- The PodMonitor example uses `port: dapr-metrics` which assumes the Dapr sidecar container has a named port called `dapr-metrics`. Depending on the Dapr version and sidecar injector configuration, this named port may not exist by default. Users may need to use `targetPort: 9090` instead if the named port is not present. This is not strictly an error but a potential usability issue.
- The Helm install flags `podMonitorSelectorNilUsesHelmValues=false` and `serviceMonitorSelectorNilUsesHelmValues=false` are correctly used to ensure the Prometheus Operator picks up PodMonitors and ServiceMonitors from all namespaces, not just those created by the Helm chart.
- The Prometheus relabel config correctly translates Kubernetes annotation names (replacing `.`, `/`, and `-` with `_`) for use as Prometheus meta-labels.
