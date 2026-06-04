# Validation Summary: How to use OpenTelemetry metrics SDK for custom metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python API
- OpenTelemetry Python Metrics SDK
- OpenTelemetry OTLP gRPC metric exporter
- Flask
- psutil

## Sources Consulted
- OpenTelemetry Python metrics API documentation - https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python metrics SDK documentation - https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python metrics view documentation - https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Metrics API specification - https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics SDK specification - https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry metric semantic conventions, general guidelines - https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry HTTP metric semantic conventions - https://opentelemetry.io/docs/specs/semconv/http/http-metrics/

## Issues Found
- The metric views example referenced `metrics.ExplicitBucketHistogramAggregation`, but the Python SDK documents `ExplicitBucketHistogramAggregation` in `opentelemetry.sdk.metrics.view`. Updated the import and aggregation call.
- The HTTP duration examples used the older `http.server.duration` metric name and milliseconds. Updated them to `http.server.request.duration` and seconds (`s`), matching current OpenTelemetry HTTP metric conventions.
- The HTTP response size example used `http.server.response.size` with unit `bytes`. Updated it to `http.server.response.body.size` with unit `By`, matching current HTTP metric conventions and UCUM unit guidance.
- The HTTP attributes used older names such as `http.method` and `http.status_code`. Updated examples to current names such as `http.request.method`, `http.response.status_code`, `url.scheme`, and `error.type`.
- The Flask example used `request.path` for `http.route`, which can create high-cardinality metric series. Updated it to prefer `request.url_rule.rule` and fall back to `request.path` when no route rule is available.

## Review Notes
- The examples use `metrics.get_meter(__name__)`, which is common in simple examples, but the current Python SDK documentation recommends a fixed instrumentation name for consistency across files.
- The business metric examples use currency strings such as `USD` as units. OpenTelemetry recommends UCUM units for instrument units; teams may prefer a custom naming or attribute convention for monetary values depending on backend support.
