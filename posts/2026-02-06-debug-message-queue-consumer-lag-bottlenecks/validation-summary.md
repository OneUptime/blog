# Validation Summary: How to Use OpenTelemetry to Debug Message Queue Consumer Lag

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry messaging semantic conventions
- Kafka and kafka-python producers, consumers, and admin client
- Python message queue instrumentation patterns

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Kafka semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- kafka-python KafkaProducer documentation: https://kafka-python.readthedocs.io/en/2.0.6/apidoc/KafkaProducer.html
- kafka-python KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/2.2.18/apidoc/KafkaConsumer.html
- kafka-python KafkaAdminClient documentation: https://kafka-python.readthedocs.io/en/2.2.18/apidoc/KafkaAdminClient.html

## Issues Found
- The producer and consumer snippets used deprecated or older OpenTelemetry messaging attributes such as `messaging.destination`, `messaging.operation`, `messaging.kafka.partition`, and `messaging.message.payload_size_bytes`. Updated them to current messaging semantic convention attributes such as `messaging.destination.name`, `messaging.operation.name`, `messaging.operation.type`, `messaging.destination.partition.id`, and `messaging.message.body.size`.
- The producer snippet attempted to read `producer.partition`, which is not a `kafka-python` `KafkaProducer` attribute. Updated the code to read the partition from the `RecordMetadata` returned by `producer.send(...).get(timeout=10)`.
- The consumer snippet set the legacy `error` span attribute on exceptions. Updated it to set the span status to `StatusCode.ERROR` and record the exception.
- The consumer lag metric callback used an undefined `consumer` variable for `end_offsets`. Added a dedicated `KafkaConsumer` instance for lag checks and used it to call `end_offsets`.
- The OpenTelemetry metrics callback example referenced `metrics.Observation`. Updated it to import and use `Observation` and `CallbackOptions` from `opentelemetry.metrics`, matching the official Python metrics documentation.
- The lag calculation did not handle Kafka consumer group offsets of `-1`, which kafka-python documents as meaning no recorded offset for that topic partition. Added a guard to skip those offsets.
- The batch processor accepted `flush_interval_ms` but ignored it in favor of a hard-coded `1000`. Stored the constructor value and used it in the flush condition.

## Review Notes
The code examples are illustrative and still assume surrounding setup such as configured OpenTelemetry exporters, initialized meter/tracer providers, a real Kafka cluster, and application-specific objects such as `handler` and `db`. The post is now technically consistent with current OpenTelemetry Python APIs, current messaging semantic conventions, and kafka-python client APIs.
