# Validation Summary: How to Add Observability to Event-Sourced Systems Using OpenTelemetry

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python API
- Distributed tracing
- OpenTelemetry metrics
- OpenTelemetry messaging semantic conventions
- W3C Trace Context propagation
- Event sourcing
- CQRS projections
- Message brokers / event buses

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry messaging attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The event publisher and consumer examples used `messaging.operation`, which is not the current OpenTelemetry messaging semantic-convention attribute. Changed it to `messaging.operation.name` and added `messaging.operation.type`.
- The messaging examples omitted standard message and destination attributes that are important for conforming to current OpenTelemetry messaging conventions. Added `messaging.destination.name` for the publish span and `messaging.message.id` for publish/process spans.
- The trace-linking section described the parent-child option as "linking back" and referred to the linked context as the "original command trace." Updated the wording and code comments to distinguish parent context from span links and to describe the linked context as the propagated message creation context.

## Review Notes
- All Python code blocks were checked for syntax with `ast.parse`.
- Representative OpenTelemetry Python API calls for spans, links, propagation, metrics counters, histograms, and observable gauges were checked using `opentelemetry-api` installed into a temporary target directory.
- The post uses custom event-sourcing attributes such as `es.event.type` and `es.aggregate.id`. These are application-specific attributes, not standardized OpenTelemetry semantic-convention keys, but they are technically valid custom attributes.
