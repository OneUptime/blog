# Validation Summary: How to Implement Custom Metrics in OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Metrics
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- OTLP HTTP and gRPC exporters
- OpenTelemetry Collector
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Python Metrics API docs: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python Resource SDK docs: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- OpenTelemetry Python metric views docs: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry JS 2.x upgrade notes: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OneUptime OpenTelemetry ingestion docs: https://oneuptime.com/docs/en/telemetry/open-telemetry
- npm package metadata for @opentelemetry/sdk-metrics 2.8.0, @opentelemetry/resources 2.8.0, and @opentelemetry/semantic-conventions 1.41.1

## Issues Found
- The Node.js setup used `new Resource(...)` from `@opentelemetry/resources`, which is no longer exported in OpenTelemetry JS 2.x. Updated the example to use `resourceFromAttributes(...)`.
- The Node.js setup used deprecated `SemanticResourceAttributes` constants. Updated the example to use `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`.
- The Node.js OTLP exporter URL concatenated `process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/metrics'`, which produces an invalid URL when the environment variable is unset and can produce a double slash when it ends with `/`. Added a local default and trimmed one trailing slash.
- The Node.js histogram examples configured bucket boundaries with an `advice` object that is not the documented JS SDK way to configure histogram buckets. Moved bucket configuration to metric views on the `MeterProvider`.
- The Node.js response-size histogram used `unit: 'bytes'` while the best-practices section recommends the UCUM unit `By`. Updated the example to use `By`.
- The Python resource example imported `SERVICE_NAME` from `opentelemetry.sdk.resources`; current docs show resource attributes as strings with `Resource.create(...)`. Updated the example to use `"service.name"`.
- The Python `orders_errors_total` counter was created inside `record_order_error`, which can repeatedly create duplicate instruments. Moved the counter to module scope with the other counters.
- The Python observable gauge callback called `options.observe(...)`, but current OpenTelemetry Python callbacks return or yield `Observation` objects. Updated the callback to yield `Observation(...)` and added the documented callback types.
- The Python histogram section said it created explicit bucket boundaries but did not pass any boundaries. Added `explicit_bucket_boundaries_advisory`.
- The Collector snippet only enabled the OTLP gRPC receiver. Added the OTLP HTTP receiver so OTLP/HTTP SDK exporters can send to the collector.
- The OneUptime Collector exporter snippet omitted OneUptime's documented JSON encoding and `Content-Type` header. Added `encoding: json` and `"Content-Type": "application/json"`.

## Review Notes
The post remains a high-level tutorial rather than a complete runnable application. Some placeholders such as `paymentGateway`, `PaymentDeclinedError`, and `PaymentGatewayError` are intentionally application-specific and would need to be supplied by the reader's service code.
