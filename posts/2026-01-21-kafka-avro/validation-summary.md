# Validation Summary: How to Use Avro with Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Apache Avro
- Confluent Schema Registry
- Confluent Kafka Java serializers/deserializers
- confluent-kafka Python client
- Docker Compose
- Maven
- Schema Registry REST API

## Sources Consulted
- Apache Avro 1.11.3 specification: https://avro.apache.org/docs/1.11.3/specification/
- Confluent Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Confluent Schema Registry API reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Registry API usage examples: https://docs.confluent.io/platform/current/schema-registry/develop/using.html
- Confluent Avro serializer/deserializer documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-avro.html
- confluent-kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html

## Issues Found
- The Docker Compose Kafka listener configuration advertised only `kafka:9092` and did not publish broker port `9092`, while the Java and Python examples connect to `localhost:9092`. Updated the Kafka service to expose `9092`, use separate internal and host listeners, and point Schema Registry at the internal listener.
- The Avro `timestamp-millis` logical type examples placed `logicalType` as a field attribute next to `"type": "long"`. Avro logical types annotate the schema type, so the fields now use `{"type": "long", "logicalType": "timestamp-millis"}`.
- The generated-class Java producer used `Properties` without importing `java.util.*`. Added the missing import so the snippet compiles.
- The wording claimed schema evolution lets users add/remove fields without breaking consumers. Adjusted it to "compatible schema changes" because compatibility depends on schema changes and configured compatibility mode.
- The wording claimed compile-time checking generally. Clarified that compile-time checking applies when using generated classes.
- The best-practice note referred to generating Python classes. Adjusted it to generated Java classes or typed Python data models, which matches the shown Python approach.
- The conclusion implied Schema Registry always maintains backward and forward compatibility. Adjusted it to say Schema Registry enforces the configured compatibility rules.

## Review Notes
- The examples use Confluent Platform 7.5.0 and Kafka clients 3.6.0, which are version-consistent for the tutorial but not the latest releases as of this validation date.
- The Python example uses the current `AvroSerializer` / `AvroDeserializer` path rather than the deprecated legacy `AvroProducer` / `AvroConsumer` APIs.
