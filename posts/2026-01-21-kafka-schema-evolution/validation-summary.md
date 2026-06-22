# Validation Summary: How to Handle Schema Evolution in Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Confluent Schema Registry
- Avro
- Protobuf
- Java
- Python

## Sources Consulted
- Confluent Schema Registry schema evolution and compatibility documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
- Confluent Schema Registry API reference: https://docs.confluent.io/platform/current/schema-registry/develop/api.html
- Confluent Schema Registry Java client source for `SchemaRegistryClient`: https://github.com/confluentinc/schema-registry/blob/master/client/src/main/java/io/confluent/kafka/schemaregistry/client/SchemaRegistryClient.java
- Confluent Kafka Python client API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Apache Avro specification: https://avro.apache.org/docs/1.11.1/specification/

## Issues Found
- The Python example imported and instantiated `AvroSchema`, but the current `confluent-kafka-python` Schema Registry client documents `Schema` for `register_schema()` and `test_compatibility()`. Updated the import and schema construction to `Schema(schema_str, 'AVRO')`.
- The Avro schema examples used `json` fences while including explanatory comments. Changed those fences to `jsonc` so the snippets are not mislabeled as strict JSON.

## Review Notes
The compatibility mode descriptions and Avro evolution examples align with Confluent Schema Registry and Apache Avro schema resolution behavior. The Java example uses current `ParsedSchema`-based client calls by wrapping strings in `AvroSchema`.
