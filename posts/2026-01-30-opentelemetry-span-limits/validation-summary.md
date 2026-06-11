# Validation Summary: How to Implement OpenTelemetry Span Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK (Node.js, Python, Go, Java)
- OpenTelemetry Collector (YAML config)
- Express.js (Node.js example)
- FastAPI (Python example)
- OTLP/HTTP trace exporter
- Prometheus exporter (Collector)

## Sources Consulted
- OpenTelemetry SDK environment variables spec — https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Tracing SDK spec (span limits) — https://opentelemetry.io/docs/specs/otel/trace/sdk/
- Go OpenTelemetry trace package godoc — https://pkg.go.dev/go.opentelemetry.io/otel/trace
- Go OpenTelemetry sdk/trace SpanLimits godoc — https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace#SpanLimits
- Python opentelemetry-sdk trace docs — https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- Node.js @opentelemetry/sdk-trace-base SpanLimits interface — https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.SpanLimits.html
- Java OpenTelemetry SDK SpanLimits javadoc — https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-trace

## Issues Found
1. **Go `AddEvent` call signature was incorrect (compile error).** The post passed `attribute.KeyValue` values directly as variadic arguments to `span.AddEvent`, e.g.:
   ```go
   span.AddEvent("processing", attribute.String("status", "started"))
   ```
   The Go OpenTelemetry trace API signature is `AddEvent(name string, options ...EventOption)`. `attribute.KeyValue` does not implement `EventOption`, so the original code would fail to compile. Fixed by wrapping with `trace.WithAttributes(...)` and adding the missing `go.opentelemetry.io/otel/trace` import:
   ```go
   span.AddEvent("processing", trace.WithAttributes(attribute.String("status", "started")))
   ```

## Review Notes
- Default limits (128 for attributes/events/links, unlimited for attribute value length) and all `OTEL_SPAN_*_LIMIT` environment variable names match the official spec.
- Node.js `SpanLimits` interface field names (`attributeCountLimit`, `eventCountLimit`, `linkCountLimit`, `attributeValueLengthLimit`, `attributePerEventCountLimit`, `attributePerLinkCountLimit`) all verified against `@opentelemetry/sdk-trace-base`.
- Python `SpanLimits` keyword arguments (`max_attributes`, `max_events`, `max_links`, `max_attribute_length`, `max_event_attributes`, `max_link_attributes`) all valid. Note the SDK also exposes a span-specific `max_span_attribute_length` not used in the post — the general `max_attribute_length` shown here applies broadly and is acceptable.
- Java `SpanLimits.builder()` methods all verified.
- Go `sdktrace.SpanLimits` struct field names all verified.
- The Node.js "Dropped Count Logging" example reads internal/non-public fields (`span.attributes`, `span.events`, `_spanContext`) — this works on `ReadableSpan` instances during processor callbacks but is not part of the stable public API. Acceptable as a debugging illustration; could be flagged in a future revision.
- Java semconv import `io.opentelemetry.semconv.ResourceAttributes` still resolves but is being phased out in favor of `io.opentelemetry.semconv.ServiceAttributes.SERVICE_NAME` in newer semconv releases. Still works at the time of review.
- Node.js semconv import `ATTR_DEPLOYMENT_ENVIRONMENT` matches `deployment.environment` which is being superseded by `deployment.environment.name` (`ATTR_DEPLOYMENT_ENVIRONMENT_NAME`) in newer spec revisions. Both still exported.
- The Collector YAML uses the older `service.telemetry.metrics.address` field, which still works but has been deprecated in newer Collector releases in favor of a `readers` configuration. Acceptable for now.
