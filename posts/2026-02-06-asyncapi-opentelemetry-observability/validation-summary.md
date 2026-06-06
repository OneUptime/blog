# Validation Summary: How to Build Observability for Event-Driven Architectures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AsyncAPI 2.6.0
- OpenTelemetry Python tracing API
- OpenTelemetry messaging semantic conventions
- Python
- PyYAML
- jsonschema
- Kafka, AMQP/RabbitMQ, and MQTT bindings

## Sources Consulted
- AsyncAPI Specification 2.6.0: https://raw.githubusercontent.com/asyncapi/spec/v2.6.0/spec/asyncapi.md
- AsyncAPI bindings specifications: https://github.com/asyncapi/bindings
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/
- OpenTelemetry messaging spans semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry messaging attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- OpenTelemetry Python tracing API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- jsonschema validation documentation: https://python-jsonschema.readthedocs.io/

## Issues Found
- The OpenTelemetry examples used older messaging attribute names, including `messaging.destination` and `messaging.operation`. Updated them to current semantic convention attributes such as `messaging.destination.name`, `messaging.operation.name`, and `messaging.operation.type`.
- The producer span used `publish` as the messaging operation value. Updated it to the current `send` operation type and name used by OpenTelemetry messaging semantic conventions.
- The consumer wrapper described handler execution with `receive`. Updated it to `process`, which better matches a message handler processing an already-delivered message.
- The validation span used the old `messaging.destination` attribute. Updated it to `messaging.destination.name`.
- The binding helper used non-current or incorrect attribute names such as `messaging.kafka.consumer_group`, `messaging.rabbitmq.routing_key`, and `messaging.mqtt.qos`. Updated Kafka consumer group extraction to `messaging.consumer.group.name`, RabbitMQ routing key extraction to `messaging.rabbitmq.destination.routing_key`, and MQTT QoS to an AsyncAPI-specific attribute because the current OpenTelemetry messaging registry does not define an MQTT QoS semantic convention attribute.
- The binding helper referred only to server bindings while reading channel bindings. Updated the wording and helper to refer to AsyncAPI bindings generally and to account for operation bindings where Kafka consumer group information is commonly represented.

## Review Notes
The examples are illustrative and still omit production concerns such as trace context propagation through broker message headers, real broker client integration, exporter setup, and complete AsyncAPI `$ref` resolution. The Python code snippets were checked for syntax after edits.
