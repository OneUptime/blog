# Validation Summary: How to Use Anomaly-Based Alerting from OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry OTLP metrics exporter
- OpenTelemetry-to-Prometheus metric translation
- Prometheus recording rules
- PromQL offset modifiers, range functions, and binary operators
- Prometheus alerting rules and annotation templates

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python SDK metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Prometheus metrics exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus query language basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template examples: https://prometheus.io/docs/prometheus/latest/configuration/template_examples/

## Issues Found
- The PromQL request-rate example queried `otel_http_server_requests_total`, but the documented OpenTelemetry-to-Prometheus name translation for a counter named `http.server.requests` produces `http_server_requests_total` unless a separate namespace is configured. Updated the query to use `http_server_requests_total`.
- The PromQL examples grouped request rates only by `service_name`, then later filtered on `infrastructure_tier`. That label would have been removed by the recording rule aggregation, making the tier-specific alerts return no series. Updated the resource example to include `infrastructure.tier` and changed the recording rule aggregation to preserve `infrastructure_tier`.
- The text assumed OpenTelemetry resource attributes were available as Prometheus labels without stating that ingestion/export translation must expose them. Added a short note that the examples assume standard name translation and resource attribute exposure as Prometheus labels.
- The `baseline_7d_stddev` rule was described as standard deviation across the same offset days, but `stddev_over_time(service:request_rate:5m[7d])` calculates across all samples in the last seven days, not the same-time offset samples used by the average. Replaced it with a standard deviation calculation over the same seven offset samples.
- The sensitivity comment referred to "Prometheus variables", but the snippet does not define or use Prometheus variables. Updated the comment to call it a sensitivity tuning example.
- The explanation that two and three standard deviations cover roughly 95% and 99.7% of normal variation needed the normal-distribution caveat. Added that qualification.

## Review Notes
- `promtool` was not installed in the local environment, so rule syntax was reviewed against the official Prometheus documentation rather than checked with `promtool check rules`.
- The alert template query example is valid Prometheus annotation templating, but query functions in alert annotations should remain lightweight because they run during rule evaluation.
