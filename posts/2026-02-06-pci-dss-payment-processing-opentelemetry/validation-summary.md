# Validation Summary: How to Instrument PCI DSS-Compliant Payment Processing with OpenTelemetry While

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python tracing SDK
- OpenTelemetry Python logs SDK
- OTLP trace exporter
- PCI DSS payment data handling
- Python data redaction

## Sources Consulted
- OpenTelemetry Python trace SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python trace exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python logs SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/_logs.html
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Logs SDK specification: https://opentelemetry.io/docs/specs/otel/logs/sdk/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- PCI Security Standards Council FAQ on sensitive authentication data: https://www.pcisecuritystandards.org/faqs/1533/
- PCI DSS v4.0 SAQ D documentation for PAN masking language: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Merchant.pdf

## Issues Found
- The trace redaction sample attempted to mutate `span.attributes` and event attributes inside `SpanProcessor.on_end`. In current OpenTelemetry Python, `on_end` receives a `ReadableSpan`, span attributes are exposed through a read-only mapping, and event attributes are immutable. I changed the example to wrap the `SpanExporter`, create redacted copies of `ReadableSpan` and `Event`, and pass those copies to the underlying exporter.
- The tracing setup wrapped `BatchSpanProcessor` in a custom span processor and described redaction as happening before batching. That did not match the corrected implementation. I changed the setup to wrap the `OTLPSpanExporter` with `PCIRedactingExporter` and pass that exporter to `BatchSpanProcessor`.
- The log redaction sample implemented `emit`, but the current OpenTelemetry Python `LogRecordProcessor` method is `on_emit`. I updated the method name, accessed the underlying SDK log record via `log_record.log_record`, and added `shutdown` and `force_flush` delegation.
- The tests assumed a span processor could mutate the original span in `on_end`. I changed them to validate the `redact_span` helper against a redacted span copy.
- The original code defined CVV and expiry regex patterns but never used them. I removed the unused patterns to avoid implying they provided protection.

## Review Notes
- The post is technically valid after the corrections. In a production implementation, redaction should also be backed by collector-side filters, telemetry store audits, and tests against realistic payload formats.
- The PAN regex is intentionally simple for a tutorial and will not catch every possible PAN representation.
