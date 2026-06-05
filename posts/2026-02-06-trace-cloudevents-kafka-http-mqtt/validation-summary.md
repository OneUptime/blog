# Validation Summary: How to Trace CloudEvents Flowing Through Kafka, HTTP, and MQTT Brokers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing and W3C Trace Context propagation
- CloudEvents and CloudEvents HTTP, Kafka, and MQTT protocol bindings
- Python CloudEvents SDK
- Confluent Kafka Python client
- Eclipse Paho MQTT Python client
- W3C Trace Context

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry semantic conventions for messaging spans: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry semantic conventions for Kafka: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry semantic conventions for CloudEvents spans: https://opentelemetry.io/docs/specs/semconv/cloudevents/cloudevents-spans/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- CloudEvents HTTP protocol binding: https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/http-protocol-binding.md
- CloudEvents Kafka protocol binding: https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/kafka-protocol-binding.md
- CloudEvents MQTT protocol binding: https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/mqtt-protocol-binding.md
- CloudEvents Python SDK documentation: https://github.com/cloudevents/sdk-python
- Confluent Kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Eclipse Paho MQTT Python client documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html
- Eclipse Paho MQTT Python types and enums documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/types.html

## Issues Found
- The OpenTelemetry `TraceContextTextMapPropagator` import used an outdated/incorrect module path. Changed it to `opentelemetry.trace.propagation.tracecontext`, matching current OpenTelemetry Python documentation.
- The CloudEvents structured conversion import was outdated. Changed `to_structured` to import from `cloudevents.conversion`, matching current CloudEvents Python SDK examples.
- The Kafka producer example used `uuid.uuid4()` without importing `uuid`. Added the missing import.
- Comments in the Kafka producer and MQTT publisher said trace context was being extracted when the code was injecting outbound context. Updated the comments to avoid describing the propagation direction incorrectly.
- Several OpenTelemetry semantic attributes used older names, including `messaging.destination`, `messaging.operation`, `messaging.kafka.partition`, `http.status_code`, and `cloudevents.id` / `cloudevents.type`. Updated them to current semantic convention names such as `messaging.destination.name`, `messaging.operation.name`, `messaging.operation.type`, `messaging.destination.partition.id`, `http.response.status_code`, `cloudevents.event_id`, and `cloudevents.event_type`.
- The Paho MQTT example used `mqtt.Properties` and `mqtt.PacketTypes`, which are not the documented import paths. Changed the example to import `Properties` from `paho.mqtt.properties` and `PacketTypes` from `paho.mqtt.packettypes`.
- The Paho MQTT client example relied on the deprecated default callback API version. Added `callback_api_version=CallbackAPIVersion.VERSION2` and imported `CallbackAPIVersion`.

## Review Notes
The examples are intentionally partial and assume shared globals such as `trace`, `propagator`, and application functions like `forward_to_mqtt` and `process_sensor_reading` exist across snippets. That is acceptable for a blog walkthrough, and the Python snippets parse successfully after the fixes.
