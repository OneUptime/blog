# Validation Summary: How to Set Up Alerting for High Latency in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh telemetry
- Prometheus metrics and PromQL
- PrometheusRule resources from Prometheus Operator
- Alertmanager routing configuration
- Kubernetes YAML configuration

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API metric reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Prometheus histogram_quantile and rate documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post said Istio records request duration for every request passing through the mesh. Istio's standard request duration metric is generated for HTTP, HTTP/2, and gRPC traffic, so the wording was narrowed to those traffic types.
- The "Latency Alerts by HTTP Method" section claimed method-specific alerting but used only default Istio labels for protocol and response code. Istio standard metrics do not include a default HTTP method label, so the section title, explanatory sentence, alert name, and summary were corrected to describe protocol/status filtering.
- The Alertmanager example used deprecated `match` route fields. Updated the example to use current `matchers` syntax.
- The Alertmanager example referenced `default` and `oncall-pagerduty` receivers without declaring them. Added receiver names so the route references are complete.

## Review Notes
- PromQL examples follow Prometheus guidance for classic histograms by applying `rate()` to `_bucket` series and preserving `le` during aggregation.
- The SLO example is a simplified single-window threshold, not a full multi-window multi-burn-rate alerting policy.
- `promtool` and `amtool` were not installed in the local environment, so validation was performed by checking syntax and fields against official documentation.
