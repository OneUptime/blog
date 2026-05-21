# Validation Summary: How to Configure Telemetry Aggregation in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Telemetry API
- Envoy proxy metrics and access log attributes
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- OpenTelemetry Collector tail sampling
- Kubernetes manifests and `kubectl`

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio access logging with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Prometheus operators and vector matching reference: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus histograms and summaries guide: https://prometheus.io/docs/practices/histograms/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry tail sampling example: https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/

## Issues Found
- The `namespace:istio_requests_error_ratio:rate5m` recording rule divided an error-rate series grouped by destination namespace and service name by a total-rate series that still included `response_code`. Prometheus vector matching requires compatible label sets unless matching modifiers or aggregation are used, so the original expression would return no matching result for the intended ratio. I changed the denominator to sum the pre-aggregated total by `destination_service_namespace` and `destination_service_name`.
- The access-log filter used `connection.duration`, which is not listed in Envoy's CEL attributes. Envoy exposes `request.duration` for completed HTTP requests, so I changed the expression and the explanatory sentence from slow connections to slow requests.
- The Prometheus query API example placed a complex PromQL expression directly in the URL. Prometheus documents `--data-urlencode` for query parameters, and this avoids shell and URL encoding problems with braces, regex syntax, and quotes. I changed the example to use `curl -sG` with `--data-urlencode`.
- The tail-sampling explanation said the configuration keeps all error and slow traces without noting the collector requirement that all spans for a trace reach the same collector instance. I added that condition to keep the claim accurate for multi-replica deployments.

## Review Notes
- The Istio Telemetry API examples use the current `telemetry.istio.io/v1` API and valid metric override, tracing, and access logging fields.
- The PrometheusRule structure and histogram quantile recording rules are consistent with Prometheus Operator and Prometheus documentation.
- Tail-based sampling configuration is syntactically consistent with OpenTelemetry Collector examples.
