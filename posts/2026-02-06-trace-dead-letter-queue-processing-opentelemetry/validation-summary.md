# Validation Summary: How to Trace Dead Letter Queue Processing with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK and API
- OpenTelemetry metrics and tracing
- OpenTelemetry Collector configuration
- OpenTelemetry messaging semantic conventions
- RabbitMQ dead letter queues and management HTTP API
- Python Pika client
- W3C trace context propagation

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/processor/filterprocessor
- OpenTelemetry RabbitMQ semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/rabbitmq/
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- RabbitMQ management HTTP API reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ management plugin documentation: https://www.rabbitmq.com/docs/management

## Issues Found
- The base instrumentation created metric instruments but did not configure an OpenTelemetry SDK `MeterProvider` or metric reader/exporter. Added `MeterProvider`, `PeriodicExportingMetricReader`, and `OTLPMetricExporter` setup so the counters and observable gauge can be exported.
- The primary consumer snippet imported `get_global_textmap_propagator` but did not use it, and `route_to_dlq` depended on `time` without showing the import before the helper was introduced. Removed the unused import and added `import time` with the other consumer imports.
- The RabbitMQ span attributes used older messaging keys such as `messaging.source.name`, `messaging.operation`, and `messaging.rabbitmq.delivery_tag`. Updated them to current semantic convention keys: `messaging.destination.name`, `messaging.operation.name`, `messaging.operation.type`, and `messaging.rabbitmq.message.delivery_tag`.
- Failed DLQ reprocessing called `route_to_dlq` with a DLQ message and would derive the next DLQ name from `method.routing_key`, creating names like `orders.dlq.dlq`. Updated `route_to_dlq` to preserve `x-dlq-original-queue` and publish back to the original queue's DLQ.
- The observable gauge callback did not respect the OpenTelemetry callback timeout. Added a `requests.get(..., timeout=options.timeout_millis / 1000)` argument.
- The collector configuration included an unused `filter/dlq` processor using deprecated legacy filter syntax. Removed the unused processor block so the collector snippet only contains active, current configuration.

## Review Notes
- The examples are illustrative and still assume application-specific functions such as `process_order` and `store_permanent_failure` exist.
- The custom `messaging.dlq.*` attributes and metrics are reasonable for tutorial purposes, but they are not standardized OpenTelemetry semantic convention names.
