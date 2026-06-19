# Validation Summary: How to Handle Custom Metrics in OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry JavaScript SDK and API
- OpenTelemetry Python SDK and API
- OpenTelemetry Go metric API
- OTLP metrics export
- Prometheus metrics export
- Express and FastAPI middleware examples

## Sources Consulted
- OpenTelemetry JavaScript manual instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Go metric API reference: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry metric semantic convention guidelines: https://opentelemetry.io/docs/specs/semconv/general/metrics/

## Issues Found
- The introduction said OpenTelemetry provides "three main types" of metric instruments while the post listed four. Changed the wording to "several common types" to avoid a false count.
- The JavaScript setup used the older `Resource` constructor and `SemanticResourceAttributes` constants. Updated it to use `defaultResource().merge(resourceFromAttributes(...))` and current semantic convention constants.
- The JavaScript setup and multi-exporter example used `MeterProvider.addMetricReader()`, which was removed in OpenTelemetry JS SDK 2.x. Updated both examples to pass readers through the `MeterProvider` constructor.
- The JavaScript observable gauge examples passed callbacks directly to `createObservableGauge()`. Updated them to create the gauge and register callbacks with `addCallback()`, matching current OpenTelemetry JavaScript examples.
- The Python observable gauge callbacks accepted an observer and called `observer.observe(...)`, which does not match the current Python metrics API. Updated callbacks to accept callback options and return `Observation` objects.
- The multi-exporter JavaScript example used `OTEL_EXPORTER_OTLP_ENDPOINT` as the HTTP metric exporter `url`. Changed it to `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, which represents the metrics endpoint URL expected by the exporter option.
- The naming diagram said to include the unit in the metric name. Adjusted it to say the unit should be included in the instrument unit field, which better matches OpenTelemetry's metric API.

## Review Notes
The post uses Prometheus-style snake_case metric names in several examples. OpenTelemetry allows these names, but official OpenTelemetry semantic conventions commonly use dot-separated hierarchical names for standard metrics. This is acceptable for custom metrics, especially when targeting Prometheus-compatible backends, but future revisions could call out the backend naming convention distinction.
