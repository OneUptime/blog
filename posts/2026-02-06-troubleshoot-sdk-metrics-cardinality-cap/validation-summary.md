# Validation Summary: How to Troubleshoot the OpenTelemetry SDK Silently Capping Metrics at 2000

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Metrics SDK
- OpenTelemetry Python SDK metrics and Views
- OpenTelemetry Go SDK metrics and Views
- OpenTelemetry Java SDK autoconfiguration
- OpenTelemetry Collector transform and filter processors
- Prometheus / PromQL

## Sources Consulted
- OpenTelemetry specification: SDK metric cardinality limits and overflow attribute, https://opentelemetry.io/docs/specs/otel/metrics/sdk/#cardinality-limits
- OpenTelemetry Python SDK metrics documentation, https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Go SDK metric package documentation, https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Java configuration documentation, https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Collector transform processor documentation, https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector filter processor documentation, https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor

## Issues Found
- The post described the cap as silent data loss and said new combinations are dropped. The OpenTelemetry specification aggregates measurements beyond the limit into an overflow attribute set, so I changed the wording to loss of attribute detail rather than dropped measurements.
- The post said the default limit applies per metric instrument. The specification defines the default limit as 2000 per instrument per collection cycle when no view or MetricReader limit is configured, so I added that scope.
- The Python example under "Increase the Cardinality Limit" used `OTEL_METRIC_EXPORT_INTERVAL`, which changes export timing rather than metric cardinality. I replaced that with guidance that Python Views can reduce cardinality by keeping selected attributes.
- The generic `OTEL_CARDINALITY_LIMIT` environment variable is not the standard OpenTelemetry setting. I replaced it with the Java autoconfigure setting `OTEL_JAVA_METRICS_CARDINALITY_LIMIT`.
- The Go example mentioned cardinality support but did not use the current Go SDK option. I updated it to use `metric.WithCardinalityLimit(5000)` and included the missing `attribute` import.
- The Collector `metricstransform` example used `delete_label_value`, which does not remove an attribute as described. I replaced it with a transform processor example using `aggregate_on_attributes`.
- The Collector filter example used legacy metric-level matching while describing datapoint/series filtering. I replaced it with an OTTL datapoint filter expression.
- The alert example counted `otelcol.*` metrics, which monitors Collector internal series rather than the application metric approaching the SDK limit. I changed it to count the target application metric.

## Review Notes
The core topic is technically valid: the OpenTelemetry Metrics SDK specification defines a default cardinality limit of 2000 and an `otel.metric.overflow=true` overflow attribute set. SDK support for directly configuring the limit remains implementation-specific, so the post now distinguishes direct limit increases from cardinality reduction via Views.
