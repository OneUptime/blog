# Validation Summary: How to Trace Saga Pattern Distributed Transactions with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python API and SDK
- OTLP/gRPC trace exporting
- W3C Trace Context propagation
- Messaging semantic conventions for Kafka-style brokers
- Saga pattern orchestration and choreography
- Python
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/
- OpenTelemetry Kafka semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/

## Issues Found
- The choreographed saga failure path passed `broker_client=None` into `publish_saga_event`, which would raise an `AttributeError` when attempting `broker_client.publish(...)`. I changed `handle_saga_event` to accept a `broker_client` parameter and pass that through to `publish_saga_event`.
- The messaging span examples used the older `messaging.operation` attribute. I updated the snippets to use current OpenTelemetry messaging semantic convention attributes: `messaging.operation.name`, `messaging.operation.type`, and `messaging.destination.name` for the producer span.

## Review Notes
The OpenTelemetry Python APIs used for tracer creation, `start_as_current_span`, status setting, exception recording, OTLP/gRPC exporter setup, and text map context propagation are consistent with current documentation. The saga-specific attributes are intentionally custom because OpenTelemetry does not define official saga semantic conventions.
