# Validation Summary: How to Build a Custom Error Severity Classifier Using OpenTelemetry Span

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- OpenTelemetry tracing
- OpenTelemetry span attributes and exceptions
- OpenTelemetry logs data model
- Prometheus Alertmanager routing

## Sources Consulted
- OpenTelemetry Python tracing instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Span API docs: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/trace/span.html
- OpenTelemetry trace API specification: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/api.md
- OpenTelemetry logs data model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- Prometheus Alertmanager configuration docs: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The examples used `dict(span.attributes)` to read attributes from a live OpenTelemetry span. The OpenTelemetry Span API exposes methods for setting attributes and reading span context, but it does not provide portable access to a live span's attributes. Updated the examples to maintain an `error_context` dictionary, set it on the span with `span.set_attributes(...)`, and pass that dictionary to the classifier.
- The successful payment path explicitly set `StatusCode.OK`. OpenTelemetry documentation says spans are `Unset` by default and `Ok` is reserved for cases that need an explicit success override. Removed the explicit OK status from the normal success path and used `Status(StatusCode.ERROR, str(e))` for error paths, matching the documented Python pattern.
- The log-correlation snippet used `tracer` and `classifier` without defining them in the snippet. Added the missing initialization so the example is internally coherent.
- The log-correlation text said logs can be correlated with spans via trace ID. Updated it to say OpenTelemetry log records can carry TraceId and SpanId, which is the precise data model described by the OpenTelemetry logs specification.
- The Alertmanager example used the deprecated `match` route field. Updated it to the current `matchers` syntax and clarified that the alert label is mapped from the `error.severity` span attribute.

## Review Notes
The custom `error.*` attributes are application-specific attributes, not OpenTelemetry semantic-convention attributes. That is acceptable for a custom classifier, but production systems should document the mapping from span attributes to alert labels in their telemetry pipeline.
