# Validation Summary: How to Use JSON Schema with Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Confluent Schema Registry
- JSON Schema draft-07
- Confluent Java JSON Schema serializer/deserializer
- confluent-kafka Python client
- Schema Registry REST API
- Java
- Python
- curl

## Sources Consulted
- Confluent JSON Schema Serializer and Deserializer documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-json.html
- Confluent Schema Registry API reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Evolution and Compatibility documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- confluent-kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- confluent-kafka-python official JSON producer example: https://github.com/confluentinc/confluent-kafka-python/blob/master/examples/json_producer.py
- confluent-kafka-python JSON Schema serializer source: https://github.com/confluentinc/confluent-kafka-python/blob/master/src/confluent_kafka/schema_registry/_sync/json_schema.py
- JSON Schema draft-07 validation specification: https://json-schema.org/draft-07/draft-handrews-json-schema-validation-01

## Issues Found
- The Java snippet placed two `public` top-level classes in one code block. Changed `User` to package-private so the snippet can compile as a single `JsonSchemaKafkaClient.java` file.
- The Java serializer/deserializer configuration implied payload validation, but Confluent documents `json.fail.invalid.schema` as defaulting to `false`. Added `json.fail.invalid.schema=true` to both producer and consumer properties.
- The Python example used `SerializingProducer`, which Confluent marks as experimental and recommends avoiding for upgrade stability. Updated the example to use `Producer` with `JSONSerializer`, `StringSerializer`, and `SerializationContext`, matching the official example pattern.
- The Python example did not explicitly configure JSON payload validation. Added `conf={'validate': True}` to `JSONSerializer`.
- The best-practices section described JSON Schema `format` as validation. Draft-07 format support is implementation-dependent, so the wording now says `format annotations` and notes validator support.

## Review Notes
- The Schema Registry `curl` example uses the correct subject endpoint, content type, and `schemaType: "JSON"` body format for registering a JSON Schema.
- The examples assume local Kafka on `localhost:9092` and Schema Registry on `localhost:8081`, which matches Confluent documentation defaults.
- `format: "email"` is valid JSON Schema, but enforcement can vary by validator and client implementation.
