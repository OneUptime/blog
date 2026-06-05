# Validation Summary: How to Scrub PII from OpenTelemetry Logs, Traces, and Metrics Before Export

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector resource processor
- OpenTelemetry Collector redaction processor
- OpenTelemetry Collector transform processor and OTTL
- OpenTelemetry Collector metricstransform processor
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry Python SDK trace source and API docs: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector resource processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/resourceprocessor
- OpenTelemetry Collector redaction processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector metricstransform processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/

## Issues Found
- The Python `SpanProcessor` example attempted to modify `span.attributes` inside `on_end`. Current OpenTelemetry Python passes a read-only `ReadableSpan` to `on_end`, and `ReadableSpan.attributes` is a mapping proxy. Updated the example to mutate attributes in the SDK pre-end hook with `span.set_attribute(...)`, added a no-op `on_end`, and made `force_flush` return `True`.
- The tracing setup snippet used `PIIScrubber()` without importing it. Added `from pii_span_processor import PIIScrubber`.
- The post described current HTTP and database semantic conventions using only legacy names such as `http.url` and `db.statement`. Updated the text and examples to mention current names such as `url.full`, `url.query`, and `db.query.text`, while retaining legacy names where useful.
- The Transform processor examples used older path forms such as `attributes[...]` and `body`. Updated them to current documented paths such as `span.attributes[...]` and `log.body`, and added `error_mode: ignore`.
- The complete pipeline's redaction allowlist would have removed `url.full` before the transform processor could scrub its query string. Added `url.full` and legacy `http.url` to the allowed keys.
- The post discussed PII in resource attributes but only showed the attributes processor, which does not modify resource attributes. Added a `resource/delete-pii` processor to the complete pipeline and clarified that resource attributes require the resource processor.
- The Collector examples used older semantic attribute names such as `http.method`, `http.status_code`, `db.system`, and `db.operation` in allowlists. Updated allowlists to current names such as `http.request.method`, `http.response.status_code`, `db.system.name`, and `db.operation.name` where appropriate.

## Review Notes
- The redaction processor supports logs and metrics but those signal paths are lower stability than traces in the current Collector component table. This does not make the examples invalid, but production users should check the exact Collector distribution and version they deploy.
- The Python SDK pre-end hook used for mutation is an SDK hook rather than the public `on_end` callback. Collector-level scrubbing remains the more portable option across SDKs.
