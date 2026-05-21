# Validation Summary: How to Configure Metric Aggregation Rules in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio Telemetry API
- Prometheus
- Prometheus Operator PrometheusRule
- PromQL recording and alerting rules
- OpenTelemetry Collector

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Classifying Metrics Based on Request or Response task: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus recording rule naming practices: https://prometheus.io/docs/practices/rules/
- Prometheus data model documentation: https://prometheus.io/docs/concepts/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- OpenTelemetry Collector Contrib metricstransformprocessor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor
- OpenTelemetry Collector Contrib transformprocessor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md

## Issues Found
- The post description mentioned EnvoyFilter, but the article does not use EnvoyFilter. Changed it to reference the OpenTelemetry Collector, which the post actually covers.
- The proxy-level Telemetry API example said it removed protocol-related labels but did not remove Istio's `request_protocol` label. Added `request_protocol` removals to the relevant metric overrides and updated the explanatory sentence.
- The response-code aggregation example added a new `response_code_class` tag while leaving the original `response_code` tag in place. That would not reduce source metric cardinality for raw `istio_requests_total`; it would add another dimension. Changed the example to UPSERT the existing `response_code` dimension with class values, matching Istio's documented response classification pattern, and updated the recording rule to aggregate by `response_code`.

## Review Notes
The PrometheusRule structure, recording rule expressions, histogram quantile usage, Telemetry API version, Istio metric names, and OpenTelemetry Collector `metricstransform` aggregation syntax were checked against current official or authoritative documentation and are technically valid. `promtool` was not installed in the local environment, so PromQL validation was performed by documentation review rather than a local `promtool check rules` run.
