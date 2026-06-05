# Validation Summary: How to Mask Credit Card Numbers and Email Addresses in OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- OpenTelemetry Collector
- Transform processor / OTTL
- Attributes processor
- OTLP over gRPC and HTTP
- PCI DSS / PII masking concepts

## Sources Consulted
- OpenTelemetry Python SDK `SpanProcessor` source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Collector Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Transformation Language documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md
- OpenTelemetry Collector Attributes Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- PCI Security Standards Council FAQ on rendering stored PAN unreadable: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/does-cardholder-name-expiration-date-etc-need-to-be-rendered-unreadable-if-stored-in-conjunction-with-the-pan-primary-account-number/

## Issues Found
- The Python `SpanProcessor` example built a `masked_attrs` dictionary in `on_end` but never applied it to the span. The official Python SDK passes a read-only `ReadableSpan` to `on_end`, so the example would not mask exported attributes. I changed the example to perform masking in `_on_ending`, while the span is still mutable, and to call `span.set_attribute`.
- The Python credit-card regex comment claimed support for 13-19 digit numbers, but the original regex only matched 13-16 digits. I updated the regex to match PAN-shaped 13-19 digit strings and clarified that it does not validate card networks or Luhn checksums.
- The provider setup snippet created a `TracerProvider` but did not register it globally. I added `trace.set_tracer_provider(provider)` so the setup is directly usable by application instrumentation.
- The attributes processor section said the `hash` action uses SHA-256. The official attributes processor documentation says it hashes existing attribute values with SHA1, so I corrected the text.

## Review Notes
The Collector transform examples use OTTL `replace_pattern` and valid trace/log processor structure. The snippets are useful examples, but production deployments should still test the exact Collector version they run because transform processor documentation changed significantly at version 0.120.0 and later.
