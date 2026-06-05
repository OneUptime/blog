# Validation Summary: How to Write a Custom Metric View That Controls Aggregation Boundaries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry metrics SDK
- OpenTelemetry metric views
- OpenTelemetry histogram aggregation
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry metrics concepts: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry Python SDK metrics documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python View API source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/metrics/_internal/view.html
- OpenTelemetry Java SDK View configuration documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Prometheus compatibility histogram documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- OpenTelemetry JVM metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/jvm-metrics/
- OpenTelemetry CPython runtime metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/cpython-metrics/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The post described the default histogram bucket list as HTTP latency buckets "in seconds," but the documented SDK default list is millisecond-scale and unitless. I changed the prose to say millisecond-scale latency.
- The HTTP duration example used the older `http.server.duration` name with millisecond boundaries. I updated it to the current semantic-convention metric name `http.server.request.duration` and second-based boundaries.
- The examples used older HTTP attribute names `http.method` and `http.status_code`. I updated them to the current `http.request.method` and `http.response.status_code` names while keeping `http.route`.
- The Python `attribute_keys` examples used lists, while the current Python View API documents `attribute_keys` as `set[str] | None`. I changed these examples to sets, including `set()` for dropping all attributes.
- The Python runtime GC drop example used the non-current `process.runtime.gc.*` pattern. I changed it to `cpython.gc.*`, matching current CPython runtime metric conventions.
- The Java snippet used `List.of` and `Set.of` without importing `java.util.List` and `java.util.Set`. I added the missing imports.
- The Java attribute filter used a predicate form, while the current OpenTelemetry Java SDK documentation demonstrates passing a set of retained keys. I changed it to `setAttributeFilter(Set.of(...))`.
- The Java GC metric drop example used `process.runtime.jvm.gc.*`. I changed it to `jvm.gc.*`, matching current JVM runtime metric conventions.

## Review Notes
The Java snippet still assumes `periodicReader` is defined elsewhere, which is reasonable for a focused view configuration fragment. The business metric names and attributes are custom examples rather than OpenTelemetry semantic conventions.
