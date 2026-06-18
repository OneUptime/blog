# Validation Summary: How to Build a Deployment Impact Dashboard That Overlays Releases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python metrics
- OTLP metrics export
- Grafana annotations
- Prometheus / PromQL
- Prometheus recording rules
- GitHub Actions
- Mermaid

## Sources Consulted
- Grafana Annotations HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/annotations/
- Grafana annotation visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics export API documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html
- OpenTelemetry metric naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/3.0/configuration/recording_rules/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The deployment counter was named `deployments.total`. OpenTelemetry metric naming guidance says counters should not append `total`, and Prometheus exporters add counter suffixes during translation. Changed the OpenTelemetry instrument name to `deployments` while keeping the Prometheus query as `deployments_total`.
- The one-shot deployment metric example could exit before the periodic metric reader exports the counter update. Added `provider.force_flush()` after recording the deployment to make the example work reliably in a deployment script.
- The error-rate PromQL examples used `status_code="STATUS_CODE_ERROR"`, which does not match current OpenTelemetry HTTP metric semantic convention attributes. Changed the filter to `error_type=~".+"`, which matches translated Prometheus labels for requests that ended with an OpenTelemetry `error.type`.
- The post described a "Grafana recording rule", but the provided YAML is a Prometheus recording rule file. Updated the text to refer to Prometheus recording rules.
- The recording-rule comments said the result was `1` or `0`, but PromQL comparisons without the `bool` modifier filter samples instead of returning boolean values. Added `bool` to the threshold comparisons.

## Review Notes
The Prometheus metric names in the dashboard examples assume OpenTelemetry-to-Prometheus translation with underscore escaping and suffixes enabled, which is the default strategy in the OpenTelemetry Prometheus exporter specification. Deployments emitted as metrics are useful for correlation, but Grafana API annotations remain the more direct choice when rich annotation text and tags are required.
