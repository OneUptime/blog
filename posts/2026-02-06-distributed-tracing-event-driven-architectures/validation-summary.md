# Validation Summary: How to Implement Distributed Tracing for Event-Driven Architectures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry distributed tracing
- W3C Trace Context
- Python OpenTelemetry API
- Apache Kafka and confluent-kafka-python
- RabbitMQ, AMQP 0-9-1, and pika
- OpenTelemetry Collector

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Kafka semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry RabbitMQ semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/rabbitmq/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Confluent Kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Pika BasicProperties documentation: https://pika.readthedocs.io/
- AMQP 0-9-1 specification reference: https://www.rabbitmq.com/resources/specs/amqp-xml-doc0-9.pdf
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- Several examples used outdated or non-current messaging semantic convention attribute names. Updated `messaging.destination`, `messaging.source`, `messaging.source.name`, `messaging.message_id`, `messaging.kafka.consumer.group`, and `messaging.kafka.partition` to current OpenTelemetry semantic convention names.
- The Kafka producer and consumer examples omitted current required operation attributes. Added `messaging.operation.name` and `messaging.operation.type` where appropriate.
- The batch consumer example omitted operation attributes for the batch processing span. Added `messaging.operation.name` and `messaging.operation.type`.
- The RabbitMQ example used `messaging.rabbitmq.routing_key`, which is not the current RabbitMQ semantic convention key. Updated it to `messaging.rabbitmq.destination.routing_key` and adjusted the destination name to include the exchange and routing key.
- The RabbitMQ section said the snippet showed both injection and extraction, but it only showed publishing/injection. Updated the wording to match the code.

## Review Notes
The messaging semantic conventions are still marked Development by OpenTelemetry, and official guidance notes compatibility considerations for older instrumentations. The code snippets were checked for Python syntax with `ast.parse`; runtime execution was not attempted because the examples depend on live Kafka/RabbitMQ services and application-specific handler functions.
