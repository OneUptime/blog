# Validation Summary: How to Monitor Dapr Network Latency Between Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Prometheus (metrics and alerting)
- Grafana (dashboards)
- Zipkin / Jaeger (distributed tracing)
- Kubernetes (deployment annotations, port-forwarding)
- Go (Dapr Go SDK for service invocation)
- PromQL (Prometheus query language)
- PrometheusRule (alerting CRD from prometheus-operator)

## Sources Consulted
- Dapr distributed tracing with Zipkin: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr annotations and arguments overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr metrics reference (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Grafana dashboards (GitHub): https://github.com/dapr/dapr/tree/master/grafana
- Dapr Go SDK client documentation: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Grafana setup guide: https://docs.dapr.io/operations/observability/metrics/grafana/

## Issues Found

1. **Incorrect metric name `dapr_service_invocation_req_sent_total`**: The actual Dapr metric includes the `runtime_` prefix: `dapr_runtime_service_invocation_req_sent_total`. Additionally, the original text misleadingly described this counter metric as tracking "invocation latency" when it actually tracks request counts. Fixed the prose to correctly describe both the counter and the histogram metric.

2. **Incorrect metric name `dapr_http_client_roundtrip_latency_ms_bucket`**: The actual metric is `dapr_http_client_roundtrip_latency` (Prometheus appends `_bucket` automatically for histograms). The `_ms` suffix is not part of the metric name. Fixed in both the PromQL query and the PrometheusRule alert expression.

3. **Invalid PromQL: `histogram_quantile` used on a counter metric**: The second PromQL query applied `histogram_quantile()` to `dapr_service_invocation_req_sent_total`, which is a counter (not a histogram). `histogram_quantile` only works with histogram bucket metrics. Replaced with the correct histogram metric `dapr_http_client_roundtrip_latency_bucket`.

4. **Missing `sum by (le)` in PromQL queries**: The first PromQL query and the PrometheusRule expression used `histogram_quantile` without aggregating by the `le` (less-than-or-equal) label, which is required for correct percentile calculation across multiple series. Added `sum by (le)` wrapper.

5. **Nonexistent Grafana dashboard URL**: The URL referenced `dapr-system-services-monitor.json` which does not exist in the Dapr repository. The actual file is `grafana-system-services-dashboard.json`. Fixed the URL.

6. **Invalid `kubectl apply` for Grafana dashboard**: The original command used `kubectl apply -f` on a Grafana dashboard JSON file, but Grafana JSON dashboards are not Kubernetes resource manifests and cannot be applied this way. Changed to `curl -O` to download the file, with instructions to import via Grafana UI.

7. **Unverified Grafana dashboard ID 13411**: The post claimed ID 13411 is the official Dapr Grafana dashboard. This could not be verified as an official Dapr dashboard. Removed the specific ID reference.

## Review Notes
- The Dapr tracing configuration YAML, Kubernetes annotations, Go SDK `InvokeMethod` call, Zipkin port-forward command, and PrometheusRule CRD structure are all correct.
- The Go SDK usage `client.InvokeMethod(ctx, "service-b", "process", "GET")` matches the documented API signature.
- Dapr metric names and conventions may vary across Dapr versions. The corrections reflect the current naming conventions as of Dapr 1.12+. Readers using older Dapr versions may see different metric names.
